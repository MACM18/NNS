import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { encrypt } from "@/lib/encryption";
import type { ReceivableAgingBucket } from "@/types/accounting";

type Tx = Prisma.TransactionClient;
type DecimalInput = number | Prisma.Decimal;

function toNumber(value: DecimalInput | null | undefined): number {
  if (value === null || value === undefined) return 0;
  return typeof value === "number" ? value : Number(value.toString());
}

export type ReportBasis = "accrual" | "cash";

export interface JournalLineInput {
  accountId: string;
  description?: string;
  debitAmount: DecimalInput;
  creditAmount: DecimalInput;
}

export interface OpeningBalanceInput {
  financialYearId: string;
  lines: JournalLineInput[];
  receivables?: Array<{ invoiceId: string; amount: number; invoiceNumber?: string }>;
  createdById: string;
}

const DEFAULT_FISCAL_START_MONTH = 4;
const DEFAULT_FISCAL_START_DAY = 1;

function dateOnly(value: Date | string): Date {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error("Invalid accounting date");
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

export function getFinancialYearBounds(
  value: Date | string,
  fiscalStartMonth = DEFAULT_FISCAL_START_MONTH,
  fiscalStartDay = DEFAULT_FISCAL_START_DAY,
) {
  const current = dateOnly(value);
  const year = current.getUTCFullYear();
  const thisYearStart = new Date(Date.UTC(year, fiscalStartMonth - 1, fiscalStartDay));
  const startYear = current >= thisYearStart ? year : year - 1;
  const startDate = new Date(Date.UTC(startYear, fiscalStartMonth - 1, fiscalStartDay));
  const endDate = new Date(Date.UTC(startYear + 1, fiscalStartMonth - 1, fiscalStartDay - 1));
  return { startDate, endDate, yearOfAssessment: startYear + "/" + (startYear + 1) };
}

async function getFiscalSettings(tx: Tx = prisma as unknown as Tx) {
  const settings = await tx.accountingSettings.findFirst();
  const startMonth = settings?.fiscalYearStart || DEFAULT_FISCAL_START_MONTH;
  const startDay = settings?.fiscalYearStartDay || DEFAULT_FISCAL_START_DAY;
  if (!Number.isInteger(startMonth) || startMonth < 1 || startMonth > 12 || !Number.isInteger(startDay) || startDay < 1 || startDay > 28) {
    throw new Error("Fiscal year start must use a valid month and day");
  }
  return {
    startMonth,
    startDay,
    settings,
  };
}

async function generateFinancialYearPeriods(tx: Tx, year: {
  id: string;
  name: string;
  startDate: Date;
  endDate: Date;
}) {
  const periods: Array<{
    name: string;
    periodType: string;
    startDate: Date;
    endDate: Date;
    financialYearId: string;
  }> = [];
  const monthStarts: Date[] = [];
  let cursor = dateOnly(year.startDate);
  while (cursor <= year.endDate) {
    monthStarts.push(cursor);
    cursor = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 1));
  }
  for (const start of monthStarts) {
    const next = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 1));
    const end = new Date(Math.min(next.getTime() - 86400000, year.endDate.getTime()));
    periods.push({
      name: start.toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" }),
      periodType: "monthly",
      startDate: start,
      endDate: end,
      financialYearId: year.id,
    });
  }
  for (let index = 0; index < monthStarts.length; index += 3) {
    const start = monthStarts[index];
    const afterQuarter = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 3, 1));
    periods.push({
      name: `Q${Math.floor(index / 3) + 1} ${year.name}`,
      periodType: "quarterly",
      startDate: start,
      endDate: new Date(Math.min(afterQuarter.getTime() - 86400000, year.endDate.getTime())),
      financialYearId: year.id,
    });
  }
  periods.push({
    name: year.name,
    periodType: "yearly",
    startDate: dateOnly(year.startDate),
    endDate: dateOnly(year.endDate),
    financialYearId: year.id,
  });
  await tx.accountingPeriod.createMany({ data: periods, skipDuplicates: true });
}

export async function ensureFinancialYear(tx: Tx, date: Date | string, createdById?: string) {
  const fiscal = await getFiscalSettings(tx);
  const bounds = getFinancialYearBounds(date, fiscal.startMonth, fiscal.startDay);
  const where = {
    startDate_endDate: { startDate: bounds.startDate, endDate: bounds.endDate },
  };
  const existing = await tx.financialYear.findUnique({ where });
  if (existing) return existing;
  try {
    const created = await tx.financialYear.create({
      data: {
        name: "FY " + bounds.yearOfAssessment,
        yearOfAssessment: bounds.yearOfAssessment,
        startDate: bounds.startDate,
        endDate: bounds.endDate,
        createdById,
      },
    });
    await generateFinancialYearPeriods(tx, created);
    return created;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return tx.financialYear.findUniqueOrThrow({ where });
    }
    throw error;
  }
}

