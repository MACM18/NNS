// ==========================================
// ACCOUNTING SERVICE
// Double-Entry Accounting Core Logic
// ==========================================

import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import type {
  AccountCategoryType,
  AccountFilters,
  AccountingSummary,
  AccountLedger,
  BalanceSheet,
  ChartOfAccount,
  ChartOfAccountWithHierarchy,
  DEFAULT_ACCOUNTS,
  DEFAULT_CURRENCIES,
  IncomeStatement,
  InvoicePaymentFormData,
  InvoiceTypeValue,
  JournalEntry,
  JournalEntryFilters,
  JournalEntryFormData,
  LedgerEntry,
  PaymentFilters,
  ReportParams,
  TrialBalance,
  TrialBalanceRow,
} from "@/types/accounting";

// Use Prisma.Decimal for type compatibility
type Decimal = Prisma.Decimal;

// ==========================================
// UTILITY FUNCTIONS
// ==========================================

/**
 * Generate next sequential number with prefix
 */
export async function generateSequentialNumber(
  prefix: string,
  table: "journal_entries" | "invoice_payments",
  field: string
): Promise<string> {
  const year = new Date().getFullYear();
  const pattern = `${prefix}-${year}-%`;

  let lastNumber: string | null = null;

  if (table === "journal_entries") {
    const last = await prisma.journalEntry.findFirst({
      where: { entryNumber: { startsWith: `${prefix}-${year}-` } },
      orderBy: { entryNumber: "desc" },
      select: { entryNumber: true },
    });
    lastNumber = last?.entryNumber ?? null;
  } else if (table === "invoice_payments") {
    const last = await prisma.invoicePayment.findFirst({
      where: { paymentNumber: { startsWith: `${prefix}-${year}-` } },
      orderBy: { paymentNumber: "desc" },
      select: { paymentNumber: true },
    });
    lastNumber = last?.paymentNumber ?? null;
  }

  let nextSeq = 1;
  if (lastNumber) {
    const parts = lastNumber.split("-");
    const lastSeq = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(lastSeq)) {
      nextSeq = lastSeq + 1;
    }
  }

  return `${prefix}-${year}-${String(nextSeq).padStart(4, "0")}`;
}

/**
 * Convert Decimal to number for calculations
 */
export function toNumber(value: Decimal | number | null | undefined): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === "number") return value;
  return parseFloat(value.toString());
}

/**
 * Check if user has accounting access (moderator or admin)
 */
export function hasAccountingAccess(role: string | null | undefined): boolean {
  if (!role) return false;
  const normalizedRole = role.toLowerCase();
  return ["admin", "superadmin", "moderator"].includes(normalizedRole);
}

// ==========================================
// INITIALIZATION & SEEDING
// ==========================================

/**
 * Initialize accounting module with default data
 */
export async function initializeAccounting(): Promise<{
  currenciesCreated: number;
  accountsCreated: number;
  settingsCreated: boolean;
}> {
  let currenciesCreated = 0;
  let accountsCreated = 0;
  let settingsCreated = false;

  // Check if already initialized
  const existingAccounts = await prisma.chartOfAccount.count();
  if (existingAccounts > 0) {
    return { currenciesCreated: 0, accountsCreated: 0, settingsCreated: false };
  }

  // Import default data
  const { DEFAULT_ACCOUNTS, DEFAULT_CURRENCIES } = await import(
    "@/types/accounting"
  );

  // Create default currencies
  for (const currency of DEFAULT_CURRENCIES) {
    try {
      await prisma.currency.create({
        data: {
          code: currency.code,
          name: currency.name,
          symbol: currency.symbol,
          exchangeRate: 1,
          isBase: currency.isBase,
          isActive: true,
          decimalPlaces: currency.decimalPlaces,
        },
      });
      currenciesCreated++;
    } catch (e) {
      // Skip if already exists
    }
  }

  // Get base currency
  const baseCurrency = await prisma.currency.findFirst({
    where: { isBase: true },
  });

  // Create default accounts
  for (let i = 0; i < DEFAULT_ACCOUNTS.length; i++) {
    const account = DEFAULT_ACCOUNTS[i];
    try {
      await prisma.chartOfAccount.create({
        data: {
          code: account.code,
          name: account.name,
          description: account.description,
          category: account.category,
          subCategory: account.subCategory,
          normalBalance: account.normalBalance,
          isSystemAccount: account.isSystemAccount,
          isActive: true,
          displayOrder: i * 10,
          currencyId: baseCurrency?.id,
        },
      });
      accountsCreated++;
    } catch (e) {
      // Skip if already exists
    }
  }

  // Create accounting settings if not exists
  const existingSettings = await prisma.accountingSettings.findFirst();
  if (!existingSettings) {
    // Get default accounts
    const receivablesAccount = await prisma.chartOfAccount.findFirst({
      where: { code: "1100" },
    });
    const payablesAccount = await prisma.chartOfAccount.findFirst({
      where: { code: "2000" },
    });
    const cashAccount = await prisma.chartOfAccount.findFirst({
      where: { code: "1000" },
    });
    const revenueAccount = await prisma.chartOfAccount.findFirst({
      where: { code: "4000" },
    });
    const expenseAccount = await prisma.chartOfAccount.findFirst({
      where: { code: "5000" },
    });

    await prisma.accountingSettings.create({
      data: {
        fiscalYearStart: 1, // January
        baseCurrencyId: baseCurrency?.id,
        defaultReceivablesAccountId: receivablesAccount?.id,
        defaultPayablesAccountId: payablesAccount?.id,
        defaultCashAccountId: cashAccount?.id,
        defaultRevenueAccountId: revenueAccount?.id,
        defaultExpenseAccountId: expenseAccount?.id,
        autoGenerateJournalEntries: true,
        requireApproval: false,
        allowBackdatedEntries: true,
      },
    });
    settingsCreated = true;
  }

  return { currenciesCreated, accountsCreated, settingsCreated };
}

