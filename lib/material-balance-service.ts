import { createHash } from "node:crypto";
import type { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";

export const MATERIAL_BALANCE_TAB = "Material Balance";
export const MATERIAL_BALANCE_MONTH_TAB = "Material Balance - Month";

type SheetValue = unknown;
type SheetValues = SheetValue[][];
type DbClient = typeof prisma | Prisma.TransactionClient;

export interface MaterialBalanceDailyValue {
  date: string;
  previousBalance: number;
  issued: number;
  usage: number;
  balanceReturn: number;
  closingBalance: number;
  sourceColumn: number;
  sourceBlockIndex: number;
}

export interface ParsedMaterialBalanceItem {
  sourceItemName: string;
  normalizedSourceName: string;
  sourceUnit: string | null;
  sourceRow: number;
  openingBalance: number;
  totalIssued: number;
  totalUsage: number;
  totalReturned: number;
  finalBalance: number;
  dailyEntries: MaterialBalanceDailyValue[];
  warnings: string[];
}

export interface MaterialBalanceDiscrepancy {
  itemName: string;
  field: "issued" | "usage" | "return" | "month_issued" | "month_usage" | "month_ending_wip";
  dailyTotal: number;
  sheetTotal: number;
  difference: number;
}

export interface ParsedMaterialBalance {
  checksum: string;
  sourceRowCount: number;
  dayCount: number;
  items: ParsedMaterialBalanceItem[];
  warnings: string[];
  discrepancies: MaterialBalanceDiscrepancy[];
}

export interface ParsedMaterialBalanceMonthItem {
  sourceItemName: string;
  normalizedSourceName: string;
  sourceRow: number;
  openingBalance: number;
  stockIssued: number;
  inHand: number;
  materialUsed: number;
  endingWip: number;
  warnings: string[];
}

export interface ParsedMaterialBalanceMonth {
  checksum: string;
  sourceRowCount: number;
  itemCount: number;
  itemColumn: number;
  endingWipColumn: number;
  items: ParsedMaterialBalanceMonthItem[];
  warnings: string[];
}

export interface MaterialBalanceImportResult {
  imported: boolean;
  skipped: boolean;
  importId: string | null;
  importedAt: string | null;
  status: string;
  sourceTab: string;
  sourceDayCount: number;
  itemCount: number;
  mappedItemCount: number;
  unmappedItemCount: number;
  updatedStockCount: number;
  dailyEntryCount: number;
  dailyIssueInvoiceCount: number;
  correctionInvoiceCount: number;
  reconciliationCount: number;
  monthlySourceTab: string;
  monthlyChecksum: string | null;
  monthlyItemCount: number;
  stockChanges: MaterialBalanceStockChange[];
  dashboardChangesDetected: boolean;
  warnings: string[];
  discrepancies: MaterialBalanceDiscrepancy[];
}

export interface MaterialBalanceStockChange {
  sourceItemName: string;
  inventoryItemId: string | null;
  inventoryItemName: string | null;
  issueDate: string | null;
  issuedQuantity: number;
  previousStock: number;
  newStock: number;
  sheetEndingWip: number | null;
  adjustmentDelta: number;
  invoiceId: string | null;
  invoiceNumber: string | null;
  referenceId: string | null;
  status: "created" | "unchanged" | "corrected" | "reconciled" | "unmapped" | "warning" | string;
  warning?: string | null;
}

function text(value: SheetValue): string {
  return value === null || value === undefined ? "" : String(value).trim();
}

function normalizeKey(value: string): string {
  return value
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/rosset/g, "rosette")
    .replace(/[^a-z0-9]+/g, "");
}

export function normalizeMaterialSourceName(value: string): string {
  const trimmed = value.trim();

  if (trimmed.endsWith(")")) {
    let depth = 0;

    for (let index = trimmed.length - 1; index >= 0; index -= 1) {
      const character = trimmed[index];

      if (character === ")") {
        depth += 1;
      } else if (character === "(") {
        depth -= 1;

        if (depth === 0) {
          return normalizeKey(trimmed.slice(0, index).trimEnd());
        }
      }
    }
  }

  return normalizeKey(trimmed);
}

function parseNumber(value: SheetValue): number {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  const raw = text(value);
  if (!raw) return 0;
  const negative = raw.startsWith("(") && raw.endsWith(")");
  const normalized = raw.replace(/[(),\s]/g, "").replace(/,/g, "");
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) return 0;
  return negative ? -Math.abs(parsed) : parsed;
}

function parseDate(value: SheetValue, month: number, year: number): string | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }

  const raw = text(value);
  if (!raw) return null;

  const numeric = Number(raw);
  if (Number.isFinite(numeric) && numeric > 30000) {
    const epoch = Date.UTC(1899, 11, 30);
    const date = new Date(epoch + numeric * 24 * 60 * 60 * 1000);
    return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
  }

  if (/^\d{1,2}$/.test(raw)) {
    const day = Number(raw);
    if (day >= 1 && day <= 31) {
      return new Date(Date.UTC(year, month - 1, day)).toISOString().slice(0, 10);
    }
  }

  const shortDate = raw.match(/^(\d{1,2})[\/-](\d{1,2})$/);
  if (shortDate) {
    const first = Number(shortDate[1]);
    const second = Number(shortDate[2]);
    const day = first === month ? second : second === month ? first : first;
    if (day >= 1 && day <= 31) {
      return new Date(Date.UTC(year, month - 1, day)).toISOString().slice(0, 10);
    }
  }

  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString().slice(0, 10);
}

function isInPeriod(date: string, month: number, year: number): boolean {
  const parsed = new Date(`${date}T00:00:00.000Z`);
  return parsed.getUTCFullYear() === year && parsed.getUTCMonth() === month - 1;
}

function headerKey(value: SheetValue): string {
  return text(value).toLowerCase().replace(/\s+/g, " ").trim();
}

