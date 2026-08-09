export type MaterialBalanceImportStatus = "success" | "warning" | "failed" | "skipped";

export type MaterialBalanceStockSource =
  | "google_material_balance"
  | "inventory_receipt"
  | "line_usage"
  | "waste"
  | "manual";

export interface MaterialBalanceDailyEntry {
  id: string;
  date: string;
  previousBalance: number;
  issued: number;
  usage: number;
  balanceReturn: number;
  closingBalance: number;
}

export interface MaterialBalanceItemSnapshot {
  id: string;
  sourceItemName: string;
  normalizedSourceName: string;
  sourceUnit: string | null;
  sourceRow: number;
  inventoryItemId: string | null;
  openingBalance: number;
  totalIssued: number;
  totalUsage: number;
  totalReturned: number;
  finalBalance: number;
  status: "mapped" | "unmapped" | "warning" | string;
  warning: string | null;
  inventoryItem: {
    id: string;
    name: string;
    unit: string;
    currentStock: number;
    lastStockEvent: {
      sourceType: MaterialBalanceStockSource | string;
      createdAt: string;
    } | null;
  } | null;
  dailyEntries: MaterialBalanceDailyEntry[];
}

export interface MaterialBalanceImport {
  id: string;
  sourceTab: string;
  sourceChecksum: string;
  status: MaterialBalanceImportStatus | string;
  importedAt: string;
  sourceRowCount: number;
  sourceDayCount: number;
  itemCount: number;
  mappedItemCount: number;
  unmappedItemCount: number;
  updatedStockCount: number;
  warnings: string[];
  discrepancies: Array<{
    itemName: string;
    field: "issued" | "usage" | "return";
    dailyTotal: number;
    sheetTotal: number;
    difference: number;
  }>;
  items: MaterialBalanceItemSnapshot[];
}