// ==========================================
// CURRENCY OPERATIONS
// ==========================================

export async function getCurrencies(activeOnly = true) {
  return prisma.currency.findMany({
    where: activeOnly ? { isActive: true } : undefined,
    orderBy: [{ isBase: "desc" }, { code: "asc" }],
  });
}

export async function getCurrency(id: string) {
  return prisma.currency.findUnique({ where: { id } });
}

export async function updateExchangeRate(id: string, rate: number) {
  return prisma.currency.update({
    where: { id },
    data: { exchangeRate: rate },
  });
}

// ==========================================
// CHART OF ACCOUNTS OPERATIONS
// ==========================================

export async function getAccounts(
  filters?: AccountFilters
): Promise<ChartOfAccount[]> {
  const where: Record<string, unknown> = {};

  if (filters?.category) {
    where.category = filters.category;
  }
  if (filters?.subCategory) {
    where.subCategory = filters.subCategory;
  }
  if (filters?.isActive !== undefined) {
    where.isActive = filters.isActive;
  }
  if (filters?.parentId) {
    where.parentId = filters.parentId;
  }
  if (filters?.search) {
    where.OR = [
      { code: { contains: filters.search, mode: "insensitive" } },
      { name: { contains: filters.search, mode: "insensitive" } },
    ];
  }

  const accounts = await prisma.chartOfAccount.findMany({
    where,
    include: {
      parent: true,
      children: true,
      currency: true,
    },
    orderBy: [{ category: "asc" }, { code: "asc" }],
  });

  return accounts.map((a) => ({
    ...a,
    openingBalance: toNumber(a.openingBalance),
    currentBalance: toNumber(a.currentBalance),
  })) as unknown as ChartOfAccount[];
}

export async function getAccountsHierarchy(): Promise<
  ChartOfAccountWithHierarchy[]
> {
  const accounts = await getAccounts({ isActive: true });

  // Build hierarchy
  const accountMap = new Map<string, ChartOfAccountWithHierarchy>();
  const rootAccounts: ChartOfAccountWithHierarchy[] = [];

  // First pass: create map with all accounts
  for (const account of accounts) {
    accountMap.set(account.id, { ...account, children: [], level: 0 });
  }

  // Second pass: build tree
  for (const account of accountMap.values()) {
    if (account.parentId && accountMap.has(account.parentId)) {
      const parent = accountMap.get(account.parentId)!;
      account.level = parent.level + 1;
      parent.children.push(account);
    } else {
      rootAccounts.push(account);
    }
  }

  return rootAccounts;
}

export async function getAccount(id: string): Promise<ChartOfAccount | null> {
  const account = await prisma.chartOfAccount.findUnique({
    where: { id },
    include: {
      parent: true,
      children: true,
      currency: true,
    },
  });

  if (!account) return null;

  return {
    ...account,
    openingBalance: toNumber(account.openingBalance),
    currentBalance: toNumber(account.currentBalance),
  } as unknown as ChartOfAccount;
}

export async function createAccount(data: {
  code: string;
  name: string;
  description?: string;
  category: string;
  subCategory?: string;
  parentId?: string;
  currencyId?: string;
  normalBalance?: string;
  openingBalance?: number;
  displayOrder?: number;
}): Promise<ChartOfAccount> {
  const account = await prisma.chartOfAccount.create({
    data: {
      code: data.code,
      name: data.name,
      description: data.description,
      category: data.category,
      subCategory: data.subCategory,
      parentId: data.parentId,
      currencyId: data.currencyId,
      normalBalance: data.normalBalance || "debit",
      openingBalance: data.openingBalance || 0,
      currentBalance: data.openingBalance || 0,
      displayOrder: data.displayOrder || 0,
      isSystemAccount: false,
      isActive: true,
    },
    include: {
      parent: true,
      currency: true,
    },
  });

  return {
    ...account,
    openingBalance: toNumber(account.openingBalance),
    currentBalance: toNumber(account.currentBalance),
  } as ChartOfAccount;
}

export async function updateAccount(
  id: string,
  data: {
    name?: string;
    description?: string;
    subCategory?: string;
    parentId?: string;
    currencyId?: string;
    isActive?: boolean;
    displayOrder?: number;
  }
): Promise<ChartOfAccount> {
  // Don't allow changing code, category, or normalBalance of system accounts
  const existing = await prisma.chartOfAccount.findUnique({ where: { id } });
  if (existing?.isSystemAccount) {
    // Only allow certain fields for system accounts
    const { name, description, isActive, displayOrder } = data;
    const account = await prisma.chartOfAccount.update({
      where: { id },
      data: { name, description, isActive, displayOrder },
      include: { parent: true, currency: true },
    });
    return {
      ...account,
      openingBalance: toNumber(account.openingBalance),
      currentBalance: toNumber(account.currentBalance),
    } as ChartOfAccount;
  }

  const account = await prisma.chartOfAccount.update({
    where: { id },
    data,
    include: { parent: true, currency: true },
  });

  return {
    ...account,
    openingBalance: toNumber(account.openingBalance),
    currentBalance: toNumber(account.currentBalance),
  } as ChartOfAccount;
}

