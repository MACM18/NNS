import "server-only";
import { createHash } from "node:crypto";
import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { currentSheetPeriod } from "@/lib/google-sheet-auto-sync";
import { getGoogleSheetsClient } from "@/lib/google-sheets-client";
import { getLatestDailyBalanceTargets, parseMaterialBalanceValues, resolveTargetKey, MATERIAL_BALANCE_TAB } from "@/lib/material-balance-service";
import { recordInventoryStockEvent } from "@/lib/inventory-stock-event-service";

type RefreshRow = {
  inventoryItemId: string;
  itemName: string;
  unit: string;
  sourceDate: string;
  currentStock: number;
  currentStockExact: string;
  sheetStock: number;
  delta: number;
};
export type InventorySheetRefreshPreview = {
  previewId: string;
  connectionId: string;
  sheetName: string;
  sheetUrl: string;
  period: string;
  sourceDate: string;
  matchedCount: number;
  changedCount: number;
  unchangedCount: number;
  skipped: Array<{ itemName: string; reason: string }>;
  rows: RefreshRow[];
};

function normalizeUnit(value: string | null | undefined) {
  const unit = (value || "").trim().toLowerCase();
  if (!unit) return "";
  if (["nos", "no", "pcs", "pc", "piece", "pieces", "unit", "units"].includes(unit)) return "pcs";
  if (["m", "meter", "meters", "metre", "metres"].includes(unit)) return "m";
  if (["km", "kilometer", "kilometers", "kilometre", "kilometres"].includes(unit)) return "km";
  if (["kg", "kilogram", "kilograms"].includes(unit)) return "kg";
  return unit;
}

function stockValue(value: number) {
  return Math.round(value * 1_000_000) / 1_000_000;
}

