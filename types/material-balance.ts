export type MaterialBalanceImportStatus = "success" | "warning" | "failed" | "skipped";

export type MaterialBalanceStockSource =
  | "google_material_balance"
  | "google_material_balance_issue"
  | "google_material_balance_adjustment"
  | "google_material_balance_reconciliation"
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
  monthOpeningBalance: number | null;
  monthStockIssued: number | null;
  monthInHand: number | null;
  monthMaterialUsed: number | null;
  monthEndingWip: number | null;
  monthSourceRow: number | null;
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
  dailyIssueInvoiceCount: number;
  correctionInvoiceCount: number;
  reconciliationCount: number;
  monthlySourceTab: string;
  monthlyChecksum: string | null;
  monthlyItemCount: number;
  stockChanges: Array<{
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
    status: string;
    warning?: string | null;
  }>;
  warnings: string[];
  discrepancies: Array<{
    itemName: string;
    field: "issued" | "usage" | "return" | "month_issued" | "month_usage" | "month_ending_wip";
    dailyTotal: number;
    sheetTotal: number;
    difference: number;
  }>;
  items: MaterialBalanceItemSnapshot[];
}
