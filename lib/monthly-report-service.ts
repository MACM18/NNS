import { Prisma } from "@prisma/client";
import { encrypt, decrypt } from "@/lib/encryption";
import prisma from "@/lib/prisma";
import { computeCableMeasurements } from "@/lib/db";
import { createIssuedInvoiceFromLines } from "@/lib/partnership-accounting-service";
import { monthlyInvoiceNumber } from "@/lib/monthly-invoice-number";
import {
  generateDailyMaterialBalancePdf,
  generateDrumNumberPdf,
  generateInvoiceBackPdf,
  generateInvoicePdf,
  generateMonthlyMaterialBalancePdf,
  formatMonthlyInvoiceDisplayNumber,
  MONTHLY_REPORT_PDF_DESIGN_VERSION,
  type InvoiceBackRow,
  type InvoiceCompanyDetails,
  type InvoiceSnapshotLine,
  type OptionalInvoiceSnapshot,
} from "@/lib/monthly-report-pdf";
import {
  canManageMonthlyReports,
  createMonthlyShareToken,
  createReportDocumentId,
  hashMonthlyShareToken,
  monthDateBounds,
  MONTHLY_REPORT_TITLES,
  type MonthlyReportType,
} from "@/lib/monthly-report-sharing";

function jsonValue(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function decimal(value: unknown) { return Number(value ?? 0); }
function dayKey(value: Date) { return value.toISOString().slice(0, 10); }
function monthLabel(month: number, year: number) {
  return new Intl.DateTimeFormat("en", { month: "long", year: "numeric", timeZone: "Asia/Colombo" }).format(new Date(Date.UTC(year, month - 1, 1)));
}
function lineIds(value: Prisma.JsonValue | null): string[] {
  return Array.isArray(value) ? value.filter((id): id is string => typeof id === "string") : [];
}
function optionalItemsInput(value: Prisma.JsonValue | null) {
  if (!Array.isArray(value)) return {};
  return Object.fromEntries(value.flatMap(raw => {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return [];
    const item = raw as Record<string, unknown>;
    if (typeof item.code !== "string") return [];
    return [[item.code, { quantity: Number(item.quantity || 0), unitRate: Number(item.unitRate || 0) }]];
  }));
}

type ReportInvoice = {
  invoiceNumber: string;
  invoiceDate: Date | string | null;
  jobMonth: string | null;
  invoiceType: string | null;
  totalAmount: number;
  lines: InvoiceSnapshotLine[];
  optionalItems: OptionalInvoiceSnapshot[];
  pricingSnapshot?: unknown;
};

type MonthlyPdfData = {
  year: number;
  month: number;
  dailyItems: Array<{ sourceItemName: string; sourceUnit: string | null; dailyEntries: Array<{ date: string; previousBalance: number; issued: number; usage: number; balanceReturn: number }> }>;
  monthlyRows: Array<{ item: string; opening: number; issued: number; inHand: number; used: number; endingWip: number }>;
  invoiceBackRows: InvoiceBackRow[];
  drumRows: Array<{ telephoneNo: string; cableStart: number; cableMiddle: number; cableEnd: number; drumNumber: string; wastage: number }>;
  invoiceBackNumber: string;
  invoices: [ReportInvoice, ReportInvoice];
  company: InvoiceCompanyDetails;
};

function stringField(value: unknown) { return typeof value === "string" ? value : ""; }
function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}
function arrayField<T>(record: Record<string, unknown>, key: string): T[] {
  const value = record[key];
  return Array.isArray(value) ? value as T[] : [];
}
function invoiceCompanyDetails(settings: { companyName: string; address: string | null; contactNumbers: string[]; website: string | null; registeredNumber: string | null; bankDetails: Prisma.JsonValue | null } | null): InvoiceCompanyDetails {
  const bank = asRecord(settings?.bankDetails);
  return {
    name: settings?.companyName || "NNS Enterprise",
    address: settings?.address || "",
    contacts: settings?.contactNumbers || [],
    registeredNumber: settings?.registeredNumber || "",
    website: settings?.website || "",
    bank: {
      bankName: stringField(bank?.bank_name),
      accountTitle: stringField(bank?.account_title),
      accountNumber: stringField(bank?.account_number),
      branchCode: stringField(bank?.branch_code),
      iban: stringField(bank?.iban),
    },
  };
}
function buildMonthlyReportPdfs(data: MonthlyPdfData) {
  const label = monthLabel(data.month, data.year);
  const invoiceReports = data.invoices.map(invoice => ({
    type: invoice.invoiceType === "A" ? "invoice-a" as const : "invoice-b" as const,
    bytes: generateInvoicePdf({
      invoice: { invoiceNumber: invoice.invoiceNumber, invoiceDate: invoice.invoiceDate, jobMonth: invoice.jobMonth, invoiceType: invoice.invoiceType, totalAmount: invoice.totalAmount },
      displayNumber: formatMonthlyInvoiceDisplayNumber(data.year, data.month),
      year: data.year,
      month: data.month,
      pricingSnapshot: invoice.pricingSnapshot,
      lines: invoice.lines,
      optionalItems: invoice.optionalItems,
      company: data.company,
    }),
  }));
  return [
    { type: "daily-material-balance" as const, bytes: generateDailyMaterialBalancePdf({ monthLabel: label, items: data.dailyItems }) },
    { type: "monthly-material-balance" as const, bytes: generateMonthlyMaterialBalancePdf({ monthLabel: label, year: data.year, rows: data.monthlyRows }) },
    ...invoiceReports,
    { type: "invoice-back" as const, bytes: generateInvoiceBackPdf({ monthLabel: label, invoiceNumber: data.invoiceBackNumber, rows: data.invoiceBackRows }) },
    { type: "drum-number" as const, bytes: generateDrumNumberPdf({ monthLabel: label, rows: data.drumRows }) },
  ];
}

