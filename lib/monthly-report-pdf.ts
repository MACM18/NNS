import jsPDF from "jspdf";

export const MONTHLY_REPORT_PDF_DESIGN_VERSION = "nns-blue-compact-v5";

export type PdfCell = string | number | null | undefined;
type TableOptions = { widths: number[]; rowHeight?: number; headerHeight?: number; fontSize?: number; headerSize?: number; font?: "normal" | "bold"; alignments?: Array<"left" | "center" | "right">; headerFill?: [number, number, number]; headerText?: [number, number, number]; cellFills?: Array<[number, number, number] | undefined>; separatorAfter?: number[] };
const BRAND_NAVY: [number, number, number] = [19, 65, 96];
const BRAND_BLUE: [number, number, number] = [19, 132, 184];
const PALE_BLUE: [number, number, number] = [225, 241, 249];
const GRID: [number, number, number] = [190, 208, 218];
const DAILY_HEADER_FILL: [number, number, number] = [232, 243, 251];
const DAILY_DAY_FILLS: [number, number, number][] = [[246, 250, 253], [232, 243, 251]];

function newPdf(orientation: "portrait" | "landscape" = "portrait", format: "a4" | "a3" = "a4") {
  return new jsPDF({ orientation, unit: "mm", format, compress: true });
}

function pageSize(doc: jsPDF) { return { width: doc.internal.pageSize.getWidth(), height: doc.internal.pageSize.getHeight() }; }
function safeText(value: PdfCell) { return value === null || value === undefined ? "" : String(value); }
function textFit(doc: jsPDF, value: PdfCell, maxWidth: number) {
  const raw = safeText(value);
  if (doc.getTextWidth(raw) <= maxWidth) return raw;
  let text = raw;
  while (text.length > 1 && doc.getTextWidth(`${text}…`) > maxWidth) text = text.slice(0, -1);
  return `${text}…`;
}

function reportHeader(doc: jsPDF, title: string, subtitle: string, margin: number, continued = false) {
  const { width } = pageSize(doc);
  const bandHeight = continued ? 10 : 15;
  doc.setFillColor(...BRAND_NAVY);
  doc.rect(margin, margin, width - margin * 2, bandHeight, "F");
  doc.setFillColor(...BRAND_BLUE);
  doc.rect(margin, margin + bandHeight - 1, width - margin * 2, 1, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(continued ? 9 : 13);
  doc.text(title + (continued ? " · continued" : ""), width / 2, margin + (continued ? 6.7 : 9.8), { align: "center" });
  if (!continued && subtitle) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(62, 82, 95);
    doc.text(textFit(doc, subtitle, width - margin * 2 - 4), width / 2, margin + bandHeight + 5, { align: "center" });
  }
  return margin + bandHeight + (continued ? 3 : 9);
}

