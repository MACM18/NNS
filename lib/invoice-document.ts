export type InvoiceDocumentFields = {
  billToLabel: string; billToName: string; billToAddress1: string; billToAddress2: string;
  invoiceNumberLabel: string; registeredNumberLabel: string; registeredNumber: string;
  invoiceDateLabel: string; jobMonthLabel: string; invoiceTypeLabel: string; grandTotalLabel: string;
  certifyText: string; preparedByLabel: string; preparedByName: string; receivedByLabel: string;
  receivedByInstruction: string; chequeInstruction: string; accountNumberLabel: string; bankLabel: string;
  branchLabel: string; sltsUseOnlyLabel: string; regionalSignatureLabel: string;
  headOfficeSignatureLabel: string; financeLabel: string; checkedByLabel: string;
  certifiedByLabel: string; approvedByLabel: string; recommendedByLabel: string;
  officeUseOnlyLabel: string; materialBalanceReceivedLabel: string; yesNoLabel: string; signDateLabel: string;
  materialBalanceReceivedAnswer: string; contactLabel: string;
  headerSerial: string; headerDescription: string; headerRtom: string; headerQuantity: string; headerUnitRate: string; headerAmount: string;
};

export type CustomInvoiceRow = { id: string; description: string; rtom: string; quantity: number; unitRate: number };
export type InvoiceContentSnapshot = { fields: InvoiceDocumentFields; serviceDescriptions: Record<string, string>; customRows: CustomInvoiceRow[]; percentA: number; percentB: number; invoiceDate?: string; jobMonth?: string };

export const SERVICE_DESCRIPTION_DEFAULTS: Record<string, string> = {
  ftth0: "FTTH Wirings-DW Length- (0-100)", ftth1: "FTTH Wirings-DW Length- (101-200)", ftth2: "FTTH Wirings-DW Length- (201-300)", ftth3: "FTTH Wirings-DW Length- (301-400)", ftth4: "FTTH Wirings-DW Length- (401-500)", ftth5: "FTTH Wirings-DW Length- (Over 500)",
  pole56: "5.6m Pole Installations", pole67: "6.7m Pole Installations",
  data0: "DATA - DW length- (0-100)", data1: "DATA - DW length- (101-200)", data2: "DATA - DW length- (201-300)", data3: "DATA - DW length- (301-400)", data4: "DATA - DW length- (401-500)", data5: "DATA - DW length- (500 ++)",
  peoTv: "PEO TV - Second visit", pole8: "8m Pole Installation", highRise: "FTTH - High Rise Building (Configuration only)",
};
export const SERVICE_DESCRIPTION_LABELS: Record<string, string> = {
  ftth0: "FTTH DW 0–100 m", ftth1: "FTTH DW 101–200 m", ftth2: "FTTH DW 201–300 m", ftth3: "FTTH DW 301–400 m", ftth4: "FTTH DW 401–500 m", ftth5: "FTTH DW 500+ m",
  pole56: "5.6 m pole", pole67: "6.7 m pole", data0: "Data DW 0–100 m", data1: "Data DW 101–200 m", data2: "Data DW 201–300 m", data3: "Data DW 301–400 m", data4: "Data DW 401–500 m", data5: "Data DW 500+ m", peoTv: "Peo TV second visit", pole8: "8 m pole", highRise: "High rise configuration",
};

export const DEFAULT_INVOICE_DOCUMENT_FIELDS: InvoiceDocumentFields = {
  billToLabel: "Bill to:", billToName: "Sri Lanka Telecom (Services) Limited",
  billToAddress1: "OSP Division, 50/21,Gamunupura.", billToAddress2: "Kothalawala, Kaduwela.",
  invoiceNumberLabel: "Invoice Number :", registeredNumberLabel: "Registered Number :", registeredNumber: "SLTS-OSP-2023-170",
  invoiceDateLabel: "Invoice Date :", jobMonthLabel: "Job Related Month :", invoiceTypeLabel: "Invoice :",
  grandTotalLabel: "Grand Total (Rs.)", certifyText: "I do hereby certify that the above details are true and correct",
  preparedByLabel: "Prepared By:", preparedByName: "NNS Enterprise", receivedByLabel: "Received By: (Sign/Date)",
  receivedByInstruction: "Should be Sign by SLTS officer", chequeInstruction: "Checque should be drawn in favour of",
  accountNumberLabel: "Account No:", bankLabel: "Bank:", branchLabel: "Branch:", sltsUseOnlyLabel: "SLTS Use Only:",
  regionalSignatureLabel: "Regional Signature", headOfficeSignatureLabel: "Head Office Signature", financeLabel: "Finance",
  checkedByLabel: "Checked by:", certifiedByLabel: "Certified By:", approvedByLabel: "Approved By:",
  recommendedByLabel: "Recommended By:", officeUseOnlyLabel: "Office Use Only",
  materialBalanceReceivedLabel: "Material Balance Sheet's received", yesNoLabel: "Yes/No", signDateLabel: "Sign/Date",
  materialBalanceReceivedAnswer: "Yes", contactLabel: "Contact Number :-",
  headerSerial: "Ser.No", headerDescription: "Description", headerRtom: "RTOM", headerQuantity: "Qty", headerUnitRate: "Unit Rate", headerAmount: "Amount",
};