function monthlyInvoiceBackNumber(year: number, month: number) {
  const monthName = new Intl.DateTimeFormat("en", { month: "long", timeZone: "Asia/Colombo" }).format(new Date(Date.UTC(year, month - 1, 1))).toUpperCase();
  return `NNS/WPS/HR/NC/${String(year).slice(-2)}/${monthName}/001`;
}

async function ensureInvoicePair(year: number, month: number, createdById: string) {
  const findPair = () => prisma.generatedInvoice.findMany({ where: { year, month, invoiceType: { in: ["A", "B"] } }, orderBy: { createdAt: "asc" } });
  let invoices = await findPair();
  const invoiceA = invoices.find(invoice => invoice.invoiceType === "A");
  const invoiceB = invoices.find(invoice => invoice.invoiceType === "B");
  if (!invoiceA && !invoiceB) return { requiresInvoiceGeneration: true as const };
  if (Boolean(invoiceA) !== Boolean(invoiceB)) {
    const existing = invoiceA || invoiceB!;
    const type = invoiceA ? "B" : "A";
    const ids = lineIds(existing.lineDetailsIds);
    if (!ids.length) throw new Error(`The saved Invoice ${existing.invoiceType} has no line snapshot, so its missing counterpart cannot be created safely.`);
    const nextMonthDate = new Date(Date.UTC(year, month, 2));
    const jobMonth = monthLabel(month, year);
    const number = monthlyInvoiceNumber(year, month, type);
    try {
      await createIssuedInvoiceFromLines({
        invoiceNumber: number,
        invoiceType: type,
        month,
        year,
        jobMonth,
        invoiceDate: existing.invoiceDate || nextMonthDate,
        lineDetailsIds: ids,
        optionalItems: optionalItemsInput(existing.optionalItemsSnapshot),
        status: "generated",
        createdById,
      });
    } catch (error) {
      const found = await prisma.generatedInvoice.findFirst({ where: { year, month, invoiceType: type } });
      if (!found) throw error;
    }
    invoices = await findPair();
  }
  const a = invoices.find(invoice => invoice.invoiceType === "A");
  const b = invoices.find(invoice => invoice.invoiceType === "B");
  if (!a || !b) throw new Error("Both monthly invoices must be available before creating the report set.");
  return { requiresInvoiceGeneration: false as const, invoices: [a, b] as const };
}

