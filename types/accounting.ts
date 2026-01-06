// ==========================================
// ACCOUNTING MODULE TYPES
// ==========================================

// ==========================================
// ENUMS & CONSTANTS
// ==========================================

export const AccountCategory = {
  ASSET: "Asset",
  LIABILITY: "Liability",
  EQUITY: "Equity",
  REVENUE: "Revenue",
  EXPENSE: "Expense",
} as const;

export type AccountCategoryType = (typeof AccountCategory)[keyof typeof AccountCategory];

export const AccountSubCategory = {
  // Assets
  CURRENT_ASSET: "Current Asset",
  FIXED_ASSET: "Fixed Asset",
  OTHER_ASSET: "Other Asset",
  // Liabilities
  CURRENT_LIABILITY: "Current Liability",
  LONG_TERM_LIABILITY: "Long-term Liability",
  // Equity
  OWNERS_EQUITY: "Owner's Equity",
  RETAINED_EARNINGS: "Retained Earnings",
  // Revenue
  OPERATING_REVENUE: "Operating Revenue",
  OTHER_REVENUE: "Other Revenue",
  // Expense
  OPERATING_EXPENSE: "Operating Expense",
  COST_OF_GOODS: "Cost of Goods Sold",
  ADMINISTRATIVE_EXPENSE: "Administrative Expense",
  OTHER_EXPENSE: "Other Expense",
} as const;

export type AccountSubCategoryType = (typeof AccountSubCategory)[keyof typeof AccountSubCategory];

export const JournalEntryStatus = {
  DRAFT: "draft",
  PENDING: "pending",
  APPROVED: "approved",
  REVERSED: "reversed",
} as const;

export type JournalEntryStatusType = (typeof JournalEntryStatus)[keyof typeof JournalEntryStatus];

export const PaymentStatus = {
  UNPAID: "unpaid",
  PARTIAL: "partial",
  PAID: "paid",
  NOT_APPLICABLE: "not_applicable",
} as const;

export type PaymentStatusType = (typeof PaymentStatus)[keyof typeof PaymentStatus];

export const PaymentMethod = {
  CASH: "cash",
  BANK_TRANSFER: "bank_transfer",
  CHEQUE: "cheque",
  CARD: "card",
  OTHER: "other",
} as const;

export type PaymentMethodType = (typeof PaymentMethod)[keyof typeof PaymentMethod];

export const PeriodType = {
  MONTHLY: "monthly",
  QUARTERLY: "quarterly",
  YEARLY: "yearly",
} as const;

export type PeriodTypeValue = (typeof PeriodType)[keyof typeof PeriodType];

export const InvoiceType = {
  GENERATED: "generated",
  INVENTORY: "inventory",
} as const;

export type InvoiceTypeValue = (typeof InvoiceType)[keyof typeof InvoiceType];

// ==========================================
// CURRENCY TYPES
// ==========================================