async function nextSequence(
  tx: Tx,
  kind: "journal" | "payment",
  prefix: string,
  date: Date,
) {
  const fiscal = await getFiscalSettings(tx);
  const bounds = getFinancialYearBounds(date, fiscal.startMonth, fiscal.startDay);
  const key = kind + ":" + prefix + ":" + bounds.yearOfAssessment;
  const prefixStart = prefix + "-" + bounds.yearOfAssessment + "-";
  const last = kind === "journal"
    ? await tx.journalEntry.findFirst({
        where: { entryNumber: { startsWith: prefixStart } },
        orderBy: { entryNumber: "desc" },
        select: { entryNumber: true },
      })
    : await tx.invoicePayment.findFirst({
        where: { paymentNumber: { startsWith: prefixStart } },
        orderBy: { paymentNumber: "desc" },
        select: { paymentNumber: true },
      });
  const lastValue = last
    ? Number(String(kind === "journal" ? (last as any).entryNumber : (last as any).paymentNumber).split("-").pop())
    : 0;
  const existing = await tx.accountingSequence.findUnique({ where: { sequenceKey: key } });
  let sequence: number;
  if (!existing) {
    try {
      const created = await tx.accountingSequence.create({
        data: { sequenceKey: key, nextValue: Math.max(lastValue + 2, 2) },
      });
      sequence = created.nextValue - 1;
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") throw error;
      const updated = await tx.accountingSequence.update({
        where: { sequenceKey: key },
        data: { nextValue: { increment: 1 } },
      });
      sequence = updated.nextValue - 1;
    }
  } else {
    const updated = await tx.accountingSequence.update({
      where: { sequenceKey: key },
      data: { nextValue: { increment: 1 } },
    });
    sequence = updated.nextValue - 1;
  }
  return prefix + "-" + bounds.yearOfAssessment + "-" + String(sequence).padStart(4, "0");
}

function assertBalanced(lines: JournalLineInput[]) {
  if (lines.length < 2) throw new Error("A journal entry requires at least two lines");
  let debit = 0;
  let credit = 0;
  for (const line of lines) {
    const debitAmount = Number(line.debitAmount);
    const creditAmount = Number(line.creditAmount);
    if (!Number.isFinite(debitAmount) || !Number.isFinite(creditAmount) || debitAmount < 0 || creditAmount < 0) {
      throw new Error("Journal amounts must be finite, non-negative numbers");
    }
    if (debitAmount > 0 && creditAmount > 0) {
      throw new Error("A journal line cannot contain both debit and credit");
    }
    debit += debitAmount;
    credit += creditAmount;
  }
  if (debit <= 0 || Math.abs(debit - credit) > 0.01) {
    throw new Error("Journal entry must be balanced. Debit: " + debit + ", Credit: " + credit);
  }
  return { debit, credit };
}

export async function postJournalEntryTx(
  tx: Tx,
  input: {
    date: Date;
    description: string;
    reference?: string;
    referenceType?: string;
    referenceId?: string;
    financialYearId?: string;
    sourceKey?: string;
    currencyId?: string;
    exchangeRate?: number;
    lines: JournalLineInput[];
    createdById: string;
    notes?: string;
    autoApprove?: boolean;
    forcePending?: boolean;
  },
) {
  const totals = assertBalanced(input.lines);
  if (input.sourceKey) {
    const existing = await tx.journalEntry.findUnique({
      where: { sourceKey: input.sourceKey },
      include: { lines: { include: { account: true } } },
    });
    if (existing) return existing;
  }
  const fiscal = await getFiscalSettings(tx);
  const financialYear = input.financialYearId
    ? await tx.financialYear.findUniqueOrThrow({ where: { id: input.financialYearId } })
    : await ensureFinancialYear(tx, input.date, input.createdById);
  if (financialYear.isClosed || financialYear.status === "closed") {
    throw new Error("Cannot post into a closed financial year");
  }
  const accountIds = [...new Set(input.lines.map((line) => line.accountId))];
  const accounts = await tx.chartOfAccount.findMany({
    where: { id: { in: accountIds }, isActive: true },
  });
  if (accounts.length !== accountIds.length) {
    throw new Error("One or more journal accounts are missing or inactive");
  }
  const accountMap = new Map(accounts.map((account) => [account.id, account]));
  const entryNumber = await nextSequence(
    tx,
    "journal",
    fiscal.settings?.entryNumberPrefix || "JE",
    input.date,
  );
  const status = input.forcePending === true || (fiscal.settings?.requireApproval === true && input.autoApprove !== true)
    ? "pending"
    : "approved";
  const entry = await tx.journalEntry.create({
    data: {
      entryNumber,
      date: dateOnly(input.date),
      description: input.description,
      reference: input.reference,
      referenceType: input.referenceType,
      referenceId: input.referenceId,
      financialYearId: financialYear.id,
      currencyId: input.currencyId,
      exchangeRate: input.exchangeRate || 1,
      sourceKey: input.sourceKey,
      status,
      totalDebit: totals.debit,
      totalCredit: totals.credit,
      createdById: input.createdById,
      approvedById: status === "approved" ? input.createdById : undefined,
      approvedAt: status === "approved" ? new Date() : undefined,
      notes: input.notes,
      lines: {
        create: input.lines.map((line, index) => ({
          accountId: line.accountId,
          description: line.description,
          debitAmount: Number(line.debitAmount),
          creditAmount: Number(line.creditAmount),
          lineOrder: index,
        })),
      },
    },
    include: { lines: true, period: true, currency: true },
  });
  if (status === "approved") {
    for (const line of input.lines) {
      const account = accountMap.get(line.accountId)!;
      const delta = account.normalBalance === "debit"
        ? Number(line.debitAmount) - Number(line.creditAmount)
        : Number(line.creditAmount) - Number(line.debitAmount);
      await tx.chartOfAccount.update({
        where: { id: account.id },
        data: { currentBalance: { increment: delta } },
      });
    }
  }
  return entry;
}