const FIELD_LIMITS: Record<keyof InvoiceDocumentFields, number> = {
  billToLabel: 80, billToName: 200, billToAddress1: 300, billToAddress2: 300,
  invoiceNumberLabel: 80, registeredNumberLabel: 80, registeredNumber: 120,
  invoiceDateLabel: 80, jobMonthLabel: 80, invoiceTypeLabel: 80, grandTotalLabel: 100,
  certifyText: 300, preparedByLabel: 80, preparedByName: 200, receivedByLabel: 120,
  receivedByInstruction: 200, chequeInstruction: 200, accountNumberLabel: 80, bankLabel: 80,
  branchLabel: 80, sltsUseOnlyLabel: 100, regionalSignatureLabel: 100,
  headOfficeSignatureLabel: 120, financeLabel: 80, checkedByLabel: 80, certifiedByLabel: 80,
  approvedByLabel: 80, recommendedByLabel: 100, officeUseOnlyLabel: 100,
  materialBalanceReceivedLabel: 150, yesNoLabel: 40, signDateLabel: 80, materialBalanceReceivedAnswer: 40, contactLabel: 80,
  headerSerial: 40, headerDescription: 80, headerRtom: 40, headerQuantity: 40, headerUnitRate: 60, headerAmount: 60,
};

export function normalizeInvoiceContentSnapshot(value: unknown, ratio = { percentA: 90, percentB: 10 }): InvoiceContentSnapshot {
  const record = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const rawFields = record.fields && typeof record.fields === "object" ? record.fields as Record<string, unknown> : {};
  const fields = Object.fromEntries((Object.keys(FIELD_LIMITS) as Array<keyof InvoiceDocumentFields>).map(key => {
    const text = String(rawFields[key] ?? DEFAULT_INVOICE_DOCUMENT_FIELDS[key]).trim();
    if (text.length > FIELD_LIMITS[key]) throw new Error(`${key} is too long.`);
    return [key, text];
  })) as InvoiceDocumentFields;

  const rawRows = record.customRows ?? [];
  if (!Array.isArray(rawRows) || rawRows.length > 10) throw new Error("Add no more than 10 custom invoice rows.");
  const customRows = rawRows.map((raw, index): CustomInvoiceRow => {
    if (!raw || typeof raw !== "object") throw new Error(`Custom invoice row ${index + 1} is invalid.`);
    const row = raw as Record<string, unknown>;
    const description = String(row.description ?? "").trim();
    const rtom = String(row.rtom ?? "").trim();
    const quantity = Number(row.quantity);
    const unitRate = Number(row.unitRate);
    if (!description || description.length > 240) throw new Error(`Custom invoice row ${index + 1} needs a description of 1–240 characters.`);
    if (rtom.length > 60) throw new Error(`Custom invoice row ${index + 1} RTOM is too long.`);
    if (!Number.isFinite(quantity) || quantity <= 0 || quantity > 1_000_000 || Math.abs(quantity * 1000 - Math.round(quantity * 1000)) > 1e-7) throw new Error(`Custom invoice row ${index + 1} quantity must be positive with up to three decimals.`);
    if (!Number.isFinite(unitRate) || unitRate <= 0 || unitRate > 1_000_000_000 || Math.abs(unitRate * 100 - Math.round(unitRate * 100)) > 1e-7) throw new Error(`Custom invoice row ${index + 1} rate must be positive with up to two decimals.`);
    if (!Number.isSafeInteger(Math.round(unitRate * quantity * 100))) throw new Error(`Custom invoice row ${index + 1} amount is too large.`);
    return { id: String(row.id || `custom-${index + 1}`).slice(0, 80), description, rtom, quantity, unitRate };
  });
  const percentA = Number(record.percentA ?? ratio.percentA);
  const percentB = Number(record.percentB ?? ratio.percentB);
  if (!Number.isInteger(percentA) || !Number.isInteger(percentB) || percentA < 1 || percentA > 99 || percentB < 1 || percentB > 99 || percentA + percentB !== 100) {
    throw new Error("Invoice A and B percentages must be whole numbers that add up to 100.");
  }
  const rawDescriptions = record.serviceDescriptions && typeof record.serviceDescriptions === "object" ? record.serviceDescriptions as Record<string, unknown> : {};
  const serviceDescriptions = Object.fromEntries(Object.entries(SERVICE_DESCRIPTION_DEFAULTS).map(([key, fallback]) => {
    const value = String(rawDescriptions[key] ?? fallback).trim();
    if (value.length > 160) throw new Error(`Service row ${key} description is too long.`);
    return [key, value];
  }));
  const invoiceDate = record.invoiceDate == null ? undefined : String(record.invoiceDate);
  if (record.invoiceDate !== undefined && !invoiceDate) throw new Error("Invoice date is required.");
  if (invoiceDate && (!/^\d{4}-\d{2}-\d{2}$/.test(invoiceDate) || Number.isNaN(Date.parse(`${invoiceDate}T00:00:00Z`)) || new Date(`${invoiceDate}T00:00:00Z`).toISOString().slice(0, 10) !== invoiceDate)) throw new Error("Invoice date must be a valid date in YYYY-MM-DD format.");
  const jobMonth = record.jobMonth == null ? undefined : String(record.jobMonth).trim();
  if (jobMonth && jobMonth.length > 100) throw new Error("Job month is too long.");
  return { fields, serviceDescriptions, customRows, percentA, percentB, invoiceDate, jobMonth };
}