export interface Currency {
  id: string;
  code: string;
  name: string;
  symbol: string;
  exchangeRate: number;
  isBase: boolean;
  isActive: boolean;
  isDefault?: boolean;
  decimalPlaces: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CurrencyFormData {
  code: string;
  name: string;
  symbol: string;
  exchangeRate: number;
  isBase?: boolean;
  isActive?: boolean;
  decimalPlaces?: number;
}

// ==========================================
// CHART OF ACCOUNTS TYPES
// ==========================================

export interface ChartOfAccount {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  category: AccountCategoryType;
  subCategory?: string | null;
  parentId?: string | null;
  currencyId?: string | null;
  isActive: boolean;
  isSystemAccount: boolean;
  normalBalance: "debit" | "credit";
  openingBalance: number;
  currentBalance: number;
  displayOrder: number;
  createdAt: Date;
  updatedAt: Date;
  // Relations
  parent?: ChartOfAccount | null;
  children?: ChartOfAccount[];
  currency?: Currency | null;
}

export interface ChartOfAccountWithHierarchy extends ChartOfAccount {
  children: ChartOfAccountWithHierarchy[];
  level: number;
}

export interface AccountFormData {
  code: string;
  name: string;
  description?: string;
  category: AccountCategoryType;
  subCategory?: string;
  parentId?: string;
  currencyId?: string;
  isActive?: boolean;
  normalBalance?: "debit" | "credit";
  openingBalance?: number;
  displayOrder?: number;
}

// ==========================================
// ACCOUNTING PERIOD TYPES
// ==========================================

export interface AccountingPeriod {
  id: string;
  name: string;
  periodType: PeriodTypeValue;
  startDate: Date;
  endDate: Date;
  isClosed: boolean;
  closedAt?: Date | null;
  closedById?: string | null;
  notes?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AccountingPeriodFormData {
  name: string;
  periodType: PeriodTypeValue;
  startDate: Date;
  endDate: Date;
  notes?: string;
}

// ==========================================
// JOURNAL ENTRY TYPES
// ==========================================

export interface JournalEntryLine {
  id: string;
  journalEntryId: string;
  accountId: string;
  description?: string | null;
  debitAmount: number;
  creditAmount: number;
  lineOrder: number;
  createdAt: Date;
  // Relations
  account?: ChartOfAccount;
}

export interface JournalEntry {
  id: string;
  entryNumber: string;
  date: Date;
  description: string;
  reference?: string | null;
  referenceType?: string | null;
  referenceId?: string | null;
  periodId?: string | null;
  currencyId?: string | null;
  exchangeRate: number;
  status: JournalEntryStatusType;
  totalDebit: number;
  totalCredit: number;
  isReversed: boolean;
  reversedEntryId?: string | null;
  originalEntryId?: string | null;
  createdById?: string | null;
  approvedById?: string | null;
  approvedAt?: Date | null;
  notes?: string | null;
  createdAt: Date;
  updatedAt: Date;
  // Relations
  period?: AccountingPeriod | null;
  currency?: Currency | null;
  lines?: JournalEntryLine[];
}

export interface JournalEntryLineInput {
  accountId: string;
  description?: string;
  debitAmount: number;
  creditAmount: number;
}

export interface JournalEntryFormData {
  date: Date;
  description: string;
  reference?: string;
  referenceType?: string;
  referenceId?: string;
  periodId?: string;
  currencyId?: string;
  exchangeRate?: number;
  notes?: string;
  lines: JournalEntryLineInput[];
}

// ==========================================
// INVOICE PAYMENT TYPES
// ==========================================

export interface InvoicePayment {
  id: string;
  paymentNumber: string;
  invoiceId: string;
  invoiceType: InvoiceTypeValue;
  paymentDate: Date;
  amount: number;
  currencyId?: string | null;
  exchangeRate: number;
  amountInBase: number;
  paymentMethod: PaymentMethodType;
  reference?: string | null;
  bankAccountId?: string | null;
  journalEntryId?: string | null;
  status: "pending" | "completed" | "cancelled";
  notes?: string | null;
  createdById?: string | null;
  createdAt: Date;
  updatedAt: Date;
  // Relations
  currency?: Currency | null;
}

export interface InvoicePaymentFormData {
  invoiceId: string;
  invoiceType: InvoiceTypeValue;
  paymentDate: Date;
  amount: number;
  currencyId?: string;
  exchangeRate?: number;
  paymentMethod: PaymentMethodType;
  reference?: string;
  bankAccountId?: string;
  notes?: string;
}

// ==========================================
// ACCOUNTING SETTINGS TYPES
// ==========================================

export interface AccountingSettings {
  id: string;
  fiscalYearStart: number;
  baseCurrencyId?: string | null;
  defaultCurrencyId?: string | null;
  defaultReceivablesAccountId?: string | null;
  defaultPayablesAccountId?: string | null;
  defaultCashAccountId?: string | null;
  defaultRevenueAccountId?: string | null;
  defaultExpenseAccountId?: string | null;
  autoGenerateJournalEntries: boolean;
  autoApproveEntries?: boolean;
  requireApproval: boolean;
  allowBackdatedEntries: boolean;
  entryNumberPrefix: string;
  paymentNumberPrefix: string;
  createdAt: Date;
  updatedAt: Date;
  // Relations
  defaultReceivablesAccount?: ChartOfAccount | null;
  defaultPayablesAccount?: ChartOfAccount | null;
  defaultCashAccount?: ChartOfAccount | null;
  defaultRevenueAccount?: ChartOfAccount | null;
  defaultExpenseAccount?: ChartOfAccount | null;
}

export interface AccountingSettingsFormData {
  fiscalYearStart?: number;
  baseCurrencyId?: string;
  defaultReceivablesAccountId?: string;
  defaultPayablesAccountId?: string;
  defaultCashAccountId?: string;
  defaultRevenueAccountId?: string;
  defaultExpenseAccountId?: string;
  autoGenerateJournalEntries?: boolean;
  requireApproval?: boolean;
  allowBackdatedEntries?: boolean;
  entryNumberPrefix?: string;
  paymentNumberPrefix?: string;
}

// ==========================================
// REPORT TYPES
// ==========================================

export interface LedgerEntry {
  id: string;
  date: Date;
  entryNumber: string;
  description: string;
  reference?: string;
  debit: number;
  credit: number;
  runningBalance: number;
}

// Alias for component usage
export interface AccountLedgerEntry extends LedgerEntry {
  journalEntryNumber?: string;
}

export interface AccountLedger {
  account: ChartOfAccount;
  entries: LedgerEntry[];
  openingBalance: number;
  totalDebits: number;
  totalCredits: number;
  closingBalance: number;
  period?: {
    startDate: Date;
    endDate: Date;
  };
}

export interface TrialBalanceRow {
  accountId: string;
  accountCode: string;
  accountName: string;
  category: AccountCategoryType;
  debitBalance: number;
  creditBalance: number;
}

export interface TrialBalance {
  asOfDate: Date;
  rows: TrialBalanceRow[];
  totalDebits: number;
  totalCredits: number;
  isBalanced: boolean;
}

export interface IncomeStatementRow {
  accountId: string;
  accountCode: string;
  accountName: string;
  subCategory?: string;
  amount: number;
}

export interface IncomeStatement {
  periodStart: Date;
  periodEnd: Date;
  revenue: {
    items: IncomeStatementRow[];
    total: number;
  };
  expenses: {
    items: IncomeStatementRow[];
    total: number;
  };
  netIncome: number;
}

export interface BalanceSheetRow {
  accountId: string;
  accountCode: string;
  accountName: string;
  subCategory?: string;
  amount: number;
}

export interface BalanceSheet {
  asOfDate: Date;
  assets: {
    current: BalanceSheetRow[];
    fixed: BalanceSheetRow[];
    other: BalanceSheetRow[];
    totalCurrent: number;
    totalFixed: number;
    totalOther: number;
    total: number;
  };
  liabilities: {
    current: BalanceSheetRow[];
    longTerm: BalanceSheetRow[];
    totalCurrent: number;
    totalLongTerm: number;
    total: number;
  };
  equity: {
    items: BalanceSheetRow[];
    retainedEarnings: number;
    total: number;
  };
  totalLiabilitiesAndEquity: number;
  isBalanced: boolean;
}

// ==========================================
// DASHBOARD & SUMMARY TYPES
// ==========================================

export interface AccountingSummary {
  // Balance Sheet Totals
  totalAssets: number;
  totalLiabilities: number;
  totalEquity: number;
  // Income Statement Totals
  totalRevenue: number;
  totalExpenses: number;
  netIncome: number;
  // Receivables & Payables
  totalReceivables: number;
  totalPayables: number;
  cashBalance: number;
  // Period Comparisons
  revenueThisMonth: number;
  revenueThisYear: number;
  expensesThisMonth: number;
  expensesThisYear: number;
  netIncomeThisMonth: number;
  netIncomeThisYear: number;
  // Counts & Status
  unpaidInvoices: number;
  unpaidInvoicesCount: number;
  unpaidInvoicesAmount: number;
  pendingEntries: number;
  pendingPaymentsCount: number;
  // Current Period
  currentPeriod?: AccountingPeriod | null;
  // Recent Activity
  recentEntries: JournalEntry[];
  recentPayments: InvoicePayment[];
}

export interface AccountBalanceSummary {
  accountId: string;
  accountCode: string;
  accountName: string;
  category: AccountCategoryType;
  currentBalance: number;
  changeThisMonth: number;
  changePercentage: number;
}

export interface CashFlowSummary {
  periodStart: Date;
  periodEnd: Date;
  openingBalance: number;
  totalInflows: number;
  totalOutflows: number;
  netChange: number;
  closingBalance: number;
}

// ==========================================
// API REQUEST/RESPONSE TYPES
// ==========================================

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface AccountFilters {
  category?: AccountCategoryType;
  subCategory?: string;
  isActive?: boolean;
  search?: string;
  parentId?: string;
}

export interface JournalEntryFilters {
  status?: JournalEntryStatusType;
  dateFrom?: Date;
  dateTo?: Date;
  accountId?: string;
  search?: string;
  referenceType?: string;
}

export interface PaymentFilters {
  invoiceType?: InvoiceTypeValue;
  paymentMethod?: PaymentMethodType;
  dateFrom?: Date;
  dateTo?: Date;
  status?: string;
  search?: string;
}

export interface ReportParams {
  startDate?: Date;
  endDate?: Date;
  asOfDate?: Date;
  periodId?: string;
  accountIds?: string[];
  includeZeroBalances?: boolean;
}

// ==========================================
// DEFAULT CHART OF ACCOUNTS SEED DATA
// ==========================================

export interface DefaultAccountSeed {
  code: string;
  name: string;
  category: AccountCategoryType;
  subCategory: string;
  normalBalance: "debit" | "credit";
  isSystemAccount: boolean;
  description?: string;
}

export const DEFAULT_ACCOUNTS: DefaultAccountSeed[] = [
  // ASSETS
  { code: "1000", name: "Cash", category: "Asset", subCategory: "Current Asset", normalBalance: "debit", isSystemAccount: true, description: "Cash on hand and in bank" },
  { code: "1010", name: "Petty Cash", category: "Asset", subCategory: "Current Asset", normalBalance: "debit", isSystemAccount: false, description: "Petty cash fund" },
  { code: "1100", name: "Accounts Receivable", category: "Asset", subCategory: "Current Asset", normalBalance: "debit", isSystemAccount: true, description: "Money owed by customers" },
  { code: "1200", name: "Inventory", category: "Asset", subCategory: "Current Asset", normalBalance: "debit", isSystemAccount: true, description: "Stock of materials and supplies" },
  { code: "1300", name: "Prepaid Expenses", category: "Asset", subCategory: "Current Asset", normalBalance: "debit", isSystemAccount: false, description: "Expenses paid in advance" },
  { code: "1500", name: "Equipment", category: "Asset", subCategory: "Fixed Asset", normalBalance: "debit", isSystemAccount: false, description: "Tools and equipment" },
  { code: "1510", name: "Accumulated Depreciation - Equipment", category: "Asset", subCategory: "Fixed Asset", normalBalance: "credit", isSystemAccount: false, description: "Accumulated depreciation on equipment" },
  { code: "1600", name: "Vehicles", category: "Asset", subCategory: "Fixed Asset", normalBalance: "debit", isSystemAccount: false, description: "Company vehicles" },
  { code: "1610", name: "Accumulated Depreciation - Vehicles", category: "Asset", subCategory: "Fixed Asset", normalBalance: "credit", isSystemAccount: false, description: "Accumulated depreciation on vehicles" },

  // LIABILITIES
  { code: "2000", name: "Accounts Payable", category: "Liability", subCategory: "Current Liability", normalBalance: "credit", isSystemAccount: true, description: "Money owed to suppliers" },
  { code: "2100", name: "Accrued Expenses", category: "Liability", subCategory: "Current Liability", normalBalance: "credit", isSystemAccount: false, description: "Expenses incurred but not yet paid" },
  { code: "2200", name: "Wages Payable", category: "Liability", subCategory: "Current Liability", normalBalance: "credit", isSystemAccount: false, description: "Wages owed to employees" },
  { code: "2300", name: "Taxes Payable", category: "Liability", subCategory: "Current Liability", normalBalance: "credit", isSystemAccount: false, description: "Tax obligations" },
  { code: "2500", name: "Long-term Loans", category: "Liability", subCategory: "Long-term Liability", normalBalance: "credit", isSystemAccount: false, description: "Long-term debt obligations" },

  // EQUITY
  { code: "3000", name: "Owner's Capital", category: "Equity", subCategory: "Owner's Equity", normalBalance: "credit", isSystemAccount: true, description: "Owner's investment in the business" },
  { code: "3100", name: "Retained Earnings", category: "Equity", subCategory: "Retained Earnings", normalBalance: "credit", isSystemAccount: true, description: "Accumulated profits" },
  { code: "3200", name: "Drawings", category: "Equity", subCategory: "Owner's Equity", normalBalance: "debit", isSystemAccount: false, description: "Owner's withdrawals" },

  // REVENUE
  { code: "4000", name: "Service Revenue", category: "Revenue", subCategory: "Operating Revenue", normalBalance: "credit", isSystemAccount: true, description: "Revenue from fiber installation services" },
  { code: "4100", name: "Installation Revenue", category: "Revenue", subCategory: "Operating Revenue", normalBalance: "credit", isSystemAccount: false, description: "Revenue from new installations" },
  { code: "4200", name: "Maintenance Revenue", category: "Revenue", subCategory: "Operating Revenue", normalBalance: "credit", isSystemAccount: false, description: "Revenue from maintenance services" },
  { code: "4900", name: "Other Revenue", category: "Revenue", subCategory: "Other Revenue", normalBalance: "credit", isSystemAccount: false, description: "Other income sources" },

  // EXPENSES
  { code: "5000", name: "Cost of Materials", category: "Expense", subCategory: "Cost of Goods Sold", normalBalance: "debit", isSystemAccount: true, description: "Direct material costs" },
  { code: "5100", name: "Cable & Fiber Costs", category: "Expense", subCategory: "Cost of Goods Sold", normalBalance: "debit", isSystemAccount: false, description: "Fiber optic cable costs" },
  { code: "5200", name: "Hardware Costs", category: "Expense", subCategory: "Cost of Goods Sold", normalBalance: "debit", isSystemAccount: false, description: "Installation hardware costs" },
  { code: "6000", name: "Labor Costs", category: "Expense", subCategory: "Operating Expense", normalBalance: "debit", isSystemAccount: false, description: "Technician labor costs" },
  { code: "6100", name: "Wages & Salaries", category: "Expense", subCategory: "Operating Expense", normalBalance: "debit", isSystemAccount: false, description: "Employee wages and salaries" },
  { code: "6200", name: "Vehicle Expenses", category: "Expense", subCategory: "Operating Expense", normalBalance: "debit", isSystemAccount: false, description: "Fuel, maintenance, insurance" },
  { code: "6300", name: "Utilities", category: "Expense", subCategory: "Administrative Expense", normalBalance: "debit", isSystemAccount: false, description: "Electricity, water, internet" },
  { code: "6400", name: "Rent Expense", category: "Expense", subCategory: "Administrative Expense", normalBalance: "debit", isSystemAccount: false, description: "Office or warehouse rent" },
  { code: "6500", name: "Office Supplies", category: "Expense", subCategory: "Administrative Expense", normalBalance: "debit", isSystemAccount: false, description: "Stationery and supplies" },
  { code: "6600", name: "Depreciation Expense", category: "Expense", subCategory: "Operating Expense", normalBalance: "debit", isSystemAccount: false, description: "Depreciation of assets" },
  { code: "6700", name: "Insurance Expense", category: "Expense", subCategory: "Administrative Expense", normalBalance: "debit", isSystemAccount: false, description: "Business insurance" },
  { code: "6800", name: "Professional Fees", category: "Expense", subCategory: "Administrative Expense", normalBalance: "debit", isSystemAccount: false, description: "Legal and accounting fees" },
  { code: "6900", name: "Bank Charges", category: "Expense", subCategory: "Other Expense", normalBalance: "debit", isSystemAccount: false, description: "Bank fees and charges" },
  { code: "7000", name: "Miscellaneous Expense", category: "Expense", subCategory: "Other Expense", normalBalance: "debit", isSystemAccount: false, description: "Other miscellaneous expenses" },
];

// Default currencies
export interface DefaultCurrencySeed {
  code: string;
  name: string;
  symbol: string;
  isBase: boolean;
  decimalPlaces: number;
}

export const DEFAULT_CURRENCIES: DefaultCurrencySeed[] = [
  { code: "LKR", name: "Sri Lankan Rupee", symbol: "Rs.", isBase: true, decimalPlaces: 2 },
  { code: "USD", name: "US Dollar", symbol: "$", isBase: false, decimalPlaces: 2 },
  { code: "EUR", name: "Euro", symbol: "€", isBase: false, decimalPlaces: 2 },
  { code: "GBP", name: "British Pound", symbol: "£", isBase: false, decimalPlaces: 2 },
];