export async function issueGeneratedInvoice(invoiceId: string, createdById: string) {
  return prisma.$transaction(async (tx) => {
    const invoice = await tx.generatedInvoice.findUnique({ where: { id: invoiceId } });
    if (!invoice) throw new Error("Invoice not found");
    if (invoice.accountingStatus === "posted") return invoice;
    const amount = toNumber(invoice.totalAmount);
    if (!Number.isFinite(amount) || amount <= 0) throw new Error("Invoice amount must be a positive number");
    const settings = (await getFiscalSettings(tx)).settings;
    if (!settings?.defaultReceivablesAccountId || !settings.defaultRevenueAccountId) {
      throw new Error("Configure receivables and service revenue accounts before issuing invoices");
    }
    const date = invoice.invoiceDate || invoice.createdAt;
    const financialYear = await ensureFinancialYear(tx, date, createdById);
    const entry = await postJournalEntryTx(tx, {
      date,
      description: "Service invoice " + invoice.invoiceNumber,
      reference: invoice.invoiceNumber,
      referenceType: "service_invoice",
      referenceId: invoice.id,
      financialYearId: financialYear.id,
      sourceKey: "service_invoice:" + invoice.id,
      createdById,
      autoApprove: true,
      lines: [
        { accountId: settings.defaultReceivablesAccountId, description: "Customer receivable", debitAmount: amount, creditAmount: 0 },
        { accountId: settings.defaultRevenueAccountId, description: "Service revenue", debitAmount: 0, creditAmount: amount },
      ],
    });
    return tx.generatedInvoice.update({
      where: { id: invoice.id },
      data: {
        accountingStatus: "posted",
        financialYearId: financialYear.id,
        postedJournalEntryId: entry.id,
        status: invoice.status || "issued",
      },
    });
  });
}

export async function createAndIssueGeneratedInvoice(input: {
  invoiceNumber: string;
  invoiceType?: string;
  month?: number;
  year?: number;
  jobMonth?: string;
  invoiceDate?: Date;
  totalAmount: number;
  lineCount?: number;
  lineDetailsIds?: Prisma.InputJsonValue;
  status?: string;
  createdById: string;
}) {
  if (!Number.isFinite(input.totalAmount) || input.totalAmount <= 0) {
    throw new Error("Invoice amount must be a positive number");
  }
  return prisma.$transaction(async (tx) => {
    const invoice = await tx.generatedInvoice.create({
      data: {
        invoiceNumber: input.invoiceNumber,
        invoiceType: input.invoiceType,
        month: input.month,
        year: input.year,
        jobMonth: input.jobMonth,
        invoiceDate: input.invoiceDate,
        totalAmount: input.totalAmount,
        lineCount: input.lineCount,
        lineDetailsIds: input.lineDetailsIds,
        status: input.status || "issued",
      },
    });
    const settings = (await getFiscalSettings(tx)).settings;
    if (!settings?.defaultReceivablesAccountId || !settings.defaultRevenueAccountId) {
      throw new Error("Configure receivables and service revenue accounts before creating invoices");
    }
    const date = invoice.invoiceDate || invoice.createdAt;
    const financialYear = await ensureFinancialYear(tx, date, input.createdById);
    const entry = await postJournalEntryTx(tx, {
      date,
      description: "Service invoice " + invoice.invoiceNumber,
      reference: invoice.invoiceNumber,
      referenceType: "service_invoice",
      referenceId: invoice.id,
      financialYearId: financialYear.id,
      sourceKey: "service_invoice:" + invoice.id,
      createdById: input.createdById,
      autoApprove: true,
      lines: [
        { accountId: settings.defaultReceivablesAccountId, description: "Customer receivable", debitAmount: input.totalAmount, creditAmount: 0 },
        { accountId: settings.defaultRevenueAccountId, description: "Service revenue", debitAmount: 0, creditAmount: input.totalAmount },
      ],
    });
    return tx.generatedInvoice.update({
      where: { id: invoice.id },
      data: {
        accountingStatus: "posted",
        financialYearId: financialYear.id,
        postedJournalEntryId: entry.id,
      },
    });
  });
}