export async function generateMonthlyReportVersion(input: { year: number; month: number; createdById: string }) {
  const bounds = monthDateBounds(input.year, input.month);

  const connection = await prisma.googleSheetConnection.findFirst({
    where: { year: input.year, month: input.month, status: "active" },
    orderBy: [{ autoSyncEnabled: "desc" }, { createdAt: "desc" }],
  });
  if (!connection) throw new Error("No connected Google Sheet was found for this month.");
  const imported = await prisma.materialBalanceImport.findFirst({
    where: { connectionId: connection.id, status: { in: ["success", "warning"] } },
    orderBy: { importedAt: "desc" },
    include: {
      items: {
        orderBy: { sourceRow: "asc" },
        include: {
          dailyEntries: {
            where: { balanceDate: { gte: bounds.start, lt: bounds.endExclusive } },
            orderBy: { balanceDate: "asc" },
          },
        },
      },
    },
  });
  if (!imported) throw new Error("No successful material balance import exists for this month. Sync the month’s sheet, then try again.");

  const invoicePair = await ensureInvoicePair(input.year, input.month, input.createdById);
  if (invoicePair.requiresInvoiceGeneration) return invoicePair;

  const lines = await prisma.lineDetails.findMany({
    where: { date: { gte: bounds.start, lt: bounds.endExclusive } },
    orderBy: [{ date: "asc" }, { telephoneNo: "asc" }],
  });
  const companySettings = await prisma.companySettings.findFirst({ orderBy: { createdAt: "asc" } });
  const invoiceRecords = invoicePair.invoices;
  const invoiceA = invoiceRecords.find(invoice => invoice.invoiceType === "A")!;
  const invoiceB = invoiceRecords.find(invoice => invoice.invoiceType === "B")!;
  const dailyItems = imported.items.map(item => ({
    sourceItemName: item.sourceItemName,
    sourceUnit: item.sourceUnit,
    dailyEntries: item.dailyEntries.map(entry => ({
      date: dayKey(entry.balanceDate), previousBalance: decimal(entry.previousBalance), issued: decimal(entry.issued), usage: decimal(entry.usage), balanceReturn: decimal(entry.balanceReturn),
    })),
  }));
  const monthlyRows = imported.items.map(item => ({
    item: item.sourceItemName,
    opening: decimal(item.monthOpeningBalance ?? item.openingBalance),
    issued: decimal(item.monthStockIssued),
    inHand: decimal(item.monthInHand),
    used: decimal(item.monthMaterialUsed),
    endingWip: decimal(item.monthEndingWip ?? item.finalBalance),
  }));
  const invoiceBackRows: InvoiceBackRow[] = lines.map(line => {
    const cable = computeCableMeasurements(decimal(line.cableStart), decimal(line.cableMiddle), decimal(line.cableEnd));
    return {
      telephoneNo: line.telephoneNo,
      status: line.status,
      completeDate: line.completedDate ? dayKey(line.completedDate) : dayKey(line.date),
      f1: cable.f1,
      g1: cable.g1,
      lHook: line.lHook,
      cHook: line.cHook,
      retainers: line.retainers,
      internalWire: decimal(line.internalWire),
      cat5: decimal(line.cat5),
      fac: line.fac,
      fiberRosette: line.fiberRosette,
      topBolt: line.topBolt,
      conduit: decimal(line.conduit),
      casing: decimal(line.casing),
      poleDetails: [line.pole67 ? `${line.pole67} × 6.7m` : "", line.pole ? `${line.pole} × 5.6m` : ""].filter(Boolean).join(", "),
    };
  });
  const drumRows = lines.filter(line => Boolean(line.drumNumber || line.drumNumberNew)).map(line => ({
    telephoneNo: line.telephoneNo,
    cableStart: decimal(line.cableStart),
    cableMiddle: decimal(line.cableMiddle),
    cableEnd: decimal(line.cableEnd),
    drumNumber: line.drumNumber || line.drumNumberNew || "",
    wastage: decimal(line.wastage),
  }));
  const invoiceLines = (invoice: typeof invoiceA): InvoiceSnapshotLine[] => Array.isArray(invoice.lineDetailsSnapshot)
    ? (invoice.lineDetailsSnapshot as unknown as InvoiceSnapshotLine[])
    : [];
  const optionalLines = (invoice: typeof invoiceA): OptionalInvoiceSnapshot[] => Array.isArray(invoice.optionalItemsSnapshot)
    ? (invoice.optionalItemsSnapshot as unknown as OptionalInvoiceSnapshot[])
    : [];
  const reportPdfs = buildMonthlyReportPdfs({
    year: input.year,
    month: input.month,
    dailyItems,
    monthlyRows,
    invoiceBackRows,
    drumRows,
    invoiceBackNumber: monthlyInvoiceBackNumber(input.year, input.month),
    invoices: [invoiceA, invoiceB].map(invoice => ({
      invoiceNumber: invoice.invoiceNumber,
      invoiceDate: invoice.invoiceDate,
      jobMonth: invoice.jobMonth,
      invoiceType: invoice.invoiceType,
      totalAmount: decimal(invoice.totalAmount),
      lines: invoiceLines(invoice),
      optionalItems: optionalLines(invoice),
      pricingSnapshot: invoice.pricingSnapshot,
    })) as [ReportInvoice, ReportInvoice],
    company: invoiceCompanyDetails(companySettings),
  });
  const sourceSnapshot = {
    month: input.month, year: input.year,
    pdfDesignVersion: MONTHLY_REPORT_PDF_DESIGN_VERSION,
    sourceImport: { id: imported.id, importedAt: imported.importedAt.toISOString(), status: imported.status, sourceTab: imported.sourceTab, sourceChecksum: imported.sourceChecksum },
    lineIds: lines.map(line => line.id),
    invoiceIds: invoiceRecords.map(invoice => invoice.id),
    dailyItems, monthlyRows, invoiceBackRows, drumRows,
    invoiceSnapshots: invoiceRecords.map(invoice => ({ id: invoice.id, number: invoice.invoiceNumber, type: invoice.invoiceType, total: decimal(invoice.totalAmount), lines: invoice.lineDetailsSnapshot, optionalItems: invoice.optionalItemsSnapshot, pricingSnapshot: invoice.pricingSnapshot })),
  };

  const reportId = await prisma.$transaction(async tx => {
    const periodKey = `${input.year}-${String(input.month).padStart(2, "0")}`;
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`monthly-report:${periodKey}`}))`;
    const report = await tx.monthlyReport.upsert({
      where: { year_month: { year: input.year, month: input.month } },
      update: {},
      create: { year: input.year, month: input.month, createdById: input.createdById },
      select: { id: true },
    });
    const previous = await tx.monthlyReportVersion.findFirst({ where: { reportId: report.id }, orderBy: { version: "desc" }, select: { version: true } });
    const version = await tx.monthlyReportVersion.create({ data: { reportId: report.id, version: (previous?.version || 0) + 1, sourceImportId: imported.id, sourceSnapshot: jsonValue(sourceSnapshot), createdById: input.createdById }, select: { id: true } });
    await tx.monthlyReportDocument.createMany({ data: reportPdfs.map(document => ({
      versionId: version.id,
      reportType: document.type,
      publicId: createReportDocumentId(),
      title: MONTHLY_REPORT_TITLES[document.type],
      fileName: `${document.type}-${input.year}-${String(input.month).padStart(2, "0")}.pdf`,
      pdfBytes: Buffer.from(document.bytes),
    })) });
    return report.id;
  });
  return { requiresInvoiceGeneration: false as const, reportId, version: await prisma.monthlyReportVersion.findFirstOrThrow({ where: { reportId, sourceImportId: imported.id }, orderBy: { version: "desc" }, include: { documents: { select: { id: true, reportType: true, title: true, fileName: true, publicId: true } } } }) };
}

export async function regenerateMonthlyReportDesign(reportId: string, createdById: string) {
  const target = await prisma.monthlyReport.findUnique({ where: { id: reportId }, select: { year: true, month: true } });
  if (!target) throw new Error("This monthly report was not found.");
  const periodKey = `${target.year}-${String(target.month).padStart(2, "0")}`;
  return prisma.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`monthly-report:${periodKey}`}))`;
    const report = await tx.monthlyReport.findUnique({
      where: { id: reportId },
      select: { id: true, year: true, month: true, versions: { orderBy: { version: "desc" }, take: 1, select: { id: true, version: true, sourceImportId: true, sourceSnapshot: true } } },
    });
    if (!report) throw new Error("This monthly report was not found.");
    const sourceVersion = report.versions[0];
    if (!sourceVersion) throw new Error("This month has no saved report snapshot to redesign.");
    const snapshot = asRecord(sourceVersion.sourceSnapshot);
    if (!snapshot) throw new Error("The saved report snapshot is invalid and cannot be redesigned.");
    if (snapshot.pdfDesignVersion === MONTHLY_REPORT_PDF_DESIGN_VERSION) {
      return { status: "skipped" as const, version: sourceVersion.version };
    }

    const dailyItems = arrayField<MonthlyPdfData["dailyItems"][number]>(snapshot, "dailyItems");
    const monthlyRows = arrayField<MonthlyPdfData["monthlyRows"][number]>(snapshot, "monthlyRows");
    const invoiceBackRows = arrayField<InvoiceBackRow>(snapshot, "invoiceBackRows");
    const drumRows = arrayField<MonthlyPdfData["drumRows"][number]>(snapshot, "drumRows");
    const invoiceSnapshots = arrayField<Record<string, unknown>>(snapshot, "invoiceSnapshots");
    const invoiceA = invoiceSnapshots.find(invoice => invoice.type === "A");
    const invoiceB = invoiceSnapshots.find(invoice => invoice.type === "B");
    if (!invoiceA || !invoiceB) throw new Error("The saved snapshot is missing Invoice A or Invoice B details.");
    if (!Array.isArray(snapshot.dailyItems) || !Array.isArray(snapshot.monthlyRows) || !Array.isArray(snapshot.invoiceBackRows) || !Array.isArray(snapshot.drumRows)) {
      throw new Error("The saved snapshot is missing material or invoice-back rows.");
    }

    const invoiceIds = invoiceSnapshots.map(invoice => invoice.id).filter((id): id is string => typeof id === "string");
    const savedInvoices = invoiceIds.length ? await tx.generatedInvoice.findMany({ where: { id: { in: invoiceIds } }, select: { id: true, invoiceDate: true, jobMonth: true, pricingSnapshot: true } }) : [];
    const invoiceById = new Map(savedInvoices.map(invoice => [invoice.id, invoice]));
    const companySettings = await tx.companySettings.findFirst({ orderBy: { createdAt: "asc" } });
    const fallbackDate = new Date(Date.UTC(report.year, report.month, 2));
    const jobMonth = monthLabel(report.month, report.year);
    const convertInvoice = (raw: Record<string, unknown>): ReportInvoice => {
      const id = stringField(raw.id);
      const saved = invoiceById.get(id);
      const type = raw.type === "B" ? "B" : "A";
      return {
        invoiceNumber: stringField(raw.number),
        invoiceDate: saved?.invoiceDate || fallbackDate,
        jobMonth: saved?.jobMonth || jobMonth,
        invoiceType: type,
        totalAmount: decimal(raw.total),
        lines: Array.isArray(raw.lines) ? raw.lines as InvoiceSnapshotLine[] : [],
        optionalItems: Array.isArray(raw.optionalItems) ? raw.optionalItems as OptionalInvoiceSnapshot[] : [],
        pricingSnapshot: raw.pricingSnapshot ?? saved?.pricingSnapshot,
      };
    };
    const documents = buildMonthlyReportPdfs({
      year: report.year, month: report.month, dailyItems, monthlyRows, invoiceBackRows, drumRows,
      invoiceBackNumber: monthlyInvoiceBackNumber(report.year, report.month),
      invoices: [convertInvoice(invoiceA), convertInvoice(invoiceB)],
      company: invoiceCompanyDetails(companySettings),
    });

    const latest = await tx.monthlyReportVersion.findFirst({ where: { reportId }, orderBy: { version: "desc" }, select: { version: true, sourceSnapshot: true } });
    const latestSnapshot = asRecord(latest?.sourceSnapshot);
    if (latestSnapshot?.pdfDesignVersion === MONTHLY_REPORT_PDF_DESIGN_VERSION) {
      return { status: "skipped" as const, version: latest!.version };
    }
    const nextVersion = (latest?.version || 0) + 1;
    const nextSnapshot = { ...snapshot, pdfDesignVersion: MONTHLY_REPORT_PDF_DESIGN_VERSION };
    const created = await tx.monthlyReportVersion.create({
      data: { reportId, version: nextVersion, sourceImportId: sourceVersion.sourceImportId, sourceSnapshot: jsonValue(nextSnapshot), createdById },
      select: { id: true, version: true },
    });
    await tx.monthlyReportDocument.createMany({ data: documents.map(document => ({
      versionId: created.id,
      reportType: document.type,
      publicId: createReportDocumentId(),
      title: MONTHLY_REPORT_TITLES[document.type],
      fileName: `${document.type}-${report.year}-${String(report.month).padStart(2, "0")}.pdf`,
      pdfBytes: Buffer.from(document.bytes),
    })) });
    return { status: "created" as const, version: created.version };
  });
}