function hasHeader(value: SheetValue, pattern: RegExp): boolean {
  return pattern.test(headerKey(value));
}

function valuesEqual(left: number, right: number): boolean {
  return Math.abs(left - right) > 0.01;
}

function findTotalColumn(headerRow: SheetValue[]): number {
  return headerRow.findIndex((value) => headerKey(value) === "total");
}

function buildDayBlocks(
  headerRow: SheetValue[],
  labelRow: SheetValue[],
  totalColumn: number,
  month: number,
  year: number,
  warnings: string[]
) {
  const blocks: Array<{ date: string; startColumn: number; index: number }> = [];
  const limit = totalColumn > 0 ? totalColumn : headerRow.length;

  for (let column = 2; column < limit; column += 1) {
    const header = headerKey(headerRow[column]);
    const isDateLabel = header === "date" || header === "date:";
    const date = parseDate(
      isDateLabel ? headerRow[column + 1] : headerRow[column],
      month,
      year
    );
    if (!date) continue;

    if (!isInPeriod(date, month, year)) {
      warnings.push(`Ignoring Material Balance date ${date} outside ${year}-${String(month).padStart(2, "0")}`);
      column += 3;
      continue;
    }

    const labels = labelRow.slice(column, column + 4);
    const looksLikeBlock =
      hasHeader(labels[0], /previous|opening/) &&
      hasHeader(labels[1], /issued/) &&
      hasHeader(labels[2], /usage|used/) &&
      hasHeader(labels[3], /return|balance/);

    if (!looksLikeBlock) {
      warnings.push(`Date ${date} at column ${column + 1} has unexpected daily headers`);
    }

    blocks.push({ date, startColumn: column, index: blocks.length });
    column += 3;
  }

  return blocks;
}

function findHeaderColumn(row: SheetValue[], expected: string): number {
  return row.findIndex((value) => headerKey(value) === expected);
}

export function parseMaterialBalanceMonthValues(
  values: SheetValues,
  month: number,
  year: number
): ParsedMaterialBalanceMonth {
  const warnings: string[] = [];
  let headerRowIndex = -1;
  let itemColumn = -1;
  let endingWipColumn = -1;

  for (let rowIndex = 0; rowIndex < values.length; rowIndex += 1) {
    const row = values[rowIndex] || [];
    const itemIndex = findHeaderColumn(row, "item");
    const endingIndex = findHeaderColumn(row, "ending wip material");
    if (itemIndex >= 0 && endingIndex >= 0) {
      headerRowIndex = rowIndex;
      itemColumn = itemIndex;
      endingWipColumn = endingIndex;
      break;
    }
  }

  if (headerRowIndex < 0) {
    return {
      checksum: createHash("sha256").update(JSON.stringify(values)).digest("hex"),
      sourceRowCount: values.length,
      itemCount: 0,
      itemColumn: -1,
      endingWipColumn: -1,
      items: [],
      warnings: [`${MATERIAL_BALANCE_MONTH_TAB} is missing Item or Ending WIP Material columns for ${month}/${year}`],
    };
  }

  const row = values[headerRowIndex] || [];
  const openingColumn = findHeaderColumn(row, "opening balance");
  const issuedColumn = findHeaderColumn(row, "stock issued");
  const inHandColumn = findHeaderColumn(row, "in hand end of the month");
  const usedColumn = findHeaderColumn(row, "material used for invoice");
  const items: ParsedMaterialBalanceMonthItem[] = [];

  for (let rowIndex = headerRowIndex + 1; rowIndex < values.length; rowIndex += 1) {
    const sourceRow = values[rowIndex] || [];
    const sourceItemName = text(sourceRow[itemColumn]);
    if (!sourceItemName) continue;

    const itemWarnings: string[] = [];
    const endingWip = parseNumber(sourceRow[endingWipColumn]);
    if (endingWip < 0) itemWarnings.push("Negative month-end Ending WIP Material");

    const item = {
      sourceItemName,
      normalizedSourceName: normalizeMaterialSourceName(sourceItemName),
      sourceRow: rowIndex + 1,
      openingBalance: openingColumn >= 0 ? parseNumber(sourceRow[openingColumn]) : 0,
      stockIssued: issuedColumn >= 0 ? parseNumber(sourceRow[issuedColumn]) : 0,
      inHand: inHandColumn >= 0 ? parseNumber(sourceRow[inHandColumn]) : endingWip,
      materialUsed: usedColumn >= 0 ? parseNumber(sourceRow[usedColumn]) : 0,
      endingWip,
      warnings: itemWarnings,
    };

    if (Math.abs(item.inHand - item.endingWip) > 0.01) {
      itemWarnings.push("In-hand month-end value differs from Ending WIP Material");
    }
    items.push(item);
  }

  if (items.length === 0) warnings.push(`${MATERIAL_BALANCE_MONTH_TAB} contains no item rows`);

  return {
    checksum: createHash("sha256").update(JSON.stringify(values)).digest("hex"),
    sourceRowCount: values.length,
    itemCount: items.length,
    itemColumn,
    endingWipColumn,
    items,
    warnings: Array.from(new Set(warnings)),
  };
}