function drawTableHeader(doc: jsPDF, headers: PdfCell[], x: number, y: number, opts: TableOptions) {
  const height = opts.headerHeight ?? 7;
  let left = x;
  doc.setDrawColor(...GRID);
  doc.setLineWidth(0.12);
  headers.forEach((header, index) => {
    const w = opts.widths[index];
    doc.setFillColor(...(opts.headerFill ?? PALE_BLUE));
    doc.rect(left, y, w, height, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(opts.headerSize ?? opts.fontSize ?? 8);
    doc.setTextColor(...(opts.headerText ?? BRAND_NAVY));
    const value = textFit(doc, header, w - 1.5);
    const align = opts.alignments?.[index] ?? "center";
    doc.text(value, align === "left" ? left + 1 : align === "right" ? left + w - 1 : left + w / 2, y + height / 2 + (opts.headerSize && opts.headerSize < 6 ? 1.1 : 1.25), { align });
    left += w;
  });
  return y + height;
}

function drawDailyHeader(doc: jsPDF, dates: string[], x: number, y: number, itemWidth: number, unitWidth: number, dayWidth: number) {
  const groupHeight = 5.2;
  const labelHeight = 5.4;
  const totalHeight = groupHeight + labelHeight;
  let left = x;
  doc.setDrawColor(...GRID);
  doc.setLineWidth(0.1);
  doc.setFillColor(...PALE_BLUE);
  for (const [label, width] of [["Item Name", itemWidth], ["Unit", unitWidth]] as const) {
    doc.rect(left, y, width, totalHeight, "FD");
    doc.setFont("helvetica", "bold"); doc.setFontSize(5.5); doc.setTextColor(...BRAND_NAVY);
    doc.text(label, label === "Item Name" ? left + 1 : left + width / 2, y + totalHeight / 2 + 1, { align: label === "Item Name" ? "left" : "center" });
    left += width;
  }
  dates.forEach((date, dateIndex) => {
    const groupWidth = dayWidth * 4;
    doc.setFillColor(...BRAND_NAVY);
    doc.rect(left, y, groupWidth, groupHeight, "FD");
    doc.setFont("helvetica", "bold"); doc.setFontSize(5.5); doc.setTextColor(255, 255, 255);
    const dateLabel = new Date(`${date}T00:00:00Z`).toLocaleDateString("en-GB", { day: "2-digit", month: "short", timeZone: "UTC" });
    doc.text(dateLabel, left + groupWidth / 2, y + 3.7, { align: "center" });
    ["Prev", "Issued", "Usage", "Return"].forEach(label => {
      doc.setFillColor(...DAILY_HEADER_FILL);
      doc.rect(left, y + groupHeight, dayWidth, labelHeight, "FD");
      doc.setFont("helvetica", "bold"); doc.setFontSize(4.7); doc.setTextColor(...BRAND_NAVY);
      doc.text(textFit(doc, label, dayWidth - 0.8), left + dayWidth / 2, y + groupHeight + 3.6, { align: "center" });
      left += dayWidth;
    });
    if (dateIndex < dates.length - 1) {
      doc.setDrawColor(...BRAND_NAVY);
      doc.setLineWidth(0.65);
      doc.line(left, y, left, y + totalHeight);
      doc.setLineWidth(0.1);
    }
  });
  return y + totalHeight;
}

function drawRows(doc: jsPDF, rows: PdfCell[][], headers: PdfCell[], opts: TableOptions, startY: number, margin: number, repeatHeader: boolean | (() => number)) {
  const { height } = pageSize(doc);
  let y = startY;
  const rowHeight = opts.rowHeight ?? 7;
  doc.setFont("helvetica", opts.font ?? "normal");
  doc.setFontSize(opts.fontSize ?? 8);
  doc.setTextColor(34, 48, 58);
  doc.setDrawColor(...GRID);
  doc.setLineWidth(0.1);
  let rowIndex = 0;
  for (const row of rows) {
    if (y + rowHeight > height - margin - 6) {
      doc.addPage();
      y = typeof repeatHeader === "function" ? repeatHeader() : repeatHeader ? drawTableHeader(doc, headers, margin, margin, opts) : margin;
      doc.setFont("helvetica", opts.font ?? "normal");
      doc.setFontSize(opts.fontSize ?? 8);
    }
    const isTotal = row.some(cell => typeof cell === "string" && cell.toLowerCase().includes("grand total"));
    const rowFill: [number, number, number] = isTotal
      ? PALE_BLUE
      : rowIndex % 2 === 1
        ? [248, 251, 253]
        : [255, 255, 255];
    let x = margin;
    row.forEach((cell, index) => {
      const w = opts.widths[index];
      // Set the fill per cell. jsPDF keeps graphics state between drawing calls;
      // setting it here avoids a prior dark header/background color leaking into rows.
      doc.setFillColor(...(!isTotal && opts.cellFills?.[index] ? opts.cellFills[index]! : rowFill));
      doc.rect(x, y, w, rowHeight, "F");
      doc.setDrawColor(...GRID);
      doc.rect(x, y, w, rowHeight, "S");
      doc.setFont("helvetica", isTotal ? "bold" : opts.font ?? "normal");
      doc.setTextColor(34, 48, 58);
      const value = textFit(doc, cell, w - 1.5);
      const align = opts.alignments?.[index] ?? (typeof cell === "number" ? "right" : "left");
      doc.text(value, align === "left" ? x + 1 : align === "right" ? x + w - 1 : x + w / 2, y + rowHeight / 2 + 1.1, { align });
      x += w;
      if (opts.separatorAfter?.includes(index)) {
        doc.setDrawColor(...BRAND_NAVY);
        doc.setLineWidth(0.65);
        doc.line(x, y, x, y + rowHeight);
        doc.setLineWidth(0.1);
      }
    });
    rowIndex += 1;
    y += rowHeight;
  }
  return y;
}

function addPageNumbers(doc: jsPDF) {
  const pages = doc.getNumberOfPages();
  for (let page = 1; page <= pages; page += 1) {
    doc.setPage(page);
    const { width, height } = pageSize(doc);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(90, 95, 103);
    doc.text(`${page} / ${pages}`, width - 8, height - 4, { align: "right" });
  }
}

export interface DailyBalanceReport {
  sourceItemName: string;
  sourceUnit: string | null;
  dailyEntries: Array<{ date: string; previousBalance: number; issued: number; usage: number; balanceReturn: number }>;
}

export function generateDailyMaterialBalancePdf(input: { monthLabel: string; items: DailyBalanceReport[] }) {
  const doc = newPdf("landscape", "a3");
  const dates = Array.from(new Set(input.items.flatMap(item => item.dailyEntries.map(day => day.date)))).sort();
  const margin = 8;
  const itemWidth = 52, unitWidth = 10;
  const daysPerPage = 6;
  for (let offset = 0; offset < Math.max(dates.length, 1); offset += daysPerPage) {
    if (offset > 0) doc.addPage();
    const slice = dates.slice(offset, offset + daysPerPage);
    const dayWidth = 14.25;
    const groupedWidths = slice.flatMap(() => [dayWidth, dayWidth, dayWidth, dayWidth]);
    const headers = ["Item Name", "Unit", ...slice.flatMap(() => ["Prev. Day", "Issued", "Usage", "Balance Return"])];
    const widths = [itemWidth, unitWidth, ...groupedWidths];
    const alignments = ["left", "center", ...slice.flatMap(() => ["right", "right", "right", "right"])] as TableOptions["alignments"];
    const options: TableOptions = {
      widths, rowHeight: 5.8, fontSize: 5.4, headerSize: 5.1, alignments,
      cellFills: [undefined, undefined, ...slice.flatMap((_, dayIndex) => Array.from({ length: 4 }, () => DAILY_DAY_FILLS[dayIndex % 2]))],
      separatorAfter: slice.slice(0, -1).map((_, index) => 5 + index * 4),
    };
    const y = reportHeader(doc, "NNS Enterprise - Daily Material Balance", input.monthLabel, margin, offset > 0);
    const tableY = drawDailyHeader(doc, slice, margin, y, itemWidth, unitWidth, dayWidth);
    const rows: PdfCell[][] = input.items.map(item => [item.sourceItemName, item.sourceUnit || "", ...slice.flatMap<PdfCell>(date => {
      const entry = item.dailyEntries.find(day => day.date === date);
      return entry ? [entry.previousBalance, entry.issued, entry.usage, entry.balanceReturn] : ["", "", "", ""];
    })]);
    drawRows(doc, rows, headers, options, tableY, margin, () => drawDailyHeader(doc, slice, margin, reportHeader(doc, "NNS Enterprise - Daily Material Balance", input.monthLabel, margin, true), itemWidth, unitWidth, dayWidth));
  }
  addPageNumbers(doc);
  return new Uint8Array(doc.output("arraybuffer"));
}

export function generateMonthlyMaterialBalancePdf(input: { monthLabel: string; year: number; rows: Array<{ item: string; opening: number; issued: number; inHand: number; used: number; endingWip: number }> }) {
  const format = input.rows.length > 38 ? "a3" : "a4";
  const doc = newPdf("landscape", format);
  const margin = format === "a3" ? 12 : 8;
  const title = "MATERIAL BALANCE SHEET FOR NEW CONNECTION";
  const subtitle = `CONTRACTOR NAME: NNS Enterprise     AREA: HR-PH     MONTH: ${input.monthLabel.toUpperCase()}     YEAR: ${input.year}     NEW CONNECTION TYPE: FTTH`;
  const headers = ["No", "Item", "Opening Balance", "Stock Issued", "", "In hand End of the month", "Material used for invoice", "Ending WIP Material"];
  const baseWidths = [12, 62, 31, 28, 8, 38, 38, 35];
  const { width, height } = pageSize(doc);
  const baseWidth = baseWidths.reduce((sum, value) => sum + value, 0);
  const widthScale = Math.min(1.55, (width - margin * 2) / baseWidth);
  const widths = baseWidths.map(value => value * widthScale);
  const y = reportHeader(doc, title, subtitle, margin);
  const headerHeight = 5.6;
  const footerSpace = 9;
  const rowHeight = Math.min(5.2, Math.max(2.8, (height - margin - footerSpace - y - headerHeight) / Math.max(input.rows.length, 1)));
  const options: TableOptions = {
    widths, rowHeight, headerHeight, fontSize: Math.max(4.2, Math.min(5.4, rowHeight * 1.05)), headerSize: 5.2,
    headerFill: BRAND_NAVY, headerText: [255, 255, 255],
    alignments: ["center", "left", "right", "right", "center", "right", "right", "right"],
  };
  const tableY = drawTableHeader(doc, headers, margin, y, options);
  const rows = input.rows.map((row, index) => [index + 1, row.item, row.opening, row.issued, "", row.inHand, row.used, row.endingWip]);
  drawRows(doc, rows, headers, options, tableY, margin, false);
  addPageNumbers(doc);
  return new Uint8Array(doc.output("arraybuffer"));
}

export interface InvoiceSnapshotLine {
  description?: string;
  serviceType?: string;
  cableLength?: number;
  baseRate?: number;
  invoiceAmount?: number;
}
export interface OptionalInvoiceSnapshot { code?: string; description?: string; quantity?: number; unitRate?: number; baseAmount?: number; invoiceAmount?: number }

export interface InvoiceBankDetails {
  bankName?: string;
  accountTitle?: string;
  accountNumber?: string;
  branchCode?: string;
  iban?: string;
}

export interface InvoiceCompanyDetails {
  name: string;
  address: string;
  contacts: string[];
  registeredNumber: string;
  website?: string;
  bank?: InvoiceBankDetails;
}

type InvoiceRateSnapshot = Array<{
  peoTvRate?: number;
  optionalRates?: Record<string, number>;
  tiers?: Array<{ serviceType?: string; minLength?: number; maxLength?: number | null; rate?: number }>;
}>;

const invoiceBands = [
  { min: 0, max: 100, label: "0-100", dataLabel: "0-100" },
  { min: 101, max: 200, label: "101-200", dataLabel: "101-200" },
  { min: 201, max: 300, label: "201-300", dataLabel: "201-300" },
  { min: 301, max: 400, label: "301-400", dataLabel: "301-400" },
  { min: 401, max: 500, label: "401-500", dataLabel: "401-500" },
  { min: 501, max: Number.POSITIVE_INFINITY, label: "Over 500", dataLabel: "500 ++" },
] as const;

export function formatMonthlyInvoiceDisplayNumber(year: number, month: number) {
  if (!Number.isInteger(year) || year < 2000 || year > 2100 || !Number.isInteger(month) || month < 1 || month > 12) {
    throw new Error("Choose a valid invoice month and year.");
  }
  const name = new Intl.DateTimeFormat("en", { month: "long", timeZone: "Asia/Colombo" }).format(new Date(Date.UTC(year, month - 1, 1)));
  return `S/Southern/HR/NC/${String(year).slice(-2)}/${name}`;
}

function snapshotRates(value: unknown): InvoiceRateSnapshot {
  return Array.isArray(value) ? value.filter(item => item && typeof item === "object") as InvoiceRateSnapshot : [];
}
function catalogTierRate(snapshot: InvoiceRateSnapshot, serviceType: "FTTH" | "DATA", band: typeof invoiceBands[number]) {
  const tier = [...snapshot].reverse().flatMap(schedule => schedule.tiers ?? []).find(item =>
    String(item.serviceType || "FTTH").toUpperCase() === serviceType
    && Number(item.minLength) === band.min
    && (band.max === Number.POSITIVE_INFINITY ? item.maxLength == null : Number(item.maxLength) === band.max),
  );
  return Number(tier?.rate || 0);
}
function catalogOptionalRate(snapshot: InvoiceRateSnapshot, code: string, fallback: number) {
  const schedule = [...snapshot].reverse().find(item => item.optionalRates && Number(item.optionalRates[code]) > 0);
  return Number(schedule?.optionalRates?.[code] || fallback);
}
function serviceTypeForLine(line: InvoiceSnapshotLine): "FTTH" | "DATA" | "PEO_TV" {
  const explicit = String(line.serviceType || "").toUpperCase();
  if (explicit === "DATA" || explicit === "PEO_TV" || explicit === "FTTH") return explicit;
  const description = String(line.description || "").toUpperCase();
  if (description.includes("PEO TV") || description.includes("IPTV")) return "PEO_TV";
  if (description.includes("DATA")) return "DATA";
  return "FTTH";
}
function bandForLine(line: InvoiceSnapshotLine) {
  const length = Number(line.cableLength ?? 0);
  if (Number.isFinite(length)) return invoiceBands.findIndex(band => length >= band.min && length <= band.max);
  const description = String(line.description || "");
  return invoiceBands.findIndex(band => description.includes(band.label) || description.includes(band.dataLabel));
}
function currency(value: number) { return Number(value || 0).toLocaleString("en-LK", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
function amountCell(value: number) { return value > 0 ? currency(value) : "  -   "; }

function drawTemplateField(doc: jsPDF, label: string, value: string, x: number, y: number, labelWidth: number, valueWidth: number, fontSize = 7) {
  doc.setFont("helvetica", "bold"); doc.setFontSize(fontSize); doc.setTextColor(34, 48, 58);
  doc.text(label, x, y);
  doc.setFont("helvetica", "normal");
  doc.text(textFit(doc, value, valueWidth), x + labelWidth, y);
}

export function generateInvoicePdf(input: {
  invoice: { invoiceNumber: string; invoiceDate: Date | string | null; jobMonth: string | null; invoiceType: string | null; totalAmount: number };
  lines: InvoiceSnapshotLine[];
  optionalItems: OptionalInvoiceSnapshot[];
  company: InvoiceCompanyDetails;
  displayNumber?: string;
  year?: number;
  month?: number;
  pricingSnapshot?: unknown;
}) {
  const doc = newPdf("portrait", "a4");
  const margin = 9;
  const { width } = pageSize(doc);
  const invoiceType = input.invoice.invoiceType === "B" ? "B" : "A";
  const jobDate = input.year && input.month ? new Date(Date.UTC(input.year, input.month - 1, 1)) : new Date(input.invoice.invoiceDate || Date.now());
  const dateLabel = input.invoice.invoiceDate
    ? (() => {
        const date = new Date(input.invoice.invoiceDate);
        const day = new Intl.DateTimeFormat("en", { day: "numeric", timeZone: "Asia/Colombo" }).format(date);
        const month = new Intl.DateTimeFormat("en", { month: "short", timeZone: "Asia/Colombo" }).format(date);
        const year = new Intl.DateTimeFormat("en", { year: "2-digit", timeZone: "Asia/Colombo" }).format(date);
        return `${day}-${month}-${year}`;
      })()
    : "";
  const monthAbbreviation = new Intl.DateTimeFormat("en", { month: "short", timeZone: "Asia/Colombo" }).format(jobDate);
  const jobMonthLabel = `${String(input.year ? input.year % 100 : jobDate.getUTCFullYear() % 100).padStart(2, "0")}-${monthAbbreviation}`;
  const invoiceNumber = input.displayNumber || input.invoice.invoiceNumber;

  // The template's first three rows are company identity. Keep their wording and order.
  doc.setFillColor(...BRAND_NAVY); doc.rect(margin, margin, width - margin * 2, 13, "F");
  doc.setFont("helvetica", "bold"); doc.setFontSize(12); doc.setTextColor(255, 255, 255);
  doc.text(textFit(doc, input.company.name || "NNS Enterprise", width - margin * 2 - 5), margin + 2, margin + 5);
  doc.setFont("helvetica", "normal"); doc.setFontSize(6.3);
  doc.text(textFit(doc, input.company.address, width - margin * 2 - 5), margin + 2, margin + 9);
  doc.text(textFit(doc, `Contact Number :-${input.company.contacts.filter(Boolean).join("-")}`, width - margin * 2 - 5), margin + 2, margin + 12);

  const leftX = margin + 1;
  const rightX = width / 2 + 4;
  const labelY = margin + 21;
  doc.setFont("helvetica", "normal"); doc.setTextColor(34, 48, 58);
  drawTemplateField(doc, "Bill to:", "Sri Lanka Telecom (Services) Limited", leftX, labelY, 17, width / 2 - margin - 25);
  drawTemplateField(doc, "", "OSP Division, 50/21,Gamunupura.", leftX + 17, labelY + 5, 0, width / 2 - margin - 25);
  drawTemplateField(doc, "", "Kothalawala, Kaduwela.", leftX + 17, labelY + 10, 0, width / 2 - margin - 25);
  drawTemplateField(doc, "Invoice Number :", invoiceNumber, rightX, labelY, 28, width / 2 - margin - 32);
  drawTemplateField(doc, "Registered Number :", "SLTS-OSP-2023-170", rightX, labelY + 5, 28, width / 2 - margin - 32);
  drawTemplateField(doc, "Invoice Date :", dateLabel, rightX, labelY + 10, 28, width / 2 - margin - 32);
  drawTemplateField(doc, "Job Related Month :", jobMonthLabel, rightX, labelY + 15, 28, width / 2 - margin - 32);
  drawTemplateField(doc, "Invoice :", invoiceType, rightX, labelY + 20, 28, width / 2 - margin - 32);

  const tableX = margin;
  const tableY = labelY + 27;
  const headers = ["Ser.No", "Description", "RTOM", "Qty", "Unit Rate", "Amount"];
  const usableWidth = width - margin * 2;
  const widths = [13, 72, 20, 16, 44, usableWidth - 165];
  const options: TableOptions = { widths, rowHeight: 5.2, headerHeight: 6, fontSize: 6.1, headerSize: 6.1, alignments: ["center", "left", "center", "right", "right", "right"] };
  const headerY = drawTableHeader(doc, headers, tableX, tableY, options);
  const rates = snapshotRates(input.pricingSnapshot);
  const quantities = new Map<string, { quantity: number; baseTotal: number }>();
  for (const line of input.lines) {
    const type = serviceTypeForLine(line);
    const bandIndex = type === "PEO_TV" ? -1 : bandForLine(line);
    if (type !== "PEO_TV" && bandIndex < 0) continue;
    const key = type === "PEO_TV" ? "PEO_TV" : `${type}:${bandIndex}`;
    const aggregate = quantities.get(key) || { quantity: 0, baseTotal: 0 };
    const baseRate = Number(line.baseRate || 0);
    aggregate.quantity += 1;
    aggregate.baseTotal += baseRate || Number(line.invoiceAmount || 0) / (invoiceType === "A" ? 0.9 : 0.1);
    quantities.set(key, aggregate);
  }
  const optionalByCode = new Map(input.optionalItems.map(item => [
    String(item.code || (item.description?.includes("8m") ? "POLE_8" : item.description?.toLowerCase().includes("high rise") ? "HIGH_RISE" : item.description?.includes("5.6m") ? "POLE_56" : item.description?.includes("6.7m") ? "POLE_67" : "")), item,
  ]));
  const getOptional = (code: string) => optionalByCode.get(code);
  const lines: PdfCell[][] = [];
  const addFixedService = (type: "FTTH" | "DATA", bandIndex: number, description: string) => {
    const key = `${type}:${bandIndex}`;
    const aggregate = quantities.get(key) || { quantity: 0, baseTotal: 0 };
    const unitRate = aggregate.quantity ? aggregate.baseTotal / aggregate.quantity : catalogTierRate(rates, type, invoiceBands[bandIndex]);
    lines.push([lines.length + 1, description, "", aggregate.quantity, amountCell(unitRate), amountCell(aggregate.baseTotal)]);
  };
  invoiceBands.forEach((band, index) => addFixedService("FTTH", index, `FTTH Wirings-DW Length- (${band.label})`));
  const addPole = (code: "POLE_56" | "POLE_67", description: string, fallback: number) => {
    const item = getOptional(code);
    const quantity = Number(item?.quantity || 0);
    const amount = Number(item?.baseAmount ?? (Number(item?.unitRate || catalogOptionalRate(rates, code, fallback)) * quantity));
    const rate = quantity ? amount / quantity : catalogOptionalRate(rates, code, fallback);
    lines.push([lines.length + 1, description, "", quantity, amountCell(rate), amountCell(amount)]);
  };
  addPole("POLE_56", "5.6m Pole Installations", 700);
  addPole("POLE_67", "6.7m Pole Installations", 800);
  invoiceBands.forEach((band, index) => addFixedService("DATA", index, `DATA - DW length- (${band.dataLabel})`));
  const peo = quantities.get("PEO_TV") || { quantity: 0, baseTotal: 0 };
  const peoRate = peo.quantity ? peo.baseTotal / peo.quantity : Number([...rates].reverse().find(item => Number(item.peoTvRate) > 0)?.peoTvRate || 1800);
  lines.push([lines.length + 1, "PEO TV - Second visit", "", peo.quantity, amountCell(peoRate), amountCell(peo.baseTotal)]);
  const addOptional = (code: "POLE_8" | "HIGH_RISE", description: string, fallback: number) => {
    const item = getOptional(code);
    const quantity = Number(item?.quantity || 0);
    if (quantity <= 0) return;
    const rate = Number(item?.unitRate || catalogOptionalRate(rates, code, fallback));
    const amount = Number(item?.baseAmount ?? rate * quantity);
    lines.push([lines.length + 1, description, "", quantity, amountCell(rate), amountCell(amount)]);
  };
  addOptional("POLE_8", "8m Pole Installation", 900);
  addOptional("HIGH_RISE", "FTTH - High Rise Building (Configuration only)", 3800);

  const hundredPercentTotal = lines.reduce((total, row) => total + (typeof row[5] === "number" ? row[5] : Number(String(row[5] || "").replace(/,/g, "")) || 0), 0);
  const percentage = invoiceType === "A" ? 90 : 10;
  const actualAmount = Math.round(hundredPercentTotal * percentage) / 100;
  lines.push(["", "", "", "Grand Total (Rs.)", "", amountCell(hundredPercentTotal)]);
  lines.push(["", "", "", "", `${percentage}%`, amountCell(actualAmount)]);
  const rowHeight = 4.8;
  let y = headerY;
  for (const row of lines) {
    const rowFill: [number, number, number] = row.some(cell => typeof cell === "string" && cell.includes("Grand Total")) ? PALE_BLUE : [255, 255, 255];
    let x = tableX;
    row.forEach((cell, index) => {
      const cellWidth = widths[index];
      doc.setFillColor(...rowFill); doc.rect(x, y, cellWidth, rowHeight, "F");
      doc.setDrawColor(...GRID); doc.rect(x, y, cellWidth, rowHeight, "S");
      const isGrandTotal = row.some(value => typeof value === "string" && value.includes("Grand Total"));
      doc.setFont("helvetica", isGrandTotal ? "bold" : "normal");
      doc.setFontSize(5.6); doc.setTextColor(34, 48, 58);
      const mergedTotalLabel = isGrandTotal && index === 3;
      if (!(isGrandTotal && index === 4)) {
        const availableWidth = mergedTotalLabel ? widths[3] + widths[4] - 2 : cellWidth - 1.6;
        const value = textFit(doc, cell, availableWidth);
        const align = mergedTotalLabel ? "left" : options.alignments?.[index] ?? "left";
        const textX = mergedTotalLabel ? x + 1 : align === "left" ? x + 1 : align === "right" ? x + cellWidth - 1 : x + cellWidth / 2;
        doc.text(value, textX, y + rowHeight / 2 + 1, { align });
      }
      x += cellWidth;
    });
    y += rowHeight;
  }
  y += 2.2;
  const bank = input.company.bank || {};
  const fullWidth = width - margin * 2;
  const ink: [number, number, number] = [32, 42, 48];
  const border = (x: number, top: number, w: number, h: number, lineWidth = 0.35) => {
    doc.setDrawColor(...ink);
    doc.setLineWidth(lineWidth);
    doc.rect(x, top, w, h, "S");
  };
  const cell = (x: number, top: number, w: number, h: number, text: string, opts: { bold?: boolean; align?: "left" | "center" | "right"; fontSize?: number; padding?: number; lineWidth?: number } = {}) => {
    border(x, top, w, h, opts.lineWidth);
    doc.setFont("helvetica", opts.bold ? "bold" : "normal");
    doc.setFontSize(opts.fontSize ?? 6.1);
    doc.setTextColor(...ink);
    const pad = opts.padding ?? 1.2;
    const value = textFit(doc, text, w - pad * 2);
    const align = opts.align ?? "left";
    const tx = align === "center" ? x + w / 2 : align === "right" ? x + w - pad : x + pad;
    doc.text(value, tx, top + h / 2 + 1, { align });
  };
  const gap = 2;

  // Template certification and side-by-side signoff fields.
  cell(margin, y, fullWidth, 7, "I do hereby certify that the above details are true and correct", { bold: true, fontSize: 7, padding: 1.4 });
  y += 9;
  const half = fullWidth / 2;
  cell(margin, y, half, 15, `Prepared By:\n${input.company.name || "NNS Enterprise"}`, { bold: true, align: "center", fontSize: 7 });
  cell(margin + half, y, half, 15, "Received By: (Sign/Date)\nShould be Sign by SLTS officer", { bold: true, align: "center", fontSize: 6.7 });
  y += 15 + gap;

  // Bank/cheque information uses the current Company Settings values only.
  cell(margin, y, fullWidth, 5, `Checque should be drawn in favour of "${bank.accountTitle || ""}"`, { fontSize: 6.3 });
  y += 5;
  const detailLeft = fullWidth * 0.48;
  cell(margin, y, detailLeft, 4.5, `Account No: ${bank.accountNumber || ""}`, { fontSize: 6.1 });
  cell(margin + detailLeft, y, fullWidth - detailLeft, 4.5, `Bank: ${bank.bankName || ""}`, { fontSize: 6.1 });
  y += 4.5;
  cell(margin, y, detailLeft, 4.5, `Branch: ${bank.branchCode || ""}`, { fontSize: 6.1 });
  cell(margin + detailLeft, y, fullWidth - detailLeft, 4.5, "", { fontSize: 6.1 });
  y += 4.5 + gap;

  // SLTS approval grid mirrors the template's bordered review area.
  cell(margin, y, fullWidth, 5.5, "SLTS Use Only:", { bold: true, fontSize: 7, lineWidth: 0.6 });
  y += 5.5;
  const labelW = 22;
  const financeW = 36;
  const regionalW = (fullWidth - labelW - financeW) * 0.48;
  const headOfficeW = fullWidth - labelW - financeW - regionalW;
  cell(margin, y, labelW, 6.5, "", { lineWidth: 0.55 });
  cell(margin + labelW, y, regionalW, 6.5, "Regional Signature", { bold: true, align: "center", fontSize: 6.5, lineWidth: 0.55 });
  cell(margin + labelW + regionalW, y, headOfficeW, 6.5, "Head Office Signature", { bold: true, align: "center", fontSize: 6.5, lineWidth: 0.55 });
  cell(margin + fullWidth - financeW, y, financeW, 6.5, "Finance", { bold: true, align: "center", fontSize: 6.5, lineWidth: 0.55 });
  y += 6.5;
  const approvalRowH = 10;
  ["Checked by:", "Certified By:", "Approved By:"].forEach((label, index) => {
    const rowY = y + index * approvalRowH;
    cell(margin, rowY, labelW, approvalRowH, label, { bold: true, fontSize: 5.8, lineWidth: 0.55 });
    cell(margin + labelW, rowY, regionalW, approvalRowH, "", { lineWidth: 0.55 });
    cell(margin + labelW + regionalW, rowY, headOfficeW, approvalRowH, "", { lineWidth: 0.55 });
  });
  cell(margin + fullWidth - financeW, y, financeW, approvalRowH * 3, "Recommended By:", { bold: true, fontSize: 5.8, lineWidth: 0.55 });
  y += approvalRowH * 3;
  const officeLabelW = labelW;
  const officeDescW = regionalW;
  const yesNoW = 14;
  const signDateW = fullWidth - officeLabelW - officeDescW - yesNoW - financeW;
  cell(margin, y, officeLabelW, 6, "", { lineWidth: 0.55 });
  cell(margin + officeLabelW, y, officeDescW, 6, "Office Use Only", { bold: true, fontSize: 5.8, lineWidth: 0.55 });
  cell(margin + officeLabelW + officeDescW, y, yesNoW, 6, "Yes/No", { bold: true, align: "center", fontSize: 5.5, lineWidth: 0.55 });
  cell(margin + officeLabelW + officeDescW + yesNoW, y, signDateW, 6, "Sign/Date", { bold: true, align: "center", fontSize: 5.8, lineWidth: 0.55 });
  y += 6;
  cell(margin, y, officeLabelW, 12, "", { lineWidth: 0.55 });
  cell(margin + officeLabelW, y, officeDescW, 12, "Material Balance Sheet's received", { align: "center", fontSize: 5.7, lineWidth: 0.55 });
  cell(margin + officeLabelW + officeDescW, y, yesNoW, 12, "Yes", { fontSize: 5.8, lineWidth: 0.55 });
  cell(margin + officeLabelW + officeDescW + yesNoW, y, signDateW, 12, "", { lineWidth: 0.55 });
  return new Uint8Array(doc.output("arraybuffer"));
}

export interface InvoiceBackRow {
  telephoneNo: string;
  status: string | null;
  completeDate: string;
  f1: number;
  g1: number;
  lHook: number;
  cHook: number;
  retainers: number;
  internalWire: number;
  cat5: number;
  fac: number;
  fiberRosette: number;
  topBolt: number;
  conduit: number;
  casing: number;
  poleDetails: string;
}

export function generateInvoiceBackPdf(input: { monthLabel: string; invoiceNumber: string; rows: InvoiceBackRow[] }) {
  const doc = newPdf("landscape", "a3");
  const margin = 8;
  const { width } = pageSize(doc);
  const y = reportHeader(doc, "FTTH - (PH/HR)", `Contractor Name: NNS Enterprise     Invoice No: ${input.invoiceNumber}     Month: ${input.monthLabel}`, margin);
  const headers = ["No", "TP Number", "Configs", "RTOM", "Complete Date", "F-1", "G-1", "DW-LH", "DW-CH", "DW-RT", "IW-N", "Cat 5", "FAC", "Fiber Rossette", "Top Bolt", "Conduit", "Casing", "Pole Details & Remarks"];
  const widths = [12, 25, 16, 18, 24, 17, 17, 17, 17, 17, 17, 17, 17, 23, 18, 18, 18, width - (margin * 2 + 12 + 25 + 16 + 18 + 24 + 17 * 9 + 23 + 18 + 18 + 18)];
  const options: TableOptions = { widths, rowHeight: 5.8, fontSize: 6, headerSize: 5.6, alignments: ["center", "left", "center", "center", "center", ...Array(13).fill("right")] as TableOptions["alignments"] };
  const tableY = drawTableHeader(doc, headers, margin, y, options);
  const rows = input.rows.map((row, index) => [index + 1, row.telephoneNo, row.status || "OK", "R-HR", row.completeDate, row.f1, row.g1, row.lHook, row.cHook, row.retainers, row.internalWire, row.cat5, row.fac, row.fiberRosette, row.topBolt, row.conduit, row.casing, row.poleDetails]);
  drawRows(doc, rows, headers, options, tableY, margin, true);
  addPageNumbers(doc);
  return new Uint8Array(doc.output("arraybuffer"));
}

export function generateDrumNumberPdf(input: { monthLabel: string; rows: Array<{ telephoneNo: string; cableStart: number; cableMiddle: number; cableEnd: number; drumNumber: string; wastage: number }> }) {
  const doc = newPdf("landscape", "a4");
  const margin = 10;
  const headers = ["NO", "TP", "DW DP", "DW C HOOK", "DW CUS", "DRUM NUMBER", "DW WASTAGE"];
  const widths = [15, 35, 36, 36, 36, 52, 40];
  const options: TableOptions = { widths, rowHeight: 6.5, fontSize: 7, headerSize: 6.5, headerFill: BRAND_NAVY, headerText: [255, 255, 255], alignments: ["center", "left", "right", "right", "right", "center", "right"] };
  const y = reportHeader(doc, "DRUM NUMBER SHEET", `NNS Enterprise     Month: ${input.monthLabel}`, margin);
  const tableY = drawTableHeader(doc, headers, margin, y, options);
  const rows = input.rows.map((row, index) => [index + 1, row.telephoneNo, row.cableStart, row.cableMiddle, row.cableEnd, row.drumNumber, row.wastage]);
  let footerY = drawRows(doc, rows, headers, options, tableY, margin, true) + 12;
  const { height, width } = pageSize(doc);
  if (footerY > height - 26) { doc.addPage(); footerY = margin + 8; }
  doc.setFont("helvetica", "normal"); doc.setFontSize(8);
  doc.text("Prepared by: _________________     Date: _________________", margin, footerY);
  doc.text("Checked by: _________________     (with rubber stamp)", width / 2, footerY);
  addPageNumbers(doc);
  return new Uint8Array(doc.output("arraybuffer"));
}