export async function createOrGetMonthlyVersionShare(reportId: string, versionId: string) {
  return prisma.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`monthly-version-share:${versionId}`}))`;
    const version = await tx.monthlyReportVersion.findFirst({
      where: { id: versionId, reportId },
      select: { id: true, status: true, shareActive: true, shareTokenHash: true, encryptedShareToken: true },
    });
    if (!version) throw new Error("This report version was not found for the selected month.");
    if (version.status !== "published" && version.status !== "archived") throw new Error("Publish this reviewed version before sharing it.");
    if (version.shareActive && version.shareTokenHash && version.encryptedShareToken) return { token: decrypt(version.encryptedShareToken), version };
    const token = createMonthlyShareToken();
    const updated = await tx.monthlyReportVersion.update({
      where: { id: versionId },
      data: { shareActive: true, shareTokenHash: hashMonthlyShareToken(token), encryptedShareToken: encrypt(token), shareRevokedAt: null },
      select: { id: true, version: true, shareActive: true },
    });
    return { token, version: updated };
  });
}

export async function getActiveMonthlyVersionShare(reportId: string, versionId: string) {
  const version = await prisma.monthlyReportVersion.findFirst({
    where: { id: versionId, reportId, shareActive: true },
    select: { version: true, encryptedShareToken: true, shareTokenHash: true, report: { select: { year: true, month: true } } },
  });
  if (!version?.encryptedShareToken || !version.shareTokenHash) return null;
  return { token: decrypt(version.encryptedShareToken), version: { version: version.version, report: version.report } };
}

export async function revokeMonthlyVersionShare(reportId: string, versionId: string) {
  return prisma.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`monthly-version-share:${versionId}`}))`;
    const version = await tx.monthlyReportVersion.findFirst({ where: { id: versionId, reportId }, select: { id: true } });
    if (!version) throw new Error("This report version was not found for the selected month.");
    return tx.monthlyReportVersion.update({
      where: { id: versionId },
      data: { shareActive: false, shareTokenHash: null, encryptedShareToken: null, shareRevokedAt: new Date() },
      select: { id: true, shareActive: true, shareRevokedAt: true },
    });
  });
}