export async function recordServicePayment(input: {
  invoiceId: string;
  amount: number;
  paymentDate: Date;
  paymentMethod: string;
  bankAccountId: string;
  reference?: string;
  notes?: string;
  currencyId?: string;
  exchangeRate?: number;
  createdById: string;
}) {
  if (!Number.isFinite(input.amount) || input.amount <= 0) throw new Error("Payment amount must be a positive number");
  if (!input.bankAccountId) throw new Error("A cash or bank account is required");
  return prisma.$transaction(async (tx) => {
    const invoice = await tx.generatedInvoice.findUnique({ where: { id: input.invoiceId } });
    if (!invoice) throw new Error("Service invoice not found");
    if (invoice.accountingStatus !== "posted") throw new Error("Invoice must be issued before recording payment");
    const exchangeRate = input.exchangeRate === undefined ? 1 : input.exchangeRate;
    if (!Number.isFinite(exchangeRate) || exchangeRate <= 0) throw new Error("Exchange rate must be a positive number");
    const amountInBase = input.amount * exchangeRate;
    const outstanding = toNumber(invoice.totalAmount) - toNumber(invoice.paidAmount);
    if (amountInBase > outstanding + 0.01) {
      throw new Error("Payment exceeds the outstanding invoice balance of " + outstanding.toFixed(2));
    }
    const settings = (await getFiscalSettings(tx)).settings;
    if (!settings?.defaultReceivablesAccountId) throw new Error("Configure the receivables account before recording payment");
    const cashAccount = await tx.chartOfAccount.findUnique({ where: { id: input.bankAccountId } });
    if (!cashAccount || !cashAccount.isActive || cashAccount.category !== "Asset") {
      throw new Error("Selected payment account is not an active asset account");
    }
    const financialYear = await ensureFinancialYear(tx, input.paymentDate, input.createdById);
    const paymentNumber = await nextSequence(tx, "payment", settings.paymentNumberPrefix || "PAY", input.paymentDate);
    const payment = await tx.invoicePayment.create({
      data: {
        paymentNumber,
        invoiceId: invoice.id,
        invoiceType: "generated",
        paymentDate: dateOnly(input.paymentDate),
        amount: input.amount,
        currencyId: input.currencyId,
        exchangeRate,
        amountInBase,
        paymentMethod: input.paymentMethod,
        reference: input.reference,
        bankAccountId: input.bankAccountId,
        status: "completed",
        notes: input.notes,
        createdById: input.createdById,
      },
    });
    const entry = await postJournalEntryTx(tx, {
      date: input.paymentDate,
      description: "Payment received: " + invoice.invoiceNumber,
      reference: paymentNumber,
      referenceType: "invoice_payment",
      referenceId: payment.id,
      financialYearId: financialYear.id,
      sourceKey: "invoice_payment:" + payment.id,
      currencyId: input.currencyId,
      exchangeRate,
      createdById: input.createdById,
      autoApprove: true,
      lines: [
        { accountId: input.bankAccountId, description: "Cash received", debitAmount: amountInBase, creditAmount: 0 },
        { accountId: settings.defaultReceivablesAccountId, description: "Receivable cleared", debitAmount: 0, creditAmount: amountInBase },
      ],
    });
    const paidAmount = toNumber(invoice.paidAmount) + amountInBase;
    const updatedInvoice = await tx.generatedInvoice.update({
      where: { id: invoice.id },
      data: {
        paidAmount,
        paymentStatus: paidAmount >= toNumber(invoice.totalAmount) - 0.01 ? "paid" : "partial",
      },
    });
    const linkedPayment = await tx.invoicePayment.update({
      where: { id: payment.id },
      data: { journalEntryId: entry.id },
    });
    return { payment: linkedPayment, invoice: updatedInvoice, journalEntry: entry };
  });
}