export async function updateAccountBalance(
  id: string,
  debitAmount: number,
  creditAmount: number
): Promise<void> {
  const account = await prisma.chartOfAccount.findUnique({ where: { id } });
  if (!account) throw new Error("Account not found");

  const currentBalance = toNumber(account.currentBalance);
  let newBalance: number;

  // Debit increases debit-normal accounts, decreases credit-normal accounts
  if (account.normalBalance === "debit") {
    newBalance = currentBalance + debitAmount - creditAmount;
  } else {
    newBalance = currentBalance + creditAmount - debitAmount;
  }

  await prisma.chartOfAccount.update({
    where: { id },
    data: { currentBalance: newBalance },
  });
}

// ==========================================
// ACCOUNTING PERIODS
// ==========================================

export async function getPeriods() {
  return prisma.accountingPeriod.findMany({
    orderBy: [{ startDate: "desc" }],
  });
}

export async function getCurrentPeriod() {
  const today = new Date();
  return prisma.accountingPeriod.findFirst({
    where: {
      startDate: { lte: today },
      endDate: { gte: today },
      isClosed: false,
    },
  });
}

export async function createPeriod(data: {
  name: string;
  periodType: string;
  startDate: Date;
  endDate: Date;
  notes?: string;
}) {
  return prisma.accountingPeriod.create({ data });
}

export async function closePeriod(id: string, userId: string) {
  return prisma.accountingPeriod.update({
    where: { id },
    data: {
      isClosed: true,
      closedAt: new Date(),
      closedById: userId,
    },
  });
}

// ==========================================
// JOURNAL ENTRIES
// ==========================================