export function parseMaterialBalanceValues(
  values: SheetValues,
  month: number,
  year: number
): ParsedMaterialBalance {
  const warnings: string[] = [];
  const headerRow = values[0] || [];
  const labelRow = values[1] || [];
  const totalColumn = findTotalColumn(headerRow);
  const dayBlocks = buildDayBlocks(
    headerRow,
    labelRow,
    totalColumn,
    month,
    year,
    warnings
  );

  if (dayBlocks.length === 0) {
    warnings.push("No valid daily Material Balance blocks were found");
  }

  const items: ParsedMaterialBalanceItem[] = [];
  const seenNames = new Set<string>();

  for (let rowIndex = 2; rowIndex < values.length; rowIndex += 1) {
    const row = values[rowIndex] || [];
    const sourceItemName = text(row[0]);
    if (!sourceItemName) continue;

    const normalizedSourceName = normalizeMaterialSourceName(sourceItemName);
    const itemWarnings: string[] = [];
    if (seenNames.has(normalizedSourceName)) {
      itemWarnings.push("Duplicate source item name in Material Balance tab");
    }
    seenNames.add(normalizedSourceName);

    const dailyEntries = dayBlocks.map((block) => {
      const previousBalance = parseNumber(row[block.startColumn]);
      const issued = parseNumber(row[block.startColumn + 1]);
      const usage = parseNumber(row[block.startColumn + 2]);
      const balanceReturn = parseNumber(row[block.startColumn + 3]);
      const closingBalance = previousBalance + issued - usage - balanceReturn;
      const valuesForWarning = [previousBalance, issued, usage, balanceReturn, closingBalance];
      if (valuesForWarning.some((value) => value < 0)) {
        itemWarnings.push(`Negative daily balance value on ${block.date}`);
      }

      return {
        date: block.date,
        previousBalance,
        issued,
        usage,
        balanceReturn,
        closingBalance,
        sourceColumn: block.startColumn,
        sourceBlockIndex: block.index,
      };
    });

    const totalIssued =
      totalColumn >= 0 ? parseNumber(row[totalColumn]) : dailyEntries.reduce((sum, entry) => sum + entry.issued, 0);
    const totalUsage =
      totalColumn >= 0 ? parseNumber(row[totalColumn + 1]) : dailyEntries.reduce((sum, entry) => sum + entry.usage, 0);
    const totalReturned =
      totalColumn >= 0 ? parseNumber(row[totalColumn + 2]) : dailyEntries.reduce((sum, entry) => sum + entry.balanceReturn, 0);
    const finalBalance =
      totalColumn >= 0 && row[totalColumn + 3] !== undefined
        ? parseNumber(row[totalColumn + 3])
        : dailyEntries[dailyEntries.length - 1]?.closingBalance || 0;
    const openingBalance =
      row[2] !== undefined
        ? parseNumber(row[2])
        : dailyEntries[0]?.previousBalance || 0;

    if ([openingBalance, finalBalance].some((value) => value < 0)) {
      itemWarnings.push("Negative opening or final balance");
    }

    const dailyIssued = dailyEntries.reduce((sum, entry) => sum + entry.issued, 0);
    const dailyUsage = dailyEntries.reduce((sum, entry) => sum + entry.usage, 0);
    const dailyReturned = dailyEntries.reduce((sum, entry) => sum + entry.balanceReturn, 0);

    items.push({
      sourceItemName,
      normalizedSourceName,
      sourceUnit: text(row[1]) || null,
      sourceRow: rowIndex + 1,
      openingBalance,
      totalIssued,
      totalUsage,
      totalReturned,
      finalBalance,
      dailyEntries,
      warnings: Array.from(new Set(itemWarnings)),
    });
  }

  const discrepancies: MaterialBalanceDiscrepancy[] = [];
  if (totalColumn >= 0) {
    for (const item of items) {
      const dailyTotals = {
        issued: item.dailyEntries.reduce((sum, entry) => sum + entry.issued, 0),
        usage: item.dailyEntries.reduce((sum, entry) => sum + entry.usage, 0),
        return: item.dailyEntries.reduce((sum, entry) => sum + entry.balanceReturn, 0),
      };
      const sheetTotals = {
        issued: item.totalIssued,
        usage: item.totalUsage,
        return: item.totalReturned,
      };
      for (const field of ["issued", "usage", "return"] as const) {
        const difference = dailyTotals[field] - sheetTotals[field];
        if (valuesEqual(difference, 0)) {
          discrepancies.push({
            itemName: item.sourceItemName,
            field,
            dailyTotal: dailyTotals[field],
            sheetTotal: sheetTotals[field],
            difference,
          });
        }
      }
    }
  }

  return {
    checksum: createHash("sha256").update(JSON.stringify(values)).digest("hex"),
    sourceRowCount: values.length,
    dayCount: dayBlocks.length,
    items,
    warnings: Array.from(new Set(warnings)),
    discrepancies,
  };
}

const DEFAULT_ALIASES: Record<string, string> = {
  chook: "chook",
  lhook: "lhook",
  nutandbolt: "nutandbolt",
  nutbolt: "nutbolt",
  protector: "protector",
  dropwirem: "dropwirecable",
  internalwirem: "internalwire",
  fiberdropwirem: "fiberdropwire",
  fiberrosettebox: "fiberrosette",
  facconnector: "facconnector",
  uclip: "uclip",
  concretenail1: "concretenail",
};

function resolveTargetKey(sourceName: string): string {
  const key = normalizeMaterialSourceName(sourceName);
  return DEFAULT_ALIASES[key] || key;
}

async function resolveInventoryMappings(tx: DbClient) {
  const [inventoryItems, configuredMappings] = await Promise.all([
    tx.inventoryItem.findMany({ select: { id: true, name: true, currentStock: true } }),
    tx.materialBalanceItemMapping.findMany({ select: { normalizedSourceName: true, inventoryItemId: true } }),
  ]);

  const byName = new Map(inventoryItems.map((item) => [normalizeMaterialSourceName(item.name), item]));
  const configured = new Map(configuredMappings.map((mapping) => [mapping.normalizedSourceName, mapping.inventoryItemId]));

  return { inventoryItems, byName, configured };
}

function formatStockValue(value: number): string {
  return Number.isFinite(value) ? value.toFixed(6).replace(/0+$/, "").replace(/\.$/, "") : "0";
}

function generatedInvoiceNumber(sourceKey: string, date: string): string {
  const suffix = createHash("sha1").update(sourceKey).digest("hex").slice(0, 10).toUpperCase();
  return `MB-${date.replace(/-/g, "")}-${suffix}`;
}