export async function createBusinessTransaction(input: {
  date: Date;
  amount: number;
  type: "income" | "expense" | "drawing" | "internal_transfer";
  category?: string;
  description: string;
  isDeductible?: boolean;
  partnerId?: string;
  paymentMethod?: string;
  cashAccountId: string;
  offsetAccountId: string;
  createdById: string;
  financialYearId?: string;
  autoApprove?: boolean;
  voucher?: {
    fileUrl: string;
    receiptNo?: string;
    payeeName?: string;
    payeeNic?: string;
  };
}) {
  if (input.amount <= 0) throw new Error("Transaction amount must be greater than zero");
  if (!Number.isFinite(input.amount)) throw new Error("Transaction amount must be a valid number");
  if (input.type === "expense" && input.isDeductible !== true) {
    throw new Error("Expense transactions must explicitly set deductibility");
  }
  if (input.type === "drawing" && !input.partnerId) throw new Error("A partner is required for drawings");
  return prisma.$transaction(async (tx) => {
    const financialYear = input.financialYearId
      ? await tx.financialYear.findUniqueOrThrow({ where: { id: input.financialYearId } })
      : await ensureFinancialYear(tx, input.date, input.createdById);
    const partner = input.partnerId
      ? await tx.partnershipPartner.findUnique({ where: { id: input.partnerId } })
      : null;
    if (input.type === "drawing" && !partner?.drawingsAccountId) {
      throw new Error("Configure the partner drawing/equity account before recording a drawing");
    }
    let debitAccountId = input.offsetAccountId;
    let creditAccountId = input.cashAccountId;
    if (input.type === "income") {
      debitAccountId = input.cashAccountId;
      creditAccountId = input.offsetAccountId;
    } else if (input.type === "drawing") {
      debitAccountId = partner!.drawingsAccountId!;
    }
    const transaction = await tx.businessTransaction.create({
      data: {
        financialYearId: financialYear.id,
        date: dateOnly(input.date),
        amount: input.amount,
        type: input.type,
        category: input.category,
        description: input.description,
        isDeductible: input.type === "expense" && input.isDeductible === true,
        partnerId: input.partnerId,
        paymentMethod: input.paymentMethod,
        cashAccountId: input.cashAccountId,
        offsetAccountId: input.offsetAccountId,
        status: input.autoApprove === false ? "pending" : "draft",
        createdById: input.createdById,
      },
    });
    if (input.voucher) {
      if (!input.voucher.fileUrl) throw new Error("Voucher file is required");
      await tx.voucher.create({
        data: {
          businessTransactionId: transaction.id,
          fileUrl: input.voucher.fileUrl,
          receiptNo: input.voucher.receiptNo,
          payeeName: input.voucher.payeeName,
          payeeNicEncrypted: input.voucher.payeeNic ? encrypt(input.voucher.payeeNic) : undefined,
          createdById: input.createdById,
        },
      });
    }
    if (input.type === "expense" && input.autoApprove !== false && !input.voucher?.fileUrl) {
      throw new Error("An expense must include a payment voucher before it can be posted");
    }
    const entry = await postJournalEntryTx(tx, {
      date: input.date,
      description: input.description,
      referenceType: "business_transaction",
      referenceId: transaction.id,
      financialYearId: financialYear.id,
      sourceKey: "business_transaction:" + transaction.id,
      createdById: input.createdById,
      autoApprove: input.autoApprove !== false,
      forcePending: input.autoApprove === false,
      lines: [
        { accountId: debitAccountId, description: input.description, debitAmount: input.amount, creditAmount: 0 },
        { accountId: creditAccountId, description: input.description, debitAmount: 0, creditAmount: input.amount },
      ],
    });
    return tx.businessTransaction.update({
      where: { id: transaction.id },
      data: { status: entry.status === "approved" ? "posted" : "pending", journalEntryId: entry.id },
    });
  });
}

export async function approveBusinessTransaction(id: string, approvedById: string) {
  return prisma.$transaction(async (tx) => {
    const transaction = await tx.businessTransaction.findUnique({
      where: { id },
      include: { journalEntry: { include: { lines: true } }, vouchers: true },
    });
    if (!transaction || !transaction.journalEntry) throw new Error("Business transaction not found");
    if (transaction.status !== "pending" && transaction.status !== "draft") {
      throw new Error("Business transaction is not awaiting approval");
    }
    if (transaction.type === "expense" && transaction.vouchers.length === 0) {
      throw new Error("An expense requires a payment voucher before approval");
    }
    const year = transaction.financialYearId
      ? await tx.financialYear.findUniqueOrThrow({ where: { id: transaction.financialYearId } })
      : null;
    if (year?.isClosed || year?.status === "closed") throw new Error("Cannot approve a transaction in a closed financial year");
    const accountIds = [...new Set(transaction.journalEntry.lines.map((line) => line.accountId))];
    const accounts = await tx.chartOfAccount.findMany({
      where: { id: { in: accountIds }, isActive: true },
    });
    if (accounts.length !== accountIds.length) throw new Error("One or more journal accounts are missing or inactive");
    const approvedEntry = await tx.journalEntry.update({
      where: { id: transaction.journalEntry.id },
      data: { status: "approved", approvedById, approvedAt: new Date() },
      include: { lines: true },
    });
    for (const line of approvedEntry.lines) {
      const account = accounts.find((item) => item.id === line.accountId)!;
      const delta = account.normalBalance === "debit"
        ? toNumber(line.debitAmount) - toNumber(line.creditAmount)
        : toNumber(line.creditAmount) - toNumber(line.debitAmount);
      await tx.chartOfAccount.update({ where: { id: account.id }, data: { currentBalance: { increment: delta } } });
    }
    return tx.businessTransaction.update({ where: { id }, data: { status: "posted" }, include: { journalEntry: true } });
  });
}

