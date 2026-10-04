import jsPDF from "jspdf";

export type PdfCell = string | number | null | undefined;
type TableOptions = { widths: number[]; rowHeight?: number; fontSize?: number; headerSize?: number; font?: "normal" | "bold"; shadeHeader?: boolean; alignments?: Array<"left" | "center" | "right"> };

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
  doc.setTextColor(20, 31, 45);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(continued ? 10 : 14);
  doc.text(title + (continued ? " (continued)" : ""), width / 2, margin + 5, { align: "center" });
  if (!continued && subtitle) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(subtitle, width / 2, margin + 10, { align: "center" });
  }
  return margin + (continued ? 11 : 15);
}

function drawTableHeader(doc: jsPDF, headers: PdfCell[], x: number, y: number, opts: TableOptions) {
  const height = opts.rowHeight ?? 8;
  let left = x;
  doc.setFillColor(235, 238, 242);
  doc.setDrawColor(60, 66, 74);
  doc.setLineWidth(0.15);
  headers.forEach((header, index) => {
    const w = opts.widths[index];
    doc.rect(left, y, w, height, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(opts.headerSize ?? opts.fontSize ?? 8);
    doc.setTextColor(20, 31, 45);
    const value = textFit(doc, header, w - 1.5);
    const align = opts.alignments?.[index] ?? "center";
    doc.text(value, align === "left" ? left + 1 : align === "right" ? left + w - 1 : left + w / 2, y + height / 2 + 1.2, { align });
    left += w;
  });
  return y + height;
}

function drawDailyHeader(doc: jsPDF, dates: string[], x: number, y: number, itemWidth: number, unitWidth: number, dayWidth: number) {
  const groupHeight = 7;
  const labelHeight = 7;
  const totalHeight = groupHeight + labelHeight;
  let left = x;
  doc.setDrawColor(60, 66, 74);
  doc.setLineWidth(0.15);
  doc.setFillColor(235, 238, 242);
  for (const [label, width] of [["Item Name", itemWidth], ["Unit", unitWidth]] as const) {
    doc.rect(left, y, width, totalHeight, "FD");
    doc.setFont("helvetica", "bold"); doc.setFontSize(6); doc.setTextColor(20, 31, 45);
    doc.text(label, label === "Item Name" ? left + 1 : left + width / 2, y + totalHeight / 2 + 1, { align: label === "Item Name" ? "left" : "center" });
    left += width;
  }
  dates.forEach(date => {
    const groupWidth = dayWidth * 4;
    doc.rect(left, y, groupWidth, groupHeight, "FD");
    doc.setFont("helvetica", "bold"); doc.setFontSize(6); doc.setTextColor(20, 31, 45);
    const dateLabel = new Date(`${date}T00:00:00Z`).toLocaleDateString("en-GB", { day: "2-digit", month: "short", timeZone: "UTC" });
    doc.text(dateLabel, left + groupWidth / 2, y + 4.8, { align: "center" });
    ["Prev. Day", "Issued", "Usage", "Balance Return"].forEach(label => {
      doc.rect(left, y + groupHeight, dayWidth, labelHeight, "FD");
      doc.setFont("helvetica", "bold"); doc.setFontSize(5); doc.setTextColor(20, 31, 45);
      doc.text(textFit(doc, label, dayWidth - 1), left + dayWidth / 2, y + groupHeight + 4.5, { align: "center" });
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
  doc.setTextColor(25, 25, 25);
  doc.setDrawColor(75, 78, 83);
  doc.setLineWidth(0.12);
  for (const row of rows) {
    if (y + rowHeight > height - margin - 6) {
      doc.addPage();
      y = typeof repeatHeader === "function" ? repeatHeader() : repeatHeader ? drawTableHeader(doc, headers, margin, margin, opts) : margin;
      doc.setFont("helvetica", opts.font ?? "normal");
      doc.setFontSize(opts.fontSize ?? 8);
    }
    let x = margin;
    row.forEach((cell, index) => {
      const w = opts.widths[index];
      doc.rect(x, y, w, rowHeight);
      const value = textFit(doc, cell, w - 1.5);
      const align = opts.alignments?.[index] ?? (typeof cell === "number" ? "right" : "left");
      doc.text(value, align === "left" ? x + 1 : align === "right" ? x + w - 1 : x + w / 2, y + rowHeight / 2 + 1.1, { align });
      x += w;
    });
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
  const itemWidth = 58, unitWidth = 12;
  const daysPerPage = 5;
  for (let offset = 0; offset < Math.max(dates.length, 1); offset += daysPerPage) {
    if (offset > 0) doc.addPage();
    const slice = dates.slice(offset, offset + daysPerPage);
    const dayWidth = 16.4;
    const groupedWidths = slice.flatMap(() => [dayWidth, dayWidth, dayWidth, dayWidth]);
    const headers = ["Item Name", "Unit", ...slice.flatMap(() => ["Prev. Day", "Issued", "Usage", "Balance Return"])];
    const widths = [itemWidth, unitWidth, ...groupedWidths];
    const alignments = ["left", "center", ...slice.flatMap(() => ["right", "right", "right", "right"])] as TableOptions["alignments"];
    const options: TableOptions = { widths, rowHeight: 7, fontSize: 6, headerSize: 5.5, alignments };
    const y = reportHeader(doc, "NNS Enterprise - Daily Material Balance", input.monthLabel, margin, offset > 0);
    const tableY = drawDailyHeader(doc, slice, margin, y, itemWidth, unitWidth, dayWidth);
    const rows: PdfCell[][] = input.items.map(item => [item.sourceItemName, item.sourceUnit || "", ...slice.flatMap<PdfCell>(date => {
      const entry = item.dailyEntries.find(day => day.date === date);
      return entry ? [entry.previousBalance, entry.issued, entry.usage, entry.balanceReturn] : ["", "", "", ""];
    })]);
    drawRows(doc, rows, headers, options, tableY, margin, true);
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
  const options: TableOptions = { widths, rowHeight: 8, fontSize: 7, headerSize: 6, alignments: ["center", "left", "right", "right", "center", "right", "right", "right"] };
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

export function generateInvoicePdf(input: { invoice: { invoiceNumber: string; invoiceDate: Date | string | null; jobMonth: string | null; invoiceType: string | null; totalAmount: number }; lines: InvoiceSnapshotLine[]; optionalItems: OptionalInvoiceSnapshot[]; company: { name: string; address: string; contacts: string[]; registeredNumber: string } }) {
  const doc = newPdf("portrait", "a4");
  const margin = 9;
  const { width } = pageSize(doc);
  const colX = [margin, margin + 9, margin + 104, margin + 126, margin + 141, margin + 164, width - margin];
  let y = margin + 5;
  doc.setFont("helvetica", "bold"); doc.setFontSize(17); doc.text(input.company.name || "NNS Enterprise", margin, y);
  doc.setFont("helvetica", "normal"); doc.setFontSize(8); y += 6; doc.text(input.company.address || "No 89, Welikala, Pokunuwita", margin, y);
  y += 4; doc.text(`Contact Number :- ${input.company.contacts.join("- ") || "0789070440-0724918351-0342263642"}`, margin, y);
  if (input.company.registeredNumber) { y += 4; doc.text(`Registered Number : ${input.company.registeredNumber}`, margin, y); }
  y += 10;
  doc.setFont("helvetica", "normal");
  const details = [
    ["Bill to:", "Sri Lanka Telecom (Services) Limited"],
    ["", "OSP Division, 50/21, Gamunupura."],
    ["", "Kothalawala, Kaduwela."],
  ];
  for (const [label, text] of details) { doc.setFont("helvetica", label ? "bold" : "normal"); doc.text(label, margin, y); doc.setFont("helvetica", "normal"); doc.text(text, margin + 20, y); y += 4; }
  const right = [
    ["Invoice Number :", input.invoice.invoiceNumber],
    ["Registered Number :", input.company.registeredNumber || "SLTS-OSP-2023-170"],
    ["Invoice Date :", input.invoice.invoiceDate ? new Date(input.invoice.invoiceDate).toLocaleDateString("en-GB") : ""],
    ["Job Related Month :", input.invoice.jobMonth || ""],
    ["Invoice :", input.invoice.invoiceType || ""],
  ];
  let rightY = margin + 15;
  for (const [label, value] of right) { doc.setFont("helvetica", "bold"); doc.text(label, width - margin - 69, rightY); doc.setFont("helvetica", "normal"); doc.text(value, width - margin, rightY, { align: "right" }); rightY += 5; }
  y += 6;
  const headers = ["Ser.No", "Description", "RTOM", "Qty", "Unit Rate", "Amount"];
  const widths = [12, 84, 19, 16, 28, 33];
  const options: TableOptions = { widths, rowHeight: 8, fontSize: 7, headerSize: 7, alignments: ["center", "left", "center", "right", "right", "right"] };
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
  values.push(["", "", "", "", `${input.invoice.invoiceType === "A" ? "90%" : "10%"} of service value`, ""]);
  const tableY = drawTableHeader(doc, headers, margin, y, options);
  const finalY = drawRows(doc, values, headers, options, tableY, margin, true);
  const { height } = pageSize(doc);
  if (finalY + 12 > height - margin) doc.addPage();
  const certY = finalY + 8 > height - margin ? margin + 8 : finalY + 8;
  doc.setFontSize(7); doc.text("I do hereby certify that the above details are true and correct", margin, Math.min(height - 12, certY));
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
  const options: TableOptions = { widths, rowHeight: 7, fontSize: 6.5, headerSize: 6, alignments: ["center", "left", "center", "center", "center", ...Array(13).fill("right")] as TableOptions["alignments"] };
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
  const options: TableOptions = { widths, rowHeight: 8, fontSize: 8, headerSize: 8, alignments: ["center", "left", "right", "right", "right", "center", "right"] };
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
