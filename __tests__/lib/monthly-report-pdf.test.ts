import { generateDailyMaterialBalancePdf, generateDrumNumberPdf, generateInvoiceBackPdf, generateInvoicePdf, generateMonthlyMaterialBalancePdf } from "@/lib/monthly-report-pdf";
import { inflateSync } from "node:zlib";

function isPdf(bytes: Uint8Array) { return Buffer.from(bytes).subarray(0, 5).toString() === "%PDF-"; }
function pdfText(bytes: Uint8Array) {
  const source = Buffer.from(bytes).toString("latin1");
  const chunks: string[] = [];
  for (const match of source.matchAll(/stream\r?\n([\s\S]*?)\r?\nendstream/g)) {
    try { chunks.push(inflateSync(Buffer.from(match[1], "latin1")).toString("latin1")); } catch { /* Ignore non-Flate streams. */ }
  }
  return chunks.join("\n");
}

describe("monthly report PDF generation", () => {
  it("renders each report as a PDF snapshot", () => {
    const files = [
      generateDailyMaterialBalancePdf({ monthLabel: "October 2026", items: [{ sourceItemName: "Fiber", sourceUnit: "m", dailyEntries: [{ date: "2026-10-01", previousBalance: 12, issued: 4, usage: 2, balanceReturn: 1 }] }] }),
      generateMonthlyMaterialBalancePdf({ monthLabel: "October", year: 2026, rows: [{ item: "Fiber", opening: 12, issued: 4, inHand: 14, used: 2, endingWip: 1 }] }),
      generateInvoicePdf({ invoice: { invoiceNumber: "NNS/26/OCTOBER/A", invoiceDate: "2026-11-02", jobMonth: "OCTOBER 2026", invoiceType: "A", totalAmount: 100 }, lines: [{ description: "FTTH DW length", baseRate: 6650, invoiceAmount: 100 }], optionalItems: [], company: { name: "NNS Enterprise", address: "Address", contacts: [], registeredNumber: "" } }),
      generateInvoiceBackPdf({ monthLabel: "October 2026", invoiceNumber: "NNS/26/OCTOBER/001", rows: [] }),
      generateDrumNumberPdf({ monthLabel: "October 2026", rows: [{ telephoneNo: "0112345678", cableStart: 1, cableMiddle: 2, cableEnd: 3, drumNumber: "D-1", wastage: 0.2 }] }),
    ];
    expect(files.every(isPdf)).toBe(true);
    expect(generateDailyMaterialBalancePdf({ monthLabel: "Empty", items: [] })).toBeInstanceOf(Uint8Array);
  });

  it("includes the complete invoice approval footer and configured payment details", () => {
    const invoice = generateInvoicePdf({
      invoice: { invoiceNumber: "NNS/26/OCTOBER/A", invoiceDate: "2026-11-02", jobMonth: "OCTOBER 2026", invoiceType: "A", totalAmount: 100 },
      lines: [{ description: "FTTH DW length", baseRate: 6650, invoiceAmount: 100 }],
      optionalItems: [],
      company: {
        name: "NNS Test Company", address: "Address", contacts: [], registeredNumber: "",
        bank: { accountTitle: "NNS Test Beneficiary", bankName: "NNS Test Bank", accountNumber: "12345678", branchCode: "Test Branch", iban: "LK00TEST" },
      },
    });
    const content = pdfText(invoice);
    expect(content).toContain("NNS Test Beneficiary");
    expect(content).toContain("NNS Test Bank");
    expect(content).toContain("12345678");
    expect(content).toContain("Test Branch");
    expect(content).toContain("LK00TEST");
    expect(content).toContain("PREPARED BY");
    expect(content).toContain("RECEIVED BY");
    expect(content).toContain("SLTS USE ONLY");
    expect(content).toContain("Recommended by");
    expect(content).toContain("Material Balance Sheet received");
  });

  it("omits payment fields when current bank details are unavailable", () => {
    const invoice = generateInvoicePdf({
      invoice: { invoiceNumber: "NNS/26/OCTOBER/B", invoiceDate: "2026-11-02", jobMonth: "OCTOBER 2026", invoiceType: "B", totalAmount: 100 },
      lines: [], optionalItems: [],
      company: { name: "NNS Enterprise", address: "", contacts: [], registeredNumber: "" },
    });
    const content = pdfText(invoice);
    expect(isPdf(invoice)).toBe(true);
    expect(content).toContain("SLTS USE ONLY");
    expect(content).not.toContain("Bank:");
    expect(content).not.toContain("Account No.:");
  });
});