export async function getFinancialYears() {
  return prisma.financialYear.findMany({
    orderBy: { startDate: "desc" },
    include: { allocations: { include: { partner: true } } },
  });
}

export async function createFinancialYear(input: {
  name?: string;
  startDate: Date;
  endDate: Date;
  yearOfAssessment?: string;
  createdById: string;
}) {
  if (Number.isNaN(input.startDate.getTime()) || Number.isNaN(input.endDate.getTime())) {
    throw new Error("Financial-year dates must be valid");
  }
  if (input.endDate <= input.startDate) throw new Error("Financial-year end date must be after the start date");
  return prisma.$transaction(async (tx) => {
    const year = await tx.financialYear.create({
      data: {
        name: input.name || "FY " + input.startDate.getUTCFullYear() + "-" + input.endDate.getUTCFullYear(),
        startDate: dateOnly(input.startDate),
        endDate: dateOnly(input.endDate),
        yearOfAssessment: input.yearOfAssessment,
        createdById: input.createdById,
      },
    });
    await generateFinancialYearPeriods(tx, year);
    const father = await tx.partnershipPartner.upsert({
      where: { code: "FATHER" },
      create: { code: "FATHER", name: "Father" },
      update: { isActive: true },
    });
    const brother = await tx.partnershipPartner.upsert({
      where: { code: "BROTHER" },
      create: { code: "BROTHER", name: "Brother" },
      update: { isActive: true },
    });
    await tx.partnerAllocation.createMany({
      data: [
        { financialYearId: year.id, partnerId: father.id, percentage: 50 },
        { financialYearId: year.id, partnerId: brother.id, percentage: 50 },
      ],
    });
    return tx.financialYear.findUniqueOrThrow({
      where: { id: year.id },
      include: { allocations: { include: { partner: true } } },
    });
  });
}

export async function closeFinancialYear(id: string, userId: string) {
  return prisma.$transaction(async (tx) => {
    await tx.financialYear.findUniqueOrThrow({ where: { id } });
    const pending = await tx.journalEntry.count({
      where: { financialYearId: id, status: { in: ["draft", "pending"] } },
    });
    if (pending > 0) throw new Error("Cannot close a financial year with pending journal entries");
    return tx.financialYear.update({
      where: { id },
      data: { status: "closed", isClosed: true, closedAt: new Date(), closedById: userId },
    });
  });
}

export async function convertOpeningBalances(input: OpeningBalanceInput) {
  return prisma.$transaction(async (tx) => {
    const year = await tx.financialYear.findUniqueOrThrow({ where: { id: input.financialYearId } });
    if (year.isClosed || year.status === "closed") throw new Error("Cannot convert balances into a closed financial year");
    const sourceKey = "opening_balance:" + year.id;
    const existing = await tx.journalEntry.findUnique({ where: { sourceKey } });
    if (existing) return existing;
    const entry = await postJournalEntryTx(tx, {
      date: year.startDate,
      description: "Opening balances for " + year.name,
      referenceType: "opening_balance",
      referenceId: year.id,
      financialYearId: year.id,
      sourceKey,
      createdById: input.createdById,
      autoApprove: true,
      lines: input.lines,
    });
    if (input.receivables?.length) {
      const invoiceIds = input.receivables.map((item) => item.invoiceId);
      const invoices = await tx.generatedInvoice.findMany({ where: { id: { in: invoiceIds } } });
      if (invoices.length !== invoiceIds.length) {
        throw new Error("Every opening receivable must reference an existing service invoice");
      }
      for (const receivable of input.receivables) {
        const invoice = invoices.find((item) => item.id === receivable.invoiceId)!;
        const outstanding = toNumber(invoice.totalAmount) - toNumber(invoice.paidAmount);
        if (outstanding <= 0 || invoice.paymentStatus === "paid") {
          throw new Error("Opening receivables must be unpaid or partially paid invoices");
        }
        if (Math.abs(outstanding - receivable.amount) > 0.01) {
          throw new Error(`Opening receivable amount does not match invoice ${invoice.invoiceNumber}`);
        }
      }
      await tx.generatedInvoice.updateMany({
        where: { id: { in: invoiceIds } },
        data: { financialYearId: year.id, isOpeningBalance: true, accountingStatus: "posted" },
      });
    }
    return entry;
  });
}