async function lockMaterialBalanceConnection(
  tx: Prisma.TransactionClient,
  connectionId: string,
) {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`nns-material-balance:${connectionId}`}))`;
}

function combinedChecksum(dailyChecksum: string, monthlyChecksum: string | null): string {
  return createHash("sha256")
    .update(JSON.stringify({ dailyChecksum, monthlyChecksum }))
    .digest("hex");
}

function resultFromImport(
  existing: any,
  skipped: boolean,
  overrides: Partial<MaterialBalanceImportResult> = {}
): MaterialBalanceImportResult {
  return {
    imported: !skipped,
    skipped,
    importId: existing.id,
    importedAt: existing.importedAt.toISOString(),
    status: existing.status,
    sourceTab: MATERIAL_BALANCE_TAB,
    sourceDayCount: existing.sourceDayCount,
    itemCount: existing.itemCount,
    mappedItemCount: existing.mappedItemCount,
    unmappedItemCount: existing.unmappedItemCount,
    updatedStockCount: existing.updatedStockCount,
    dailyEntryCount: 0,
    dailyIssueInvoiceCount: existing.dailyIssueInvoiceCount || 0,
    correctionInvoiceCount: existing.correctionInvoiceCount || 0,
    reconciliationCount: existing.reconciliationCount || 0,
    monthlySourceTab: existing.monthlySourceTab || MATERIAL_BALANCE_MONTH_TAB,
    monthlyChecksum: existing.monthlyChecksum || null,
    monthlyItemCount: existing.monthlyItemCount || 0,
    stockChanges: Array.isArray(existing.stockChanges) ? existing.stockChanges : [],
    dashboardChangesDetected: false,
    warnings: Array.isArray(existing.warnings) ? existing.warnings : [],
    discrepancies: Array.isArray(existing.discrepancies) ? existing.discrepancies : [],
    ...overrides,
  };
}

type PreparedMaterialItem = ParsedMaterialBalanceItem & {
  monthlyItem: ParsedMaterialBalanceMonthItem | null;
  inventoryItemId: string | null;
  inventoryItemName: string | null;
  status: string;
  warning: string | null;
  finalBalance: number;
};

async function createGeneratedInvoice(
  tx: Prisma.TransactionClient,
  input: {
    sourceKey: string;
    sourceType: "google_material_balance_issue" | "google_material_balance_adjustment" | "google_material_balance_reconciliation";
    sourceDate: string;
    importId: string;
    createdById?: string | null;
    correctionOfId?: string | null;
    lines: Array<{
      item: PreparedMaterialItem;
      quantity: number;
      status: "created" | "corrected" | "reconciled";
      reason: string;
    }>;
  }
): Promise<{ invoice: { id: string; invoiceNumber: string }; changes: MaterialBalanceStockChange[] } | null> {
  if (input.lines.length === 0) return null;

  const existing = await tx.inventoryInvoice.findUnique({
    where: { sourceKey: input.sourceKey },
    select: { id: true, invoiceNumber: true },
  });
  if (existing) {
    return { invoice: existing, changes: [] };
  }

  const invoice = await tx.inventoryInvoice.create({
    data: {
      invoiceNumber: generatedInvoiceNumber(input.sourceKey, input.sourceDate),
      warehouse: "Material Balance",
      date: new Date(`${input.sourceDate}T00:00:00.000Z`),
      issuedBy: "Google Sheets",
      drawnBy: input.sourceType === "google_material_balance_issue"
        ? "Free-issued material"
        : "Material Balance correction",
      createdById: input.createdById || null,
      totalItems: input.lines.length,
      status: "completed",
      paymentStatus: "not_applicable",
      totalCost: 0,
      paidAmount: 0,
      sourceType: input.sourceType,
      sourceKey: input.sourceKey,
      materialBalanceImportId: input.importId,
      sourceDate: new Date(`${input.sourceDate}T00:00:00.000Z`),
      isSystemGenerated: true,
      correctionOfId: input.correctionOfId || null,
    },
    select: { id: true, invoiceNumber: true },
  });

  const changes: MaterialBalanceStockChange[] = [];
  for (const line of input.lines) {
    const inventoryItem = await tx.inventoryItem.findUnique({
      where: { id: line.item.inventoryItemId! },
      select: { id: true, name: true, unit: true, currentStock: true },
    });
    if (!inventoryItem) continue;

    const quantity = Number(line.quantity);
    const previousStock = Number(inventoryItem.currentStock || 0);
    const newStock = previousStock + quantity;

    await tx.inventoryInvoiceItem.create({
      data: {
        invoiceId: invoice.id,
        itemId: inventoryItem.id,
        description: `${line.item.sourceItemName} - ${line.reason}`,
        unit: line.item.sourceUnit || inventoryItem.unit,
        quantityRequested: quantity,
        quantityIssued: quantity,
      },
    });

    await tx.inventoryItem.update({
      where: { id: inventoryItem.id },
      data: { currentStock: newStock },
    });

    const event = await tx.inventoryStockEvent.create({
      data: {
        inventoryItemId: inventoryItem.id,
        sourceType: input.sourceType,
        sourceReferenceId: invoice.id,
        materialBalanceImportId: input.importId,
        previousStock,
        newStock,
        quantityDelta: quantity,
        reason: line.reason,
        createdById: input.createdById || null,
      },
      select: { id: true },
    });

    changes.push({
      sourceItemName: line.item.sourceItemName,
      inventoryItemId: inventoryItem.id,
      inventoryItemName: inventoryItem.name,
      issueDate: input.sourceDate,
      issuedQuantity: line.item.dailyEntries.find((entry) => entry.date === input.sourceDate)?.issued || 0,
      previousStock,
      newStock,
      sheetEndingWip: line.item.monthlyItem?.endingWip ?? line.item.finalBalance,
      adjustmentDelta: quantity,
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      referenceId: event.id,
      status: line.status,
      warning: line.item.warning,
    });
  }

  return { invoice, changes };
}

async function reconcileExistingImport(input: {
  connectionId: string;
  month: number;
  year: number;
  importId: string;
  createdById?: string | null;
}): Promise<MaterialBalanceImportResult> {
  return prisma.$transaction(async (tx) => {
    await lockMaterialBalanceConnection(tx, input.connectionId);
    const existing = await tx.materialBalanceImport.findUnique({
      where: { id: input.importId },
      include: {
        items: {
          include: {
            inventoryItem: { select: { id: true, name: true, currentStock: true, unit: true } },
          },
        },
      },
    });
    if (!existing) throw new Error("Material Balance import no longer exists");

    const changes: MaterialBalanceStockChange[] = [];
    let dashboardChangesDetected = false;
    let reconciliationCount = 0;
    const monthEnd = new Date(Date.UTC(input.year, input.month, 0));

    for (const snapshot of existing.items) {
      if (!snapshot.inventoryItemId || !snapshot.inventoryItem) continue;
      const currentStock = Number(snapshot.inventoryItem.currentStock || 0);
      const expectedStock = Number(snapshot.monthEndingWip ?? snapshot.finalBalance ?? 0);
      const dashboardChange = await tx.inventoryStockEvent.findFirst({
        where: {
          inventoryItemId: snapshot.inventoryItemId,
          createdAt: { gt: existing.importedAt },
          sourceType: {
            notIn: [
              "google_material_balance_issue",
              "google_material_balance_adjustment",
              "google_material_balance_reconciliation",
              "google_material_balance",
            ],
          },
        },
        select: { id: true },
      });
      if (dashboardChange) dashboardChangesDetected = true;
      if (Math.abs(currentStock - expectedStock) <= 0.01) continue;

      const sourceKey = [
        "gmb-reconcile",
        input.connectionId,
        existing.id,
        snapshot.inventoryItemId,
        dashboardChange?.id || "stock-mismatch",
        formatStockValue(currentStock),
        formatStockValue(expectedStock),
      ].join(":");
      const generated = await createGeneratedInvoice(tx, {
        sourceKey,
        sourceType: "google_material_balance_reconciliation",
        sourceDate: monthEnd.toISOString().slice(0, 10),
        importId: existing.id,
        createdById: input.createdById,
        lines: [{
          item: {
            sourceItemName: snapshot.sourceItemName,
            normalizedSourceName: snapshot.normalizedSourceName,
            sourceUnit: snapshot.sourceUnit,
            sourceRow: snapshot.sourceRow,
            openingBalance: Number(snapshot.openingBalance),
            totalIssued: Number(snapshot.totalIssued),
            totalUsage: Number(snapshot.totalUsage),
            totalReturned: Number(snapshot.totalReturned),
            finalBalance: expectedStock,
            dailyEntries: [],
            warnings: snapshot.warning ? [snapshot.warning] : [],
            monthlyItem: null,
            inventoryItemId: snapshot.inventoryItemId,
            inventoryItemName: snapshot.inventoryItem.name,
            status: "reconciled",
            warning: dashboardChange ? "Dashboard stock changed after the previous Material Balance sync" : snapshot.warning,
          },
          quantity: expectedStock - currentStock,
          status: "reconciled",
          reason: `Reconciled to ${MATERIAL_BALANCE_MONTH_TAB} Ending WIP Material`,
        }],
      });
      if (generated) {
        changes.push(...generated.changes);
        reconciliationCount += 1;
      }
    }

    return resultFromImport(existing, true, {
      reconciliationCount,
      updatedStockCount: changes.length,
      stockChanges: changes,
      dashboardChangesDetected,
    });
  });
}

export async function importMaterialBalanceValues(input: {
  connectionId: string;
  month: number;
  year: number;
  values: SheetValues;
  monthlyValues?: SheetValues;
  createdById?: string | null;
}): Promise<MaterialBalanceImportResult> {
  const parsed = parseMaterialBalanceValues(input.values, input.month, input.year);
  const monthlyParsed = input.monthlyValues
    ? parseMaterialBalanceMonthValues(input.monthlyValues, input.month, input.year)
    : null;
  const monthlyChecksum = monthlyParsed?.checksum || null;
  const checksum = combinedChecksum(parsed.checksum, monthlyChecksum);

  const existing = await prisma.materialBalanceImport.findUnique({
    where: {
      connectionId_sourceChecksum: {
        connectionId: input.connectionId,
        sourceChecksum: checksum,
      },
    },
    select: { id: true },
  });
  if (existing) {
    return reconcileExistingImport({
      connectionId: input.connectionId,
      month: input.month,
      year: input.year,
      importId: existing.id,
      createdById: input.createdById,
    });
  }

  return prisma.$transaction(async (tx) => {
    await lockMaterialBalanceConnection(tx, input.connectionId);
    const alreadyCreated = await tx.materialBalanceImport.findUnique({
      where: {
        connectionId_sourceChecksum: {
          connectionId: input.connectionId,
          sourceChecksum: checksum,
        },
      },
      select: {
        id: true,
        importedAt: true,
        status: true,
        sourceDayCount: true,
        itemCount: true,
        mappedItemCount: true,
        unmappedItemCount: true,
        updatedStockCount: true,
        dailyIssueInvoiceCount: true,
        correctionInvoiceCount: true,
        reconciliationCount: true,
        monthlySourceTab: true,
        monthlyChecksum: true,
        monthlyItemCount: true,
        stockChanges: true,
        warnings: true,
        discrepancies: true,
      },
    });
    if (alreadyCreated) return resultFromImport(alreadyCreated, true);
    const mappings = await resolveInventoryMappings(tx);
    const monthlyByName = new Map((monthlyParsed?.items || []).map((item) => [item.normalizedSourceName, item]));
    const dailyByName = new Map(parsed.items.map((item) => [item.normalizedSourceName, item]));
    const names = new Set([...dailyByName.keys(), ...monthlyByName.keys()]);
    const mappedInventoryIds = new Set<string>();
    const prepared: PreparedMaterialItem[] = [];

    for (const normalizedSourceName of names) {
      const dailyItem = dailyByName.get(normalizedSourceName);
      const monthlyItem = monthlyByName.get(normalizedSourceName) || null;
      const sourceItemName = dailyItem?.sourceItemName || monthlyItem?.sourceItemName || normalizedSourceName;
      const configuredId = mappings.configured.get(normalizedSourceName);
      const targetKey = resolveTargetKey(sourceItemName);
      const inventoryItem = configuredId
        ? mappings.inventoryItems.find((candidate) => candidate.id === configuredId)
        : mappings.byName.get(targetKey);
      let inventoryItemId = inventoryItem?.id || null;
      let status = inventoryItemId ? "mapped" : "unmapped";
      const warnings = [
        ...(dailyItem?.warnings || []),
        ...(monthlyItem?.warnings || []),
      ];
      let warning = warnings.join("; ") || null;

      if (inventoryItemId && mappedInventoryIds.has(inventoryItemId)) {
        status = "warning";
        warning = [warning, "Multiple source rows map to the same inventory item; stock update skipped"].filter(Boolean).join("; ");
        inventoryItemId = null;
      }
      if (inventoryItemId) mappedInventoryIds.add(inventoryItemId);

      prepared.push({
        sourceItemName,
        normalizedSourceName,
        sourceUnit: dailyItem?.sourceUnit || null,
        sourceRow: dailyItem?.sourceRow || monthlyItem?.sourceRow || 0,
        openingBalance: dailyItem?.openingBalance ?? monthlyItem?.openingBalance ?? 0,
        totalIssued: dailyItem?.totalIssued ?? 0,
        totalUsage: dailyItem?.totalUsage ?? 0,
        totalReturned: dailyItem?.totalReturned ?? 0,
        finalBalance: monthlyItem?.endingWip ?? dailyItem?.finalBalance ?? 0,
        dailyEntries: dailyItem?.dailyEntries || [],
        warnings,
        monthlyItem,
        inventoryItemId,
        inventoryItemName: inventoryItem?.name || null,
        status,
        warning,
      });
    }

    const monthlyAvailable = Boolean(monthlyParsed && monthlyParsed.itemColumn >= 0 && monthlyParsed.endingWipColumn >= 0);
    const warnings = [
      ...parsed.warnings,
      ...(monthlyParsed?.warnings || []),
      ...prepared.flatMap((item) => item.warnings),
      ...(!monthlyAvailable ? [`${MATERIAL_BALANCE_MONTH_TAB} is required before automatic stock invoices can be applied`] : []),
    ];
    const discrepancies: MaterialBalanceDiscrepancy[] = [...parsed.discrepancies];
    for (const item of prepared) {
      if (!item.monthlyItem) continue;
      const comparisons: Array<[MaterialBalanceDiscrepancy["field"], number, number]> = [
        ["month_issued", item.totalIssued, item.monthlyItem.stockIssued],
        ["month_usage", item.totalUsage, item.monthlyItem.materialUsed],
        ["month_ending_wip", item.finalBalance, item.monthlyItem.endingWip],
      ];
      for (const [field, dailyValue, monthlyValue] of comparisons) {
        if (Math.abs(dailyValue - monthlyValue) > 0.01) {
          discrepancies.push({
            itemName: item.sourceItemName,
            field,
            dailyTotal: dailyValue,
            sheetTotal: monthlyValue,
            difference: dailyValue - monthlyValue,
          });
        }
      }
    }
    const mappedItemCount = prepared.filter((item) => item.inventoryItemId).length;
    const unmappedItemCount = prepared.length - mappedItemCount;
    const status = warnings.length > 0 || discrepancies.length > 0 || prepared.some((item) => item.status !== "mapped")
      ? "warning"
      : "success";

    const previousImport = await tx.materialBalanceImport.findFirst({
      where: { connectionId: input.connectionId },
      orderBy: { importedAt: "desc" },
      include: { items: { include: { dailyEntries: true } } },
    });
    const previousIssued = new Map<string, number>();
    for (const previousItem of previousImport?.items || []) {
      for (const entry of previousItem.dailyEntries) {
        const date = entry.balanceDate.toISOString().slice(0, 10);
        previousIssued.set(`${previousItem.normalizedSourceName}:${date}`, Number(entry.issued || 0));
      }
    }

    let dashboardChangesDetected = false;
    if (previousImport) {
      const event = await tx.inventoryStockEvent.findFirst({
        where: {
          inventoryItemId: {
            in: previousImport.items
              .map((item) => item.inventoryItemId)
              .filter((itemId): itemId is string => Boolean(itemId)),
          },
          createdAt: { gt: previousImport.importedAt },
          sourceType: {
            notIn: [
              "google_material_balance_issue",
              "google_material_balance_adjustment",
              "google_material_balance_reconciliation",
              "google_material_balance",
            ],
          },
        },
        select: { id: true },
      });
      dashboardChangesDetected = Boolean(event);
    }

    const created = await tx.materialBalanceImport.create({
      data: {
        connectionId: input.connectionId,
        sourceTab: MATERIAL_BALANCE_TAB,
        sourceChecksum: checksum,
        status,
        sourceRowCount: parsed.sourceRowCount,
        sourceDayCount: parsed.dayCount,
        itemCount: prepared.length,
        mappedItemCount,
        unmappedItemCount,
        updatedStockCount: 0,
        dailyIssueInvoiceCount: 0,
        correctionInvoiceCount: 0,
        reconciliationCount: 0,
        monthlySourceTab: MATERIAL_BALANCE_MONTH_TAB,
        monthlyChecksum,
        monthlyItemCount: monthlyParsed?.itemCount || 0,
        stockChanges: [],
        warnings: JSON.parse(JSON.stringify(Array.from(new Set(warnings)))),
        discrepancies: JSON.parse(JSON.stringify(discrepancies)),
        createdById: input.createdById || null,
      },
      select: { id: true, importedAt: true },
    });

    let dailyEntryCount = 0;
    for (const item of prepared) {
      const snapshot = await tx.materialBalanceItem.create({
        data: {
          importId: created.id,
          sourceItemName: item.sourceItemName,
          normalizedSourceName: item.normalizedSourceName,
          sourceUnit: item.sourceUnit,
          sourceRow: item.sourceRow,
          inventoryItemId: item.inventoryItemId,
          openingBalance: item.openingBalance,
          totalIssued: item.totalIssued,
          totalUsage: item.totalUsage,
          totalReturned: item.totalReturned,
          finalBalance: item.finalBalance,
          monthOpeningBalance: item.monthlyItem?.openingBalance ?? null,
          monthStockIssued: item.monthlyItem?.stockIssued ?? null,
          monthInHand: item.monthlyItem?.inHand ?? null,
          monthMaterialUsed: item.monthlyItem?.materialUsed ?? null,
          monthEndingWip: item.monthlyItem?.endingWip ?? null,
          monthSourceRow: item.monthlyItem?.sourceRow ?? null,
          status: item.status,
          warning: item.warning,
        },
        select: { id: true },
      });

      if (item.dailyEntries.length > 0) {
        await tx.materialBalanceDailyEntry.createMany({
          data: item.dailyEntries.map((entry) => ({
            materialBalanceItemId: snapshot.id,
            balanceDate: new Date(`${entry.date}T00:00:00.000Z`),
            previousBalance: entry.previousBalance,
            issued: entry.issued,
            usage: entry.usage,
            balanceReturn: entry.balanceReturn,
            closingBalance: entry.closingBalance,
            sourceColumn: entry.sourceColumn,
            sourceBlockIndex: entry.sourceBlockIndex,
          })),
        });
        dailyEntryCount += item.dailyEntries.length;
      }
    }

    const stockChanges: MaterialBalanceStockChange[] = [];
    let dailyIssueInvoiceCount = 0;
    let correctionInvoiceCount = 0;
    let reconciliationCount = 0;

    for (const item of prepared) {
      if (item.inventoryItemId) continue;
      stockChanges.push({
        sourceItemName: item.sourceItemName,
        inventoryItemId: null,
        inventoryItemName: null,
        issueDate: null,
        issuedQuantity: item.totalIssued,
        previousStock: 0,
        newStock: 0,
        sheetEndingWip: item.monthlyItem?.endingWip ?? null,
        adjustmentDelta: 0,
        invoiceId: null,
        invoiceNumber: null,
        referenceId: null,
        status: "unmapped",
        warning: item.warning || "No inventory mapping exists for this Material Balance item",
      });
    }

    if (monthlyAvailable) {
      const invoiceLinesByDate = new Map<string, Array<{ item: PreparedMaterialItem; quantity: number }>>();
      for (const item of prepared) {
        if (!item.inventoryItemId) continue;
        const currentDates = new Set(item.dailyEntries.map((entry) => entry.date));
        const previousDates = previousImport
          ? previousImport.items
              .find((previousItem) => previousItem.normalizedSourceName === item.normalizedSourceName)
              ?.dailyEntries.map((entry) => entry.balanceDate.toISOString().slice(0, 10)) || []
          : [];
        for (const date of new Set([...currentDates, ...previousDates])) {
          const currentIssued = item.dailyEntries.find((entry) => entry.date === date)?.issued || 0;
          const previousIssuedValue = previousIssued.get(`${item.normalizedSourceName}:${date}`) || 0;
          const quantity = currentIssued - previousIssuedValue;
          if (Math.abs(quantity) <= 0.01) continue;
          const lines = invoiceLinesByDate.get(date) || [];
          lines.push({ item, quantity });
          invoiceLinesByDate.set(date, lines);
        }
      }

      for (const [date, lines] of invoiceLinesByDate) {
        const hasPreviousImport = Boolean(previousImport);
        const sourceType = hasPreviousImport ? "google_material_balance_adjustment" : "google_material_balance_issue";
        const sourceKey = [
          "gmb",
          input.connectionId,
          date,
          hasPreviousImport ? `correction-${created.id}` : "issue",
        ].join(":");
        const original = hasPreviousImport
          ? await tx.inventoryInvoice.findUnique({
              where: { sourceKey: ["gmb", input.connectionId, date, "issue"].join(":") },
              select: { id: true },
            })
          : null;
        const generated = await createGeneratedInvoice(tx, {
          sourceKey,
          sourceType,
          sourceDate: date,
          importId: created.id,
          createdById: input.createdById,
          correctionOfId: original?.id || null,
          lines: lines.map(({ item, quantity }) => ({
            item,
            quantity,
            status: hasPreviousImport ? "corrected" : "created",
            reason: hasPreviousImport ? "Corrected daily Material Balance issue quantity" : "Daily Material Balance issue",
          })),
        });
        if (generated) {
          stockChanges.push(...generated.changes);
          if (hasPreviousImport) correctionInvoiceCount += 1;
          else dailyIssueInvoiceCount += 1;
        }
      }

      const monthEnd = new Date(Date.UTC(input.year, input.month, 0)).toISOString().slice(0, 10);
      for (const item of prepared) {
        if (!item.inventoryItemId || !item.monthlyItem) continue;
        const current = await tx.inventoryItem.findUnique({
          where: { id: item.inventoryItemId },
          select: { currentStock: true },
        });
        if (!current) continue;
        const currentStock = Number(current.currentStock || 0);
        const expectedStock = item.monthlyItem.endingWip;
        if (Math.abs(currentStock - expectedStock) <= 0.01) {
          stockChanges.push({
            sourceItemName: item.sourceItemName,
            inventoryItemId: item.inventoryItemId,
            inventoryItemName: item.inventoryItemName,
            issueDate: null,
            issuedQuantity: 0,
            previousStock: currentStock,
            newStock: currentStock,
            sheetEndingWip: expectedStock,
            adjustmentDelta: 0,
            invoiceId: null,
            invoiceNumber: null,
            referenceId: null,
            status: "unchanged",
            warning: item.warning,
          });
          continue;
        }

        const sourceKey = [
          "gmb-month-end",
          input.connectionId,
          created.id,
          item.inventoryItemId,
          formatStockValue(currentStock),
          formatStockValue(expectedStock),
        ].join(":");
        const generated = await createGeneratedInvoice(tx, {
          sourceKey,
          sourceType: "google_material_balance_reconciliation",
          sourceDate: monthEnd,
          importId: created.id,
          createdById: input.createdById,
          lines: [{
            item,
            quantity: expectedStock - currentStock,
            status: "reconciled",
            reason: `Reconciled to ${MATERIAL_BALANCE_MONTH_TAB} Ending WIP Material`,
          }],
        });
        if (generated) {
          stockChanges.push(...generated.changes);
          reconciliationCount += 1;
        }
      }
    }

    const updatedStockCount = new Set(
      stockChanges.filter((change) => change.status !== "unchanged" && change.inventoryItemId).map((change) => change.inventoryItemId),
    ).size;
    const finalized = await tx.materialBalanceImport.update({
      where: { id: created.id },
      data: {
        updatedStockCount,
        dailyIssueInvoiceCount,
        correctionInvoiceCount,
        reconciliationCount,
        stockChanges: JSON.parse(JSON.stringify(stockChanges)),
      },
      select: {
        id: true,
        importedAt: true,
        status: true,
        sourceDayCount: true,
        itemCount: true,
        mappedItemCount: true,
        unmappedItemCount: true,
        updatedStockCount: true,
        dailyIssueInvoiceCount: true,
        correctionInvoiceCount: true,
        reconciliationCount: true,
        monthlySourceTab: true,
        monthlyChecksum: true,
        monthlyItemCount: true,
        stockChanges: true,
        warnings: true,
        discrepancies: true,
      },
    });

    return resultFromImport(finalized, false, {
      dailyEntryCount,
      stockChanges,
      dashboardChangesDetected,
    });
  });
}

export function serializeMaterialBalanceImport(input: any) {
  return {
    id: input.id,
    sourceTab: input.sourceTab,
    sourceChecksum: input.sourceChecksum,
    status: input.status,
    importedAt: input.importedAt?.toISOString?.() || input.importedAt,
    sourceRowCount: input.sourceRowCount,
    sourceDayCount: input.sourceDayCount,
    itemCount: input.itemCount,
    mappedItemCount: input.mappedItemCount,
    unmappedItemCount: input.unmappedItemCount,
    updatedStockCount: input.updatedStockCount,
    dailyIssueInvoiceCount: input.dailyIssueInvoiceCount || 0,
    correctionInvoiceCount: input.correctionInvoiceCount || 0,
    reconciliationCount: input.reconciliationCount || 0,
    monthlySourceTab: input.monthlySourceTab || MATERIAL_BALANCE_MONTH_TAB,
    monthlyChecksum: input.monthlyChecksum || null,
    monthlyItemCount: input.monthlyItemCount || 0,
    stockChanges: Array.isArray(input.stockChanges) ? input.stockChanges : [],
    warnings: Array.isArray(input.warnings) ? input.warnings : [],
    discrepancies: Array.isArray(input.discrepancies) ? input.discrepancies : [],
    items: (input.items || []).map((item: any) => ({
      id: item.id,
      sourceItemName: item.sourceItemName,
      normalizedSourceName: item.normalizedSourceName,
      sourceUnit: item.sourceUnit,
      sourceRow: item.sourceRow,
      inventoryItemId: item.inventoryItemId,
      openingBalance: Number(item.openingBalance ?? 0),
      totalIssued: Number(item.totalIssued ?? 0),
      totalUsage: Number(item.totalUsage ?? 0),
      totalReturned: Number(item.totalReturned ?? 0),
      finalBalance: Number(item.finalBalance ?? 0),
      monthOpeningBalance: item.monthOpeningBalance == null ? null : Number(item.monthOpeningBalance),
      monthStockIssued: item.monthStockIssued == null ? null : Number(item.monthStockIssued),
      monthInHand: item.monthInHand == null ? null : Number(item.monthInHand),
      monthMaterialUsed: item.monthMaterialUsed == null ? null : Number(item.monthMaterialUsed),
      monthEndingWip: item.monthEndingWip == null ? null : Number(item.monthEndingWip),
      monthSourceRow: item.monthSourceRow ?? null,
      status: item.status,
      warning: item.warning,
      inventoryItem: item.inventoryItem
        ? {
            id: item.inventoryItem.id,
            name: item.inventoryItem.name,
            unit: item.inventoryItem.unit,
            currentStock: Number(item.inventoryItem.currentStock ?? 0),
              lastStockEvent: item.inventoryItem.inventoryStockEvents?.[0]
              ? {
                  sourceType: item.inventoryItem.inventoryStockEvents[0].sourceType,
                  createdAt: item.inventoryItem.inventoryStockEvents[0].createdAt?.toISOString?.(),
                }
              : null,
          }
        : null,
      dailyEntries: (item.dailyEntries || []).map((entry: any) => ({
        id: entry.id,
        date: entry.balanceDate?.toISOString?.().slice(0, 10) || entry.balanceDate,
        previousBalance: Number(entry.previousBalance ?? 0),
        issued: Number(entry.issued ?? 0),
        usage: Number(entry.usage ?? 0),
        balanceReturn: Number(entry.balanceReturn ?? 0),
        closingBalance: Number(entry.closingBalance ?? entry.balanceReturn ?? 0),
      })),
    })),
  };
}
