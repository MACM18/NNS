import jsPDF from "jspdf";

export const MONTHLY_REPORT_PDF_DESIGN_VERSION = "nns-blue-compact-v3";

export type PdfCell = string | number | null | undefined;
type TableOptions = { widths: number[]; rowHeight?: number; headerHeight?: number; fontSize?: number; headerSize?: number; font?: "normal" | "bold"; alignments?: Array<"left" | "center" | "right"> };
const BRAND_NAVY: [number, number, number] = [19, 65, 96];
const BRAND_BLUE: [number, number, number] = [19, 132, 184];
const PALE_BLUE: [number, number, number] = [225, 241, 249];
const GRID: [number, number, number] = [190, 208, 218];

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
  doc.setFillColor(...PALE_BLUE);
  doc.setDrawColor(...GRID);
  doc.setLineWidth(0.12);
  headers.forEach((header, index) => {
    const w = opts.widths[index];
    doc.rect(left, y, w, height, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(opts.headerSize ?? opts.fontSize ?? 8);
    doc.setTextColor(...BRAND_NAVY);
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
  dates.forEach(date => {
    const groupWidth = dayWidth * 4;
    doc.setFillColor(...BRAND_NAVY);
    doc.rect(left, y, groupWidth, groupHeight, "FD");
    doc.setFont("helvetica", "bold"); doc.setFontSize(5.5); doc.setTextColor(255, 255, 255);
    const dateLabel = new Date(`${date}T00:00:00Z`).toLocaleDateString("en-GB", { day: "2-digit", month: "short", timeZone: "UTC" });
    doc.text(dateLabel, left + groupWidth / 2, y + 3.7, { align: "center" });
    ["Prev", "Issued", "Usage", "Return"].forEach(label => {
      doc.setFillColor(...PALE_BLUE);
      doc.rect(left, y + groupHeight, dayWidth, labelHeight, "FD");
      doc.setFont("helvetica", "bold"); doc.setFontSize(4.7); doc.setTextColor(...BRAND_NAVY);
      doc.text(textFit(doc, label, dayWidth - 0.8), left + dayWidth / 2, y + groupHeight + 3.6, { align: "center" });
      left += dayWidth;
    });
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
      doc.setFillColor(...rowFill);
      doc.rect(x, y, w, rowHeight, "F");
      doc.setDrawColor(...GRID);
      doc.rect(x, y, w, rowHeight, "S");
      doc.setFont("helvetica", isTotal ? "bold" : opts.font ?? "normal");
      doc.setTextColor(34, 48, 58);
      const value = textFit(doc, cell, w - 1.5);
      const align = opts.alignments?.[index] ?? (typeof cell === "number" ? "right" : "left");
      doc.text(value, align === "left" ? x + 1 : align === "right" ? x + w - 1 : x + w / 2, y + rowHeight / 2 + 1.1, { align });
      x += w;
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
    const options: TableOptions = { widths, rowHeight: 5.8, fontSize: 5.4, headerSize: 5.1, alignments };
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
  const doc = newPdf("landscape", "a4");
  const margin = 10;
  const title = "MATERIAL BALANCE SHEET FOR NEW CONNECTION";
  const subtitle = `CONTRACTOR NAME: NNS Enterprise     AREA: HR-PH     MONTH: ${input.monthLabel.toUpperCase()}     YEAR: ${input.year}     NEW CONNECTION TYPE: FTTH`;
  const headers = ["No", "Item", "Opening Balance", "Stock Issued", "", "In hand End of the month", "Material used for invoice", "Ending WIP Material"];
  const widths = [12, 62, 31, 28, 8, 38, 38, 35];
  const options: TableOptions = { widths, rowHeight: 6.4, fontSize: 6.4, headerSize: 5.7, alignments: ["center", "left", "right", "right", "center", "right", "right", "right"] };
  const y = reportHeader(doc, title, subtitle, margin);
  const tableY = drawTableHeader(doc, headers, margin, y, options);
  const rows = input.rows.map((row, index) => [index + 1, row.item, row.opening, row.issued, "", row.inHand, row.used, row.endingWip]);
  drawRows(doc, rows, headers, options, tableY, margin, true);
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
export interface OptionalInvoiceSnapshot { description?: string; quantity?: number; unitRate?: number; invoiceAmount?: number }

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

function drawFooterCard(doc: jsPDF, x: number, y: number, width: number, height: number, title: string, lines: string[]) {
  doc.setDrawColor(...GRID); doc.setLineWidth(0.15); doc.setFillColor(255, 255, 255);
  doc.roundedRect(x, y, width, height, 1.2, 1.2, "FD");
  doc.setFillColor(...PALE_BLUE); doc.rect(x, y, width, 5, "F");
  doc.setFont("helvetica", "bold"); doc.setFontSize(6.3); doc.setTextColor(...BRAND_NAVY);
  doc.text(title.toUpperCase(), x + 2, y + 3.4);
  doc.setFont("helvetica", "normal"); doc.setFontSize(6.2); doc.setTextColor(35, 48, 58);
  lines.forEach((line, index) => doc.text(textFit(doc, line, width - 4), x + 2, y + 9 + index * 3.5));
}

export function generateInvoicePdf(input: { invoice: { invoiceNumber: string; invoiceDate: Date | string | null; jobMonth: string | null; invoiceType: string | null; totalAmount: number }; lines: InvoiceSnapshotLine[]; optionalItems: OptionalInvoiceSnapshot[]; company: InvoiceCompanyDetails }) {
  const doc = newPdf("portrait", "a4");
  const margin = 9;
  const { width } = pageSize(doc);
  const invoiceType = input.invoice.invoiceType || "";
  const title = `INVOICE ${invoiceType}`;
  const bandY = margin;
  doc.setFillColor(...BRAND_NAVY); doc.rect(margin, bandY, width - margin * 2, 18, "F");
  doc.setFillColor(...BRAND_BLUE); doc.rect(margin, bandY + 17, width - margin * 2, 1, "F");
  doc.setFont("helvetica", "bold"); doc.setFontSize(15); doc.setTextColor(255, 255, 255);
  doc.text(textFit(doc, input.company.name || "NNS Enterprise", 118), margin + 4, bandY + 8);
  doc.setFontSize(11); doc.text(title, width - margin - 4, bandY + 8, { align: "right" });
  doc.setFont("helvetica", "normal"); doc.setFontSize(7); doc.setTextColor(255, 255, 255);
  const companyLine = [input.company.address, ...input.company.contacts, input.company.website].filter(Boolean).join(" · ");
  doc.text(textFit(doc, companyLine, width - margin * 2 - 8), margin + 4, bandY + 14);

  let y = bandY + 25;
  const detailsTop = y;
  doc.setFont("helvetica", "bold"); doc.setFontSize(7.2); doc.setTextColor(...BRAND_NAVY);
  doc.text("BILL TO", margin, y);
  doc.text("INVOICE DETAILS", width / 2 + 3, y);
  y += 4;
  doc.setFont("helvetica", "normal"); doc.setTextColor(35, 48, 58); doc.setFontSize(7);
  const billTo = ["Sri Lanka Telecom (Services) Limited", "OSP Division, 50/21, Gamunupura.", "Kothalawala, Kaduwela."];
  billTo.forEach((line, index) => doc.text(line, margin, y + index * 3.7));
  const right = [
    ["Invoice No.", input.invoice.invoiceNumber],
    ["Registered No.", input.company.registeredNumber],
    ["Invoice Date", input.invoice.invoiceDate ? new Date(input.invoice.invoiceDate).toLocaleDateString("en-GB") : ""],
    ["Job Month", input.invoice.jobMonth || ""],
    ["Invoice Type", invoiceType],
  ];
  right.forEach(([label, value], index) => {
    const rowY = detailsTop + 4 + index * 3.7;
    doc.setFont("helvetica", "bold"); doc.text(`${label}:`, width / 2 + 3, rowY);
    doc.setFont("helvetica", "normal"); doc.text(textFit(doc, value, 56), width - margin, rowY, { align: "right" });
  });
  y += 15.5;

  const headers = ["Ser.No", "Description", "RTOM", "Qty", "Unit Rate", "Amount"];
  const widths = [12, 84, 19, 16, 28, 33];
  const options: TableOptions = { widths, rowHeight: 6.2, headerHeight: 6.5, fontSize: 6.4, headerSize: 6.2, alignments: ["center", "left", "center", "right", "right", "right"] };
  const lineBuckets = new Map<string, { description: string; qty: number; rate: number; amount: number }>();
  for (const line of input.lines) {
    const description = line.description || line.serviceType || "FTTH";
    const key = `${description}\u0000${Number(line.baseRate || 0)}`;
    const bucket = lineBuckets.get(key) || { description, qty: 0, rate: Number(line.baseRate || 0), amount: 0 };
    bucket.qty += 1; bucket.amount += Number(line.invoiceAmount || 0); lineBuckets.set(key, bucket);
  }
  const values: PdfCell[][] = [];
  let sequence = 1;
  for (const bucket of lineBuckets.values()) values.push([sequence++, bucket.description, "", bucket.qty, bucket.rate.toFixed(2), bucket.amount.toFixed(2)]);
  for (const item of input.optionalItems) {
    if (Number(item.quantity || 0) <= 0) continue;
    values.push([sequence++, item.description || "Optional installation", "", Number(item.quantity), Number(item.unitRate || 0).toFixed(2), Number(item.invoiceAmount || 0).toFixed(2)]);
  }
  values.push(["", "", "", "Grand Total (Rs.)", "", Number(input.invoice.totalAmount || 0).toFixed(2)]);
  values.push(["", "", "", "", `${invoiceType === "A" ? "90%" : "10%"} of service value`, ""]);
  const tableHeader = () => drawTableHeader(doc, headers, margin, reportHeader(doc, title, input.invoice.jobMonth || "", margin, true), options);
  const tableY = drawTableHeader(doc, headers, margin, y, options);
  const finalY = drawRows(doc, values, headers, options, tableY, margin, tableHeader);
  const page = pageSize(doc);
  let footerY = finalY + 5;
  const bank = input.company.bank || {};
  const paymentLines = [
    bank.accountTitle ? `Cheque payable to: ${bank.accountTitle}` : "",
    bank.bankName ? `Bank: ${bank.bankName}` : "",
    bank.accountNumber ? `Account No.: ${bank.accountNumber}` : "",
    bank.branchCode ? `Branch: ${bank.branchCode}` : "",
    bank.iban ? `IBAN: ${bank.iban}` : "",
  ].filter(Boolean);
  const footerHeight = 65 + paymentLines.length * 3.5;
  if (footerY + footerHeight > page.height - margin) {
    doc.addPage();
    footerY = reportHeader(doc, `${title} · Payment & approval`, input.invoice.jobMonth || "", margin, true) + 1;
  }
  doc.setFont("helvetica", "italic"); doc.setFontSize(6.4); doc.setTextColor(40, 55, 65);
  doc.text("I do hereby certify that the above details are true and correct.", margin, footerY + 2.5);
  footerY += 5;
  const halfWidth = (width - margin * 2 - 5) / 2;
  drawFooterCard(doc, margin, footerY, halfWidth, 12, "Prepared by", [input.company.name || ""]);
  drawFooterCard(doc, margin + halfWidth + 5, footerY, halfWidth, 12, "Received by · SLTS officer", ["Signature / Date"]);
  footerY += 14;
  if (paymentLines.length) {
    drawFooterCard(doc, margin, footerY, width - margin * 2, 6 + Math.max(1, paymentLines.length) * 3.5, "Payment details", paymentLines);
    footerY += 8 + paymentLines.length * 3.5;
  }

  const sltsTitleHeight = 5;
  doc.setFillColor(...BRAND_NAVY); doc.rect(margin, footerY, width - margin * 2, sltsTitleHeight, "F");
  doc.setFont("helvetica", "bold"); doc.setFontSize(6.3); doc.setTextColor(255, 255, 255);
  doc.text("SLTS USE ONLY", margin + 2, footerY + 3.5);
  footerY += sltsTitleHeight;
  const gap = 2;
  const cellWidth = (width - margin * 2 - gap * 2) / 3;
  const officeRows = [
    ["Regional Signature", "Head Office Signature", "Finance"],
    ["Checked by", "Recommended by", "Certified by"],
    ["Approved by", "Office Use Only · Yes/No · Sign/Date", "Material Balance Sheet received · Yes"],
  ];
  officeRows.forEach(labels => {
    labels.forEach((label, index) => {
      const x = margin + index * (cellWidth + gap);
      doc.setDrawColor(...GRID); doc.setFillColor(255, 255, 255); doc.rect(x, footerY, cellWidth, 11, "FD");
      doc.setFont("helvetica", "bold"); doc.setFontSize(5.5); doc.setTextColor(...BRAND_NAVY);
      doc.text(textFit(doc, label, cellWidth - 3), x + 1.5, footerY + 4);
      doc.setDrawColor(165, 184, 194); doc.line(x + 1.5, footerY + 8.8, x + cellWidth - 1.5, footerY + 8.8);
    });
    footerY += 11;
  });
  addPageNumbers(doc);
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
  const options: TableOptions = { widths, rowHeight: 6.5, fontSize: 7, headerSize: 6.5, alignments: ["center", "left", "right", "right", "right", "center", "right"] };
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