export async function getReceivableAging(asOfDate = new Date()) {
  const invoices = await prisma.generatedInvoice.findMany({
    where: { accountingStatus: "posted", paymentStatus: { in: ["unpaid", "partial"] } },
  });
  const buckets = new Map<string, { count: number; amount: number }>([
    ["current", { count: 0, amount: 0 }],
    ["1_30", { count: 0, amount: 0 }],
    ["31_60", { count: 0, amount: 0 }],
    ["61_90", { count: 0, amount: 0 }],
    ["90_plus", { count: 0, amount: 0 }],
  ]);
  const asOf = dateOnly(asOfDate).getTime();
  for (const invoice of invoices) {
    const outstanding = Math.max(0, toNumber(invoice.totalAmount) - toNumber(invoice.paidAmount));
    const dueDate = dateOnly(invoice.dueDate || invoice.invoiceDate || invoice.createdAt).getTime();
    const age = Math.max(0, Math.floor((asOf - dueDate) / 86400000));
    const bucket = getReceivableAgingBucket(age);
    const target = buckets.get(bucket)!;
    target.count += 1;
    target.amount += outstanding;
  }
  return [...buckets.entries()].map(([bucket, value]) => ({ bucket, ...value }));
}

export function getReceivableAgingBucket(ageDays: number): ReceivableAgingBucket["bucket"] {
  if (!Number.isFinite(ageDays) || ageDays <= 0) return "current";
  if (ageDays <= 30) return "1_30";
  if (ageDays <= 60) return "31_60";
  if (ageDays <= 90) return "61_90";
  return "90_plus";
}

export async function getPartnershipSummary(financialYearId: string) {
  const year = await prisma.financialYear.findUniqueOrThrow({
    where: { id: financialYearId },
    include: { allocations: { include: { partner: true } } },
  });
  const [serviceRevenue, income, expenses, drawings, payrollPeriods] = await Promise.all([
    prisma.generatedInvoice.aggregate({
      where: {
        financialYearId,
        accountingStatus: "posted",
        isOpeningBalance: false,
        invoiceDate: { gte: year.startDate, lte: year.endDate },
      },
      _sum: { totalAmount: true },
    }),
    prisma.businessTransaction.aggregate({
      where: { financialYearId, type: "income", status: "posted", date: { gte: year.startDate, lte: year.endDate } },
      _sum: { amount: true },
    }),
    prisma.businessTransaction.aggregate({
      where: { financialYearId, type: "expense", status: "posted", isDeductible: true, date: { gte: year.startDate, lte: year.endDate } },
      _sum: { amount: true },
    }),
    prisma.businessTransaction.aggregate({
      where: { financialYearId, type: "drawing", status: "posted", date: { gte: year.startDate, lte: year.endDate } },
      _sum: { amount: true },
    }),
    prisma.payrollPeriod.findMany({
      where: {
        startDate: { gte: year.startDate },
        endDate: { lte: year.endDate },
        status: { in: ["approved", "paid"] },
      },
      include: {
        payments: {
          where: { accrualJournalEntryId: { not: null } },
          select: { baseAmount: true, bonusAmount: true },
        },
      },
    }),
  ]);
  const wagesExpense = payrollPeriods.reduce(
    (periodTotal, period) => periodTotal + period.payments.reduce(
      (paymentTotal, payment) => paymentTotal + toNumber(payment.baseAmount) + toNumber(payment.bonusAmount),
      0,
    ),
    0,
  );
  const grossIncome = toNumber(serviceRevenue._sum.totalAmount) + toNumber(income._sum.amount);
  const allowableExpenses = toNumber(expenses._sum.amount) + wagesExpense;
  const netProfit = grossIncome - allowableExpenses;
  const allocations = year.allocations.map((allocation) => ({
    partnerId: allocation.partnerId,
    partnerCode: allocation.partner.code,
    partnerName: allocation.partner.name,
    percentage: toNumber(allocation.percentage),
    allocatedProfit: netProfit * toNumber(allocation.percentage) / 100,
  }));
  return {
    financialYear: year,
    grossIncome,
    invoicedServiceRevenue: toNumber(serviceRevenue._sum.totalAmount),
    otherBusinessIncome: toNumber(income._sum.amount),
    allowableExpenses,
    wagesExpense,
    netProfit,
    totalDrawings: toNumber(drawings._sum.amount),
    allocations,
  };
}

export async function getPartners() {
  return prisma.partnershipPartner.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
  });
}

export async function savePartnerAllocation(input: {
  financialYearId: string;
  partnerId: string;
  percentage: number;
}) {
  if (input.percentage < 0 || input.percentage > 100) throw new Error("Percentage must be between 0 and 100");
  return prisma.partnerAllocation.upsert({
    where: {
      financialYearId_partnerId: {
        financialYearId: input.financialYearId,
        partnerId: input.partnerId,
      },
    },
    create: input,
    update: { percentage: input.percentage },
  });
}

