import { createHash } from "node:crypto";
import type { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";

export const MATERIAL_BALANCE_TAB = "Material Balance";

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
  field: "issued" | "usage" | "return";
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
  warnings: string[];
  discrepancies: MaterialBalanceDiscrepancy[];
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
    const isDateLabel = headerKey(headerRow[column]) === "date";
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

function resultFromImport(
  existing: {
    id: string;
    importedAt: Date;
    status: string;
    sourceDayCount: number;
    itemCount: number;
    mappedItemCount: number;
    unmappedItemCount: number;
    updatedStockCount: number;
    warnings: unknown;
    discrepancies: unknown;
  },
  skipped: boolean
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
    warnings: Array.isArray(existing.warnings) ? (existing.warnings as string[]) : [],
    discrepancies: Array.isArray(existing.discrepancies)
      ? (existing.discrepancies as MaterialBalanceDiscrepancy[])
      : [],
  };
}

export async function importMaterialBalanceValues(input: {
  connectionId: string;
  month: number;
  year: number;
  values: SheetValues;
  createdById?: string | null;
}): Promise<MaterialBalanceImportResult> {
  const parsed = parseMaterialBalanceValues(input.values, input.month, input.year);

  const existing = await prisma.materialBalanceImport.findUnique({
    where: {
      connectionId_sourceChecksum: {
        connectionId: input.connectionId,
        sourceChecksum: parsed.checksum,
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
      warnings: true,
      discrepancies: true,
    },
  });
  if (existing) return resultFromImport(existing, true);

  return prisma.$transaction(async (tx) => {
    const mappings = await resolveInventoryMappings(tx);
    const mappedInventoryIds = new Set<string>();
    const prepared = parsed.items.map((item) => {
      const configuredId = mappings.configured.get(item.normalizedSourceName);
      const targetKey = resolveTargetKey(item.sourceItemName);
      const inventoryItem = configuredId
        ? mappings.inventoryItems.find((candidate) => candidate.id === configuredId)
        : mappings.byName.get(targetKey);
      let inventoryItemId = inventoryItem?.id || null;
      let status = inventoryItemId ? "mapped" : "unmapped";
      let warning = item.warnings.join("; ") || null;

      if (inventoryItemId && mappedInventoryIds.has(inventoryItemId)) {
        status = "warning";
        warning = [warning, "Multiple source rows map to the same inventory item; stock update skipped"].filter(Boolean).join("; ");
        inventoryItemId = null;
      }
      if (inventoryItemId) mappedInventoryIds.add(inventoryItemId);
      if (item.warnings.length > 0 && status === "mapped") status = "warning";

      return { ...item, inventoryItemId, status, warning };
    });

    const mappedItemCount = prepared.filter((item) => item.inventoryItemId).length;
    const unmappedItemCount = prepared.length - mappedItemCount;
    const updates = prepared.filter((item) => item.inventoryItemId);
    const status = parsed.warnings.length || parsed.discrepancies.length || prepared.some((item) => item.status !== "mapped")
      ? "warning"
      : "success";

    const created = await tx.materialBalanceImport.create({
      data: {
        connectionId: input.connectionId,
        sourceTab: MATERIAL_BALANCE_TAB,
        sourceChecksum: parsed.checksum,
        status,
        sourceRowCount: parsed.sourceRowCount,
        sourceDayCount: parsed.dayCount,
        itemCount: prepared.length,
        mappedItemCount,
        unmappedItemCount,
        updatedStockCount: 0,
        warnings: JSON.parse(JSON.stringify([...parsed.warnings, ...prepared.flatMap((item) => item.warnings)])),
        discrepancies: JSON.parse(JSON.stringify(parsed.discrepancies)),
        createdById: input.createdById || null,
      },
      select: { id: true, importedAt: true },
    });

    let updatedStockCount = 0;
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

      if (!item.inventoryItemId) continue;
      const inventoryItem = mappings.inventoryItems.find((candidate) => candidate.id === item.inventoryItemId);
      if (!inventoryItem) continue;
      const previousStock = Number(inventoryItem.currentStock);
      const newStock = item.finalBalance;
      if (Math.abs(previousStock - newStock) <= 0.01) continue;

      await tx.inventoryItem.update({
        where: { id: item.inventoryItemId },
        data: { currentStock: newStock },
      });
      await tx.inventoryStockEvent.create({
        data: {
          inventoryItemId: item.inventoryItemId,
          sourceType: "google_material_balance",
          sourceReferenceId: snapshot.id,
          materialBalanceImportId: created.id,
          previousStock,
          newStock,
          quantityDelta: newStock - previousStock,
          reason: `Imported from ${MATERIAL_BALANCE_TAB} (${input.month}/${input.year})`,
          createdById: input.createdById || null,
        },
      });
      updatedStockCount += 1;
    }

    const finalized = await tx.materialBalanceImport.update({
      where: { id: created.id },
      data: { updatedStockCount },
      select: {
        id: true,
        importedAt: true,
        status: true,
        sourceDayCount: true,
        itemCount: true,
        mappedItemCount: true,
        unmappedItemCount: true,
        updatedStockCount: true,
        warnings: true,
        discrepancies: true,
      },
    });

    return {
      ...resultFromImport(finalized, false),
      dailyEntryCount,
    };
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