export async function getJournalEntries(
  filters?: JournalEntryFilters,
  page = 1,
  limit = 20
): Promise<{ entries: JournalEntry[]; total: number }> {
  const where: Record<string, unknown> = {};

  if (filters?.status) {
    where.status = filters.status;
  }
  if (filters?.dateFrom || filters?.dateTo) {
    where.date = {};
    if (filters.dateFrom) {
      (where.date as Record<string, unknown>).gte = filters.dateFrom;
    }
    if (filters.dateTo) {
      (where.date as Record<string, unknown>).lte = filters.dateTo;
    }
  }
  if (filters?.accountId) {
    where.lines = {
      some: { accountId: filters.accountId },
    };
  }
  if (filters?.referenceType) {
    where.referenceType = filters.referenceType;
  }
  if (filters?.search) {
    where.OR = [
      { entryNumber: { contains: filters.search, mode: "insensitive" } },
      { description: { contains: filters.search, mode: "insensitive" } },
      { reference: { contains: filters.search, mode: "insensitive" } },
    ];
  }

  const [entries, total] = await Promise.all([
    prisma.journalEntry.findMany({
      where,
      include: {
        lines: {
          include: { account: true },
          orderBy: { lineOrder: "asc" },
        },
        period: true,
        currency: true,
      },
      orderBy: [{ date: "desc" }, { entryNumber: "desc" }],
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.journalEntry.count({ where }),
  ]);

  return {
    entries: entries.map((e) => ({
      ...e,
      exchangeRate: toNumber(e.exchangeRate),
      totalDebit: toNumber(e.totalDebit),
      totalCredit: toNumber(e.totalCredit),
      lines: e.lines.map((l) => ({
        ...l,
        debitAmount: toNumber(l.debitAmount),
        creditAmount: toNumber(l.creditAmount),
      })),
    })) as unknown as JournalEntry[],
    total,
  };
}

export async function getJournalEntry(
  id: string
): Promise<JournalEntry | null> {
  const entry = await prisma.journalEntry.findUnique({
    where: { id },
    include: {
      lines: {
        include: { account: true },
        orderBy: { lineOrder: "asc" },
      },
      period: true,
      currency: true,
    },
  });

  if (!entry) return null;

  return {
    ...entry,
    exchangeRate: toNumber(entry.exchangeRate),
    totalDebit: toNumber(entry.totalDebit),
    totalCredit: toNumber(entry.totalCredit),
    lines: entry.lines.map((l) => ({
      ...l,
      debitAmount: toNumber(l.debitAmount),
      creditAmount: toNumber(l.creditAmount),
    })),
  } as unknown as JournalEntry;
}

export async function createJournalEntry(
  data: JournalEntryFormData,
  createdById: string,
  autoApprove = false
): Promise<JournalEntry> {
  // Validate balanced entry
  const totalDebit = data.lines.reduce((sum, l) => sum + l.debitAmount, 0);
  const totalCredit = data.lines.reduce((sum, l) => sum + l.creditAmount, 0);

  if (Math.abs(totalDebit - totalCredit) > 0.01) {
    throw new Error(
      `Journal entry must be balanced. Debit: ${totalDebit}, Credit: ${totalCredit}`
    );
  }

  // Generate entry number
  const settings = await prisma.accountingSettings.findFirst();
  const prefix = settings?.entryNumberPrefix || "JE";
  const entryNumber = await generateSequentialNumber(
    prefix,
    "journal_entries",
    "entryNumber"
  );

  // Get current period if not specified
  let periodId = data.periodId;
  if (!periodId) {
    const currentPeriod = await getCurrentPeriod();
    periodId = currentPeriod?.id;
  }

  // Check if period is closed
  if (periodId) {
    const period = await prisma.accountingPeriod.findUnique({
      where: { id: periodId },
    });
    if (period?.isClosed) {
      throw new Error("Cannot create entries in a closed period");
    }
  }

  const entry = await prisma.journalEntry.create({
    data: {
      entryNumber,
      date: data.date,
      description: data.description,
      reference: data.reference,
      referenceType: data.referenceType,
      referenceId: data.referenceId,
      periodId,
      currencyId: data.currencyId,
      exchangeRate: data.exchangeRate || 1,
      status: autoApprove
        ? "approved"
        : settings?.requireApproval
        ? "pending"
        : "approved",
      totalDebit,
      totalCredit,
      createdById,
      approvedById: autoApprove ? createdById : undefined,
      approvedAt: autoApprove ? new Date() : undefined,
      notes: data.notes,
      lines: {
        create: data.lines.map((line, index) => ({
          accountId: line.accountId,
          description: line.description,
          debitAmount: line.debitAmount,
          creditAmount: line.creditAmount,
          lineOrder: index,
        })),
      },
    },
    include: {
      lines: { include: { account: true } },
      period: true,
      currency: true,
    },
  });

  // Update account balances if approved
  if (entry.status === "approved") {
    for (const line of entry.lines) {
      await updateAccountBalance(
        line.accountId,
        toNumber(line.debitAmount),
        toNumber(line.creditAmount)
      );
    }
  }

  return {
    ...entry,
    exchangeRate: toNumber(entry.exchangeRate),
    totalDebit: toNumber(entry.totalDebit),
    totalCredit: toNumber(entry.totalCredit),
    lines: entry.lines.map((l) => ({
      ...l,
      debitAmount: toNumber(l.debitAmount),
      creditAmount: toNumber(l.creditAmount),
    })),
  } as unknown as JournalEntry;
}

export async function approveJournalEntry(
  id: string,
  approvedById: string
): Promise<JournalEntry> {
  const entry = await prisma.journalEntry.findUnique({
    where: { id },
    include: { lines: true },
  });

  if (!entry) throw new Error("Journal entry not found");
  if (entry.status !== "pending" && entry.status !== "draft") {
    throw new Error("Entry is not in pending/draft status");
  }

  const updated = await prisma.journalEntry.update({
    where: { id },
    data: {
      status: "approved",
      approvedById,
      approvedAt: new Date(),
    },
    include: {
      lines: { include: { account: true } },
      period: true,
      currency: true,
    },
  });

  // Update account balances
  for (const line of updated.lines) {
    await updateAccountBalance(
      line.accountId,
      toNumber(line.debitAmount),
      toNumber(line.creditAmount)
    );
  }

  return {
    ...updated,
    exchangeRate: toNumber(updated.exchangeRate),
    totalDebit: toNumber(updated.totalDebit),
    totalCredit: toNumber(updated.totalCredit),
    lines: updated.lines.map((l) => ({
      ...l,
      debitAmount: toNumber(l.debitAmount),
      creditAmount: toNumber(l.creditAmount),
    })),
  } as unknown as JournalEntry;
}

export async function reverseJournalEntry(
  id: string,
  createdById: string,
  reason?: string
): Promise<JournalEntry> {
  const original = await getJournalEntry(id);
  if (!original) throw new Error("Journal entry not found");
  if (original.status !== "approved") {
    throw new Error("Can only reverse approved entries");
  }
  if (original.isReversed) {
    throw new Error("Entry has already been reversed");
  }

  // Create reversal entry (swap debits and credits)
  const reversalEntry = await createJournalEntry(
    {
      date: new Date(),
      description: `Reversal of ${original.entryNumber}: ${
        reason || original.description
      }`,
      reference: original.entryNumber,
      referenceType: "reversal",
      referenceId: original.id,
      currencyId: original.currencyId ?? undefined,
      exchangeRate: original.exchangeRate,
      notes: reason,
      lines: original.lines!.map((l) => ({
        accountId: l.accountId,
        description: `Reversal: ${l.description || ""}`,
        debitAmount: l.creditAmount, // Swap
        creditAmount: l.debitAmount, // Swap
      })),
    },
    createdById,
    true // Auto-approve reversals
  );

  // Mark original as reversed
  await prisma.journalEntry.update({
    where: { id },
    data: {
      isReversed: true,
      reversedEntryId: reversalEntry.id,
    },
  });

  // Update reversal entry with original reference
  await prisma.journalEntry.update({
    where: { id: reversalEntry.id },
    data: { originalEntryId: id },
  });

  return reversalEntry;
}

// ==========================================
// INVOICE PAYMENTS
// ==========================================

export async function getPayments(
  filters?: PaymentFilters,
  page = 1,
  limit = 20
) {
  const where: Record<string, unknown> = {};

  if (filters?.invoiceType) {
    where.invoiceType = filters.invoiceType;
  }
  if (filters?.paymentMethod) {
    where.paymentMethod = filters.paymentMethod;
  }
  if (filters?.status) {
    where.status = filters.status;
  }
  if (filters?.dateFrom || filters?.dateTo) {
    where.paymentDate = {};
    if (filters.dateFrom) {
      (where.paymentDate as Record<string, unknown>).gte = filters.dateFrom;
    }
    if (filters.dateTo) {
      (where.paymentDate as Record<string, unknown>).lte = filters.dateTo;
    }
  }
  if (filters?.search) {
    where.OR = [
      { paymentNumber: { contains: filters.search, mode: "insensitive" } },
      { reference: { contains: filters.search, mode: "insensitive" } },
    ];
  }

  const [payments, total] = await Promise.all([
    prisma.invoicePayment.findMany({
      where,
      include: { currency: true },
      orderBy: [{ paymentDate: "desc" }, { paymentNumber: "desc" }],
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.invoicePayment.count({ where }),
  ]);

  return {
    payments: payments.map((p) => ({
      ...p,
      amount: toNumber(p.amount),
      exchangeRate: toNumber(p.exchangeRate),
      amountInBase: toNumber(p.amountInBase),
    })),
    total,
  };
}

export async function recordPayment(
  data: InvoicePaymentFormData,
  createdById: string
): Promise<{ payment: unknown; journalEntry?: JournalEntry }> {
  const settings = await prisma.accountingSettings.findFirst();

  // Generate payment number
  const prefix = settings?.paymentNumberPrefix || "PAY";
  const paymentNumber = await generateSequentialNumber(
    prefix,
    "invoice_payments",
    "paymentNumber"
  );

  // Get exchange rate
  const exchangeRate = data.exchangeRate || 1;
  const amountInBase = data.amount * exchangeRate;

  // Create payment
  const payment = await prisma.invoicePayment.create({
    data: {
      paymentNumber,
      invoiceId: data.invoiceId,
      invoiceType: data.invoiceType,
      paymentDate: data.paymentDate,
      amount: data.amount,
      currencyId: data.currencyId,
      exchangeRate,
      amountInBase,
      paymentMethod: data.paymentMethod,
      reference: data.reference,
      bankAccountId: data.bankAccountId,
      status: "completed",
      notes: data.notes,
      createdById,
    },
    include: { currency: true },
  });

  // Update invoice payment status
  if (data.invoiceType === "generated") {
    const invoice = await prisma.generatedInvoice.findUnique({
      where: { id: data.invoiceId },
    });

    if (invoice) {
      const totalAmount = toNumber(invoice.totalAmount);
      const newPaidAmount = toNumber(invoice.paidAmount) + amountInBase;
      const newStatus = newPaidAmount >= totalAmount ? "paid" : "partial";

      await prisma.generatedInvoice.update({
        where: { id: data.invoiceId },
        data: {
          paidAmount: newPaidAmount,
          paymentStatus: newStatus,
        },
      });
    }
  } else if (data.invoiceType === "inventory") {
    const invoice = await prisma.inventoryInvoice.findUnique({
      where: { id: data.invoiceId },
    });

    if (invoice && invoice.totalCost) {
      const totalCost = toNumber(invoice.totalCost);
      const newPaidAmount = toNumber(invoice.paidAmount) + amountInBase;
      const newStatus = newPaidAmount >= totalCost ? "paid" : "partial";

      await prisma.inventoryInvoice.update({
        where: { id: data.invoiceId },
        data: {
          paidAmount: newPaidAmount,
          paymentStatus: newStatus,
        },
      });
    }
  }

  // Auto-generate journal entry if enabled
  let journalEntry: JournalEntry | undefined;
  if (settings?.autoGenerateJournalEntries) {
    const cashAccountId = data.bankAccountId || settings.defaultCashAccountId;
    const receivablesAccountId =
      data.invoiceType === "generated"
        ? settings.defaultReceivablesAccountId
        : settings.defaultPayablesAccountId;

    if (cashAccountId && receivablesAccountId) {
      journalEntry = await createJournalEntry(
        {
          date: data.paymentDate,
          description: `Payment received: ${paymentNumber}`,
          reference: paymentNumber,
          referenceType: "invoice_payment",
          referenceId: payment.id,
          currencyId: data.currencyId,
          exchangeRate,
          lines:
            data.invoiceType === "generated"
              ? [
                  // Debit Cash, Credit Accounts Receivable
                  {
                    accountId: cashAccountId,
                    description: "Cash received",
                    debitAmount: amountInBase,
                    creditAmount: 0,
                  },
                  {
                    accountId: receivablesAccountId,
                    description: "Reduce receivables",
                    debitAmount: 0,
                    creditAmount: amountInBase,
                  },
                ]
              : [
                  // Debit Accounts Payable, Credit Cash
                  {
                    accountId: receivablesAccountId,
                    description: "Reduce payables",
                    debitAmount: amountInBase,
                    creditAmount: 0,
                  },
                  {
                    accountId: cashAccountId,
                    description: "Cash paid",
                    debitAmount: 0,
                    creditAmount: amountInBase,
                  },
                ],
        },
        createdById,
        true // Auto-approve
      );

      // Link journal entry to payment
      await prisma.invoicePayment.update({
        where: { id: payment.id },
        data: { journalEntryId: journalEntry.id },
      });
    }
  }

  return {
    payment: {
      ...payment,
      amount: toNumber(payment.amount),
      exchangeRate: toNumber(payment.exchangeRate),
      amountInBase: toNumber(payment.amountInBase),
    },
    journalEntry,
  };
}

// ==========================================
// FINANCIAL REPORTS
// ==========================================

export async function getAccountLedger(
  accountId: string,
  params?: ReportParams
): Promise<AccountLedger> {
  const account = await getAccount(accountId);
  if (!account) throw new Error("Account not found");

  const where: Record<string, unknown> = {
    accountId,
    journalEntry: { status: "approved" },
  };

  if (params?.startDate || params?.endDate) {
    where.journalEntry = {
      ...(where.journalEntry as object),
      date: {},
    };
    if (params.startDate) {
      (
        (where.journalEntry as Record<string, unknown>).date as Record<
          string,
          unknown
        >
      ).gte = params.startDate;
    }
    if (params.endDate) {
      (
        (where.journalEntry as Record<string, unknown>).date as Record<
          string,
          unknown
        >
      ).lte = params.endDate;
    }
  }

  const lines = await prisma.journalEntryLine.findMany({
    where,
    include: {
      journalEntry: true,
    },
    orderBy: [
      { journalEntry: { date: "asc" } },
      { journalEntry: { entryNumber: "asc" } },
    ],
  });

  // Calculate running balance
  let runningBalance = account.openingBalance;
  const entries: LedgerEntry[] = lines.map((line) => {
    const debit = toNumber(line.debitAmount);
    const credit = toNumber(line.creditAmount);

    if (account.normalBalance === "debit") {
      runningBalance += debit - credit;
    } else {
      runningBalance += credit - debit;
    }

    return {
      id: line.id,
      date: line.journalEntry.date,
      entryNumber: line.journalEntry.entryNumber,
      description: line.description || line.journalEntry.description,
      reference: line.journalEntry.reference || undefined,
      debit,
      credit,
      runningBalance,
    };
  });

  const totalDebits = entries.reduce((sum, e) => sum + e.debit, 0);
  const totalCredits = entries.reduce((sum, e) => sum + e.credit, 0);

  return {
    account,
    entries,
    openingBalance: account.openingBalance,
    totalDebits,
    totalCredits,
    closingBalance: runningBalance,
    period:
      params?.startDate && params?.endDate
        ? { startDate: params.startDate, endDate: params.endDate }
        : undefined,
  };
}

export async function generateTrialBalance(
  asOfDate?: Date
): Promise<TrialBalance> {
  const date = asOfDate || new Date();

  const accounts = await prisma.chartOfAccount.findMany({
    where: { isActive: true },
    orderBy: [{ category: "asc" }, { code: "asc" }],
  });

  const rows: TrialBalanceRow[] = [];
  let totalDebits = 0;
  let totalCredits = 0;

  for (const account of accounts) {
    // Get sum of all approved journal entry lines up to the date
    const result = await prisma.journalEntryLine.aggregate({
      where: {
        accountId: account.id,
        journalEntry: {
          status: "approved",
          date: { lte: date },
        },
      },
      _sum: {
        debitAmount: true,
        creditAmount: true,
      },
    });

    const sumDebit = toNumber(result._sum.debitAmount);
    const sumCredit = toNumber(result._sum.creditAmount);
    const opening = toNumber(account.openingBalance);

    let balance: number;
    if (account.normalBalance === "debit") {
      balance = opening + sumDebit - sumCredit;
    } else {
      balance = opening + sumCredit - sumDebit;
    }

    // Skip zero balances unless requested
    if (Math.abs(balance) < 0.01) continue;

    const debitBalance = account.normalBalance === "debit" ? balance : 0;
    const creditBalance = account.normalBalance === "credit" ? balance : 0;

    rows.push({
      accountId: account.id,
      accountCode: account.code,
      accountName: account.name,
      category: account.category as AccountCategoryType,
      debitBalance: debitBalance > 0 ? debitBalance : 0,
      creditBalance: creditBalance > 0 ? creditBalance : 0,
    });

    totalDebits += debitBalance > 0 ? debitBalance : 0;
    totalCredits += creditBalance > 0 ? creditBalance : 0;
  }

  return {
    asOfDate: date,
    rows,
    totalDebits,
    totalCredits,
    isBalanced: Math.abs(totalDebits - totalCredits) < 0.01,
  };
}

export async function generateIncomeStatement(
  startDate: Date,
  endDate: Date
): Promise<IncomeStatement> {
  // Get revenue accounts
  const revenueAccounts = await prisma.chartOfAccount.findMany({
    where: { category: "Revenue", isActive: true },
    orderBy: { code: "asc" },
  });

  // Get expense accounts
  const expenseAccounts = await prisma.chartOfAccount.findMany({
    where: { category: "Expense", isActive: true },
    orderBy: { code: "asc" },
  });

  const revenueItems: {
    accountId: string;
    accountCode: string;
    accountName: string;
    subCategory?: string;
    amount: number;
  }[] = [];
  const expenseItems: {
    accountId: string;
    accountCode: string;
    accountName: string;
    subCategory?: string;
    amount: number;
  }[] = [];

  // Calculate revenue
  for (const account of revenueAccounts) {
    const result = await prisma.journalEntryLine.aggregate({
      where: {
        accountId: account.id,
        journalEntry: {
          status: "approved",
          date: { gte: startDate, lte: endDate },
        },
      },
      _sum: {
        debitAmount: true,
        creditAmount: true,
      },
    });

    const amount =
      toNumber(result._sum.creditAmount) - toNumber(result._sum.debitAmount);
    if (Math.abs(amount) > 0.01) {
      revenueItems.push({
        accountId: account.id,
        accountCode: account.code,
        accountName: account.name,
        subCategory: account.subCategory || undefined,
        amount,
      });
    }
  }

  // Calculate expenses
  for (const account of expenseAccounts) {
    const result = await prisma.journalEntryLine.aggregate({
      where: {
        accountId: account.id,
        journalEntry: {
          status: "approved",
          date: { gte: startDate, lte: endDate },
        },
      },
      _sum: {
        debitAmount: true,
        creditAmount: true,
      },
    });

    const amount =
      toNumber(result._sum.debitAmount) - toNumber(result._sum.creditAmount);
    if (Math.abs(amount) > 0.01) {
      expenseItems.push({
        accountId: account.id,
        accountCode: account.code,
        accountName: account.name,
        subCategory: account.subCategory || undefined,
        amount,
      });
    }
  }

  const totalRevenue = revenueItems.reduce((sum, i) => sum + i.amount, 0);
  const totalExpenses = expenseItems.reduce((sum, i) => sum + i.amount, 0);

  return {
    periodStart: startDate,
    periodEnd: endDate,
    revenue: {
      items: revenueItems,
      total: totalRevenue,
    },
    expenses: {
      items: expenseItems,
      total: totalExpenses,
    },
    netIncome: totalRevenue - totalExpenses,
  };
}

export async function generateBalanceSheet(
  asOfDate?: Date
): Promise<BalanceSheet> {
  const date = asOfDate || new Date();

  // Helper to get account balances
  async function getAccountBalance(
    accountId: string,
    normalBalance: string
  ): Promise<number> {
    const account = await prisma.chartOfAccount.findUnique({
      where: { id: accountId },
    });
    if (!account) return 0;

    const result = await prisma.journalEntryLine.aggregate({
      where: {
        accountId,
        journalEntry: {
          status: "approved",
          date: { lte: date },
        },
      },
      _sum: {
        debitAmount: true,
        creditAmount: true,
      },
    });

    const sumDebit = toNumber(result._sum.debitAmount);
    const sumCredit = toNumber(result._sum.creditAmount);
    const opening = toNumber(account.openingBalance);

    if (normalBalance === "debit") {
      return opening + sumDebit - sumCredit;
    } else {
      return opening + sumCredit - sumDebit;
    }
  }

  // Get all accounts grouped by category
  const allAccounts = await prisma.chartOfAccount.findMany({
    where: { isActive: true },
    orderBy: [{ category: "asc" }, { code: "asc" }],
  });

  const assets = {
    current: [] as {
      accountId: string;
      accountCode: string;
      accountName: string;
      subCategory?: string;
      amount: number;
    }[],
    fixed: [] as {
      accountId: string;
      accountCode: string;
      accountName: string;
      subCategory?: string;
      amount: number;
    }[],
    other: [] as {
      accountId: string;
      accountCode: string;
      accountName: string;
      subCategory?: string;
      amount: number;
    }[],
    totalCurrent: 0,
    totalFixed: 0,
    totalOther: 0,
    total: 0,
  };

  const liabilities = {
    current: [] as {
      accountId: string;
      accountCode: string;
      accountName: string;
      subCategory?: string;
      amount: number;
    }[],
    longTerm: [] as {
      accountId: string;
      accountCode: string;
      accountName: string;
      subCategory?: string;
      amount: number;
    }[],
    totalCurrent: 0,
    totalLongTerm: 0,
    total: 0,
  };

  const equity = {
    items: [] as {
      accountId: string;
      accountCode: string;
      accountName: string;
      subCategory?: string;
      amount: number;
    }[],
    retainedEarnings: 0,
    total: 0,
  };

  for (const account of allAccounts) {
    const balance = await getAccountBalance(account.id, account.normalBalance);
    if (Math.abs(balance) < 0.01) continue;

    const item = {
      accountId: account.id,
      accountCode: account.code,
      accountName: account.name,
      subCategory: account.subCategory || undefined,
      amount: balance,
    };

    switch (account.category) {
      case "Asset":
        if (account.subCategory === "Current Asset") {
          assets.current.push(item);
          assets.totalCurrent += balance;
        } else if (account.subCategory === "Fixed Asset") {
          assets.fixed.push(item);
          assets.totalFixed += balance;
        } else {
          assets.other.push(item);
          assets.totalOther += balance;
        }
        assets.total += balance;
        break;

      case "Liability":
        if (account.subCategory === "Current Liability") {
          liabilities.current.push(item);
          liabilities.totalCurrent += balance;
        } else {
          liabilities.longTerm.push(item);
          liabilities.totalLongTerm += balance;
        }
        liabilities.total += balance;
        break;

      case "Equity":
        equity.items.push(item);
        equity.total += balance;
        break;
    }
  }

  // Calculate retained earnings (Revenue - Expenses up to date)
  const incomeStatement = await generateIncomeStatement(
    new Date(0), // From beginning
    date
  );
  equity.retainedEarnings = incomeStatement.netIncome;
  equity.total += equity.retainedEarnings;

  const totalLiabilitiesAndEquity = liabilities.total + equity.total;

  return {
    asOfDate: date,
    assets,
    liabilities,
    equity,
    totalLiabilitiesAndEquity,
    isBalanced: Math.abs(assets.total - totalLiabilitiesAndEquity) < 0.01,
  };
}

// ==========================================
// DASHBOARD SUMMARY
// ==========================================

export async function getAccountingSummary(): Promise<AccountingSummary> {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfYear = new Date(now.getFullYear(), 0, 1);

  const settings = await prisma.accountingSettings.findFirst();

  // Get account balances
  let totalReceivables = 0;
  let totalPayables = 0;
  let cashBalance = 0;

  if (settings?.defaultReceivablesAccountId) {
    const account = await getAccount(settings.defaultReceivablesAccountId);
    totalReceivables = account?.currentBalance || 0;
  }

  if (settings?.defaultPayablesAccountId) {
    const account = await getAccount(settings.defaultPayablesAccountId);
    totalPayables = account?.currentBalance || 0;
  }

  if (settings?.defaultCashAccountId) {
    const account = await getAccount(settings.defaultCashAccountId);
    cashBalance = account?.currentBalance || 0;
  }

  // Get income statements
  const incomeThisMonth = await generateIncomeStatement(startOfMonth, now);
  const incomeThisYear = await generateIncomeStatement(startOfYear, now);

  // Get balance sheet for totals
  const balanceSheet = await generateBalanceSheet(now);

  // Get unpaid invoices
  const unpaidInvoices = await prisma.generatedInvoice.findMany({
    where: { paymentStatus: { in: ["unpaid", "partial"] } },
  });

  const unpaidInvoicesCount = unpaidInvoices.length;
  const unpaidInvoicesAmount = unpaidInvoices.reduce(
    (sum, inv) => sum + toNumber(inv.totalAmount) - toNumber(inv.paidAmount),
    0
  );

  // Get pending payments
  const pendingPaymentsCount = await prisma.invoicePayment.count({
    where: { status: "pending" },
  });

  // Get pending journal entries count
  const pendingEntriesCount = await prisma.journalEntry.count({
    where: { status: { in: ["draft", "pending"] } },
  });

  // Get current accounting period
  const currentPeriod = await prisma.accountingPeriod.findFirst({
    where: {
      isClosed: false,
      startDate: { lte: now },
      endDate: { gte: now },
    },
    orderBy: { startDate: "desc" },
  });

  // Get recent entries
  const { entries: recentEntries } = await getJournalEntries({}, 1, 5);

  // Get recent payments
  const { payments: recentPayments } = await getPayments({}, 1, 5);

  return {
    // Balance Sheet Totals
    totalAssets: balanceSheet.assets.total,
    totalLiabilities: balanceSheet.liabilities.total,
    totalEquity: balanceSheet.equity.total,
    // Income Statement Totals (current month)
    totalRevenue: incomeThisMonth.revenue.total,
    totalExpenses: incomeThisMonth.expenses.total,
    netIncome: incomeThisMonth.netIncome,
    // Receivables & Payables
    totalReceivables,
    totalPayables,
    cashBalance,
    // Period Comparisons
    revenueThisMonth: incomeThisMonth.revenue.total,
    revenueThisYear: incomeThisYear.revenue.total,
    expensesThisMonth: incomeThisMonth.expenses.total,
    expensesThisYear: incomeThisYear.expenses.total,
    netIncomeThisMonth: incomeThisMonth.netIncome,
    netIncomeThisYear: incomeThisYear.netIncome,
    // Counts & Status
    unpaidInvoices: unpaidInvoicesCount,
    unpaidInvoicesCount,
    unpaidInvoicesAmount,
    pendingEntries: pendingEntriesCount,
    pendingPaymentsCount,
    // Current Period
    currentPeriod:
      currentPeriod as unknown as AccountingSummary["currentPeriod"],
    // Recent Activity
    recentEntries,
    recentPayments:
      recentPayments as unknown as AccountingSummary["recentPayments"],
  };
}

// ==========================================
// ACCOUNTING SETTINGS
// ==========================================

export async function getAccountingSettings() {
  let settings = await prisma.accountingSettings.findFirst({
    include: {
      defaultReceivablesAccount: true,
      defaultPayablesAccount: true,
      defaultCashAccount: true,
      defaultRevenueAccount: true,
      defaultExpenseAccount: true,
    },
  });

  if (!settings) {
    // Initialize if not exists
    await initializeAccounting();
    settings = await prisma.accountingSettings.findFirst({
      include: {
        defaultReceivablesAccount: true,
        defaultPayablesAccount: true,
        defaultCashAccount: true,
        defaultRevenueAccount: true,
        defaultExpenseAccount: true,
      },
    });
  }

  return settings;
}

export async function updateAccountingSettings(data: {
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
}) {
  const existing = await prisma.accountingSettings.findFirst();

  if (existing) {
    return prisma.accountingSettings.update({
      where: { id: existing.id },
      data,
      include: {
        defaultReceivablesAccount: true,
        defaultPayablesAccount: true,
        defaultCashAccount: true,
        defaultRevenueAccount: true,
        defaultExpenseAccount: true,
      },
    });
  } else {
    return prisma.accountingSettings.create({
      data: {
        ...data,
        fiscalYearStart: data.fiscalYearStart || 1,
      },
      include: {
        defaultReceivablesAccount: true,
        defaultPayablesAccount: true,
        defaultCashAccount: true,
        defaultRevenueAccount: true,
        defaultExpenseAccount: true,
      },
    });
  }
}