export async function getCashFlowSummary(startDate: Date, endDate: Date) {
  const [payments, transactions, payroll] = await Promise.all([
    prisma.invoicePayment.aggregate({
      where: { paymentDate: { gte: dateOnly(startDate), lte: dateOnly(endDate) }, status: "completed" },
      _sum: { amountInBase: true },
    }),
    prisma.businessTransaction.groupBy({
      by: ["type"],
      where: { date: { gte: dateOnly(startDate), lte: dateOnly(endDate) }, status: "posted" },
      _sum: { amount: true },
    }),
    prisma.workerPayment.aggregate({
      where: { paidAt: { gte: dateOnly(startDate), lte: dateOnly(endDate) }, status: "paid" },
      _sum: { netAmount: true },
    }),
  ]);
  const transactionTotals = new Map(transactions.map((item) => [item.type, toNumber(item._sum.amount)]));
  const wagesPaid = toNumber(payroll._sum.netAmount);
  return {
    periodStart: startDate,
    periodEnd: endDate,
    customerCollections: toNumber(payments._sum.amountInBase),
    otherIncome: transactionTotals.get("income") || 0,
    businessExpensesPaid: transactionTotals.get("expense") || 0,
    wagesPaid,
    partnerDrawings: transactionTotals.get("drawing") || 0,
    netCashMovement:
      toNumber(payments._sum.amountInBase) +
      (transactionTotals.get("income") || 0) -
      (transactionTotals.get("expense") || 0) -
      wagesPaid -
      (transactionTotals.get("drawing") || 0),
  };
}

export async function getCashBasisIncomeStatement(startDate: Date, endDate: Date) {
  const range = { gte: dateOnly(startDate), lte: dateOnly(endDate) };
  const [collections, transactions, payroll] = await Promise.all([
    prisma.invoicePayment.aggregate({
      where: { paymentDate: range, status: "completed", invoiceType: "generated" },
      _sum: { amountInBase: true },
    }),
    prisma.businessTransaction.groupBy({
      by: ["type"],
      where: { date: range, status: "posted" },
      _sum: { amount: true },
    }),
    prisma.workerPayment.aggregate({
      where: { paidAt: range, status: "paid" },
      _sum: { netAmount: true },
    }),
  ]);
  const transactionTotals = new Map(
    transactions.map((item) => [item.type, toNumber(item._sum.amount)]),
  );
  const customerCollections = toNumber(collections._sum.amountInBase);
  const otherIncome = transactionTotals.get("income") || 0;
  const businessExpenses = transactionTotals.get("expense") || 0;
  const wagesPaid = toNumber(payroll._sum.netAmount);
  return {
    basis: "cash" as const,
    periodStart: startDate,
    periodEnd: endDate,
    customerCollections,
    otherIncome,
    businessExpenses,
    wagesPaid,
    netProfit: customerCollections + otherIncome - businessExpenses - wagesPaid,
  };
}

export async function getTaxReadySummary(financialYearId: string) {
  const year = await prisma.financialYear.findUniqueOrThrow({ where: { id: financialYearId } });
  const dateRange = { gte: year.startDate, lte: year.endDate };
  const [partnership, invoices, payments, missingVouchers, settings] = await Promise.all([
    getPartnershipSummary(financialYearId),
    prisma.generatedInvoice.aggregate({
      where: { financialYearId, accountingStatus: "posted", invoiceDate: dateRange },
      _sum: { totalAmount: true },
    }),
    prisma.invoicePayment.aggregate({
      where: { paymentDate: dateRange, status: "completed", invoiceType: "generated" },
      _sum: { amountInBase: true },
    }),
    prisma.businessTransaction.count({
      where: {
        financialYearId,
        type: "expense",
        isDeductible: true,
        status: "posted",
        vouchers: { none: {} },
      },
    }),
    prisma.accountingSettings.findFirst({ select: { taxMappings: true } }),
  ]);
  const defaultTaxMappings = {
    turnover: "gross_business_income",
    allowableExpenses: "allowable_business_expenses",
    netProfit: "net_business_profit",
    partnerAllocation: "partner_profit_allocation",
  };
  const taxMappings = settings?.taxMappings && !Array.isArray(settings.taxMappings)
    ? { ...defaultTaxMappings, ...(settings.taxMappings as Record<string, string>) }
    : defaultTaxMappings;
  return {
    financialYear: year,
    grossInvoicedRevenue: toNumber(invoices._sum.totalAmount),
    collectedRevenue: toNumber(payments._sum.amountInBase),
    grossBusinessIncome: partnership.grossIncome,
    allowableBusinessExpenses: partnership.allowableExpenses,
    netBusinessProfit: partnership.netProfit,
    totalDrawings: partnership.totalDrawings,
    partnerAllocations: partnership.allocations,
    deductibleExpensesMissingVouchers: missingVouchers,
    taxMappings,
  };
}