export async function buildInventorySheetRefreshPreview(now = new Date()): Promise<InventorySheetRefreshPreview> {
  const settings = await prisma.googleSheetSyncSettings.findUnique({ where: { id: "default" } });
  const timeZone = settings?.timeZone || "Asia/Colombo";
  const period = currentSheetPeriod(timeZone, now);
  const connection = await prisma.googleSheetConnection.findFirst({
    where: { year: period.year, month: period.month, status: "active", autoSyncEnabled: true },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    select: { id: true, sheetId: true, sheetUrl: true, sheetName: true },
  });
  if (!connection?.sheetId) throw new Error(`No active Google Sheet is connected for ${period.period}.`);

  const sheets = await getGoogleSheetsClient();
  const metadata = await sheets.spreadsheets.get({ spreadsheetId: connection.sheetId, fields: "sheets.properties.title" });
  const tabExists = (metadata.data.sheets || []).some((sheet) => sheet.properties?.title === MATERIAL_BALANCE_TAB);
  if (!tabExists) throw new Error(`The connected sheet does not contain the '${MATERIAL_BALANCE_TAB}' tab.`);
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: connection.sheetId,
    range: `'${MATERIAL_BALANCE_TAB}'!A:ZZ`,
    valueRenderOption: "UNFORMATTED_VALUE",
    dateTimeRenderOption: "SERIAL_NUMBER",
  });
  const values = (response.data.values || []) as unknown[][];
  if (values.length < 3) throw new Error(`The '${MATERIAL_BALANCE_TAB}' tab has no material rows.`);

  const parsed = parseMaterialBalanceValues(values, period.month, period.year);
  const inventoryItems = await prisma.inventoryItem.findMany({
    where: { isActive: true },
    select: { id: true, name: true, unit: true, currentStock: true },
  });
  const mappings = await prisma.materialBalanceItemMapping.findMany({
    select: { normalizedSourceName: true, inventoryItemId: true },
  });
  const byId = new Map(inventoryItems.map((item) => [item.id, item]));
  const mappingsBySource = new Map(mappings.map((mapping) => [mapping.normalizedSourceName, mapping.inventoryItemId]));
  const inventoryByTarget = new Map<string, typeof inventoryItems>();
  for (const item of inventoryItems) {
    const key = resolveTargetKey(item.name);
    inventoryByTarget.set(key, [...(inventoryByTarget.get(key) || []), item]);
  }

  const skipped: InventorySheetRefreshPreview["skipped"] = [];
  const candidates: Array<{ sourceName: string; inventoryItem: (typeof inventoryItems)[number]; target: number; date: string }> = [];
  const capDate = period.localDate;
  const dailyTargets = getLatestDailyBalanceTargets(values, parsed, capDate);

  for (const source of parsed.items) {
    const latest = dailyTargets.get(source.normalizedSourceName);
    if (!latest) {
      skipped.push({ itemName: source.sourceItemName, reason: "No populated daily balance exists on or before today." });
      continue;
    }
    const explicitId = mappingsBySource.get(source.normalizedSourceName)
      || mappingsBySource.get(resolveTargetKey(source.sourceItemName));
    let matches = explicitId ? [byId.get(explicitId)].filter(Boolean) as typeof inventoryItems : (inventoryByTarget.get(resolveTargetKey(source.sourceItemName)) || []);
    if (source.sourceUnit) matches = matches.filter((item) => normalizeUnit(item.unit) === normalizeUnit(source.sourceUnit));
    if (!matches.length) {
      skipped.push({ itemName: source.sourceItemName, reason: explicitId ? "Saved mapping points to an inactive or unit-mismatched item." : "No matching inventory item and unit were found." });
      continue;
    }
    if (matches.length > 1) {
      skipped.push({ itemName: source.sourceItemName, reason: "More than one inventory item matches; add an explicit material mapping." });
      continue;
    }
    const inventoryItem = matches[0];
    candidates.push({ sourceName: source.sourceItemName, inventoryItem, target: stockValue(latest.value), date: latest.date });
  }

  const candidateCounts = new Map<string, number>();
  for (const candidate of candidates) candidateCounts.set(candidate.inventoryItem.id, (candidateCounts.get(candidate.inventoryItem.id) || 0) + 1);
  const duplicateCandidates = candidates.filter((candidate) => (candidateCounts.get(candidate.inventoryItem.id) || 0) > 1);
  for (const candidate of duplicateCandidates) skipped.push({ itemName: candidate.sourceName, reason: "Another sheet row maps to this same inventory item; all conflicting rows were skipped." });
  const safeCandidates = candidates.filter((candidate) => (candidateCounts.get(candidate.inventoryItem.id) || 0) === 1);

  if (!safeCandidates.length) throw new Error("No daily sheet balances could be safely matched to inventory items.");
  const sourceDate = safeCandidates.map((candidate) => candidate.date).sort().at(-1)!;
  const rows = safeCandidates.map(({ inventoryItem, target, date }) => {
    const currentStock = Number(inventoryItem.currentStock);
    return {
      inventoryItemId: inventoryItem.id,
      itemName: inventoryItem.name,
      unit: inventoryItem.unit,
      sourceDate: date,
      currentStock: stockValue(currentStock),
      currentStockExact: String(inventoryItem.currentStock),
      sheetStock: target,
      delta: stockValue(target - currentStock),
    };
  });
  const checksum = createHash("sha256").update(JSON.stringify({ connectionId: connection.id, checksum: parsed.checksum, rows, sourceDate })).digest("hex");
  return {
    previewId: checksum,
    connectionId: connection.id,
    sheetName: connection.sheetName || `${period.period} Google Sheet`,
    sheetUrl: connection.sheetUrl,
    period: period.period,
    sourceDate,
    matchedCount: rows.length,
    changedCount: rows.filter((row) => Math.abs(row.delta) > 0.01).length,
    unchangedCount: rows.filter((row) => Math.abs(row.delta) <= 0.01).length,
    skipped,
    rows,
  };
}

export async function applyInventorySheetRefresh(input: { previewId: string; userId: string }) {
  const fresh = await buildInventorySheetRefreshPreview();
  if (fresh.previewId !== input.previewId) {
    const error = new Error("The sheet or inventory changed after the preview. Review a fresh preview before updating.");
    Object.assign(error, { status: 409 });
    throw error;
  }
  const profile = await prisma.profile.findUnique({ where: { userId: input.userId }, select: { id: true } });
  return prisma.$transaction(async (tx) => {
    let updatedCount = 0;
    for (const row of fresh.rows) {
      if (Math.abs(row.delta) <= 0.01) continue;
      const updated = await tx.inventoryItem.updateMany({
        where: { id: row.inventoryItemId, isActive: true, currentStock: new Prisma.Decimal(row.currentStockExact) },
        data: { currentStock: row.sheetStock },
      });
      if (updated.count !== 1) {
        const error = new Error("Inventory changed while the update was being applied. Refresh the preview and try again.");
        Object.assign(error, { status: 409 });
        throw error;
      }
      await recordInventoryStockEvent(tx, {
        inventoryItemId: row.inventoryItemId,
        previousStock: row.currentStock,
        newStock: row.sheetStock,
        sourceType: "google_material_balance_daily_refresh",
        sourceReferenceId: `${fresh.connectionId}:${row.sourceDate}`,
        createdById: profile?.id || null,
        reason: `Refreshed from ${fresh.sheetName}, Material Balance daily balance for ${row.sourceDate}.`,
      });
      updatedCount += 1;
    }
    return { updatedCount, sourceDate: fresh.sourceDate, period: fresh.period };
  }, { timeout: 30000 });
}