export async function deleteMonthlyReportVersion(reportId: string, versionId: string) {
  return prisma.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`monthly-version-share:${versionId}`}))`;
    const report = await tx.monthlyReport.findUnique({ where: { id: reportId }, select: { currentVersionId: true } });
    if (!report) throw new Error("This monthly report was not found.");
    if (report.currentVersionId === versionId) throw new Error("Publish another version before deleting the current published version.");
    const version = await tx.monthlyReportVersion.findFirst({ where: { id: versionId, reportId }, select: { id: true, version: true, shareActive: true } });
    if (!version) throw new Error("This report version was not found for this month.");
    if (version.shareActive) throw new Error("Stop sharing this version before deleting it.");
    await tx.monthlyReportVersion.delete({ where: { id: version.id } });
    return { deleted: true as const, version: version.version };
  });
}

export async function publishMonthlyReportVersion(reportId: string, versionId: string) {
  return prisma.$transaction(async tx => {
    const version = await tx.monthlyReportVersion.findFirst({ where: { id: versionId, reportId }, select: { id: true } });
    if (!version) throw new Error("Report version was not found for this month.");
    await tx.monthlyReportVersion.updateMany({ where: { reportId, status: "published", id: { not: versionId } }, data: { status: "archived" } });
    await tx.monthlyReportVersion.update({ where: { id: versionId }, data: { status: "published", publishedAt: new Date() } });
    return tx.monthlyReport.update({ where: { id: reportId }, data: { currentVersionId: versionId } });
  });
}

export async function getPublicMonthlyReport(token: string) {
  if (!/^[A-Za-z0-9_-]{40,50}$/.test(token)) return null;
  const version = await prisma.monthlyReportVersion.findFirst({
    where: { shareActive: true, shareTokenHash: hashMonthlyShareToken(token) },
    select: {
      version: true,
      report: { select: { year: true, month: true } },
      documents: { orderBy: { reportType: "asc" }, select: { publicId: true, reportType: true, title: true, fileName: true } },
    },
  });
  if (!version) return null;
  const company = await prisma.companySettings.findFirst({ orderBy: { createdAt: "asc" }, select: { companyName: true } });
  return { year: version.report.year, month: version.report.month, sharedVersion: { version: version.version, documents: version.documents }, companyName: company?.companyName || "NNS Enterprise" };
}

export async function getPublicMonthlyReportDocument(token: string, publicId: string) {
  if (!/^[A-Za-z0-9_-]{40,50}$/.test(token) || !/^[A-Za-z0-9_-]{30,40}$/.test(publicId)) return null;
  return prisma.monthlyReportDocument.findFirst({
    where: { publicId, version: { shareActive: true, shareTokenHash: hashMonthlyShareToken(token) } },
    select: { pdfBytes: true, fileName: true },
  });
}

export async function getPrivateMonthlyReportDocument(documentId: string) {
  return prisma.monthlyReportDocument.findUnique({ where: { id: documentId }, select: { pdfBytes: true, fileName: true } });
}
