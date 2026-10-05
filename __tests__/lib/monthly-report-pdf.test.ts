import {
  formatMonthlyInvoiceDisplayNumber,
  generateDailyMaterialBalancePdf,
  generateDrumNumberPdf,
  generateInvoiceBackPdf,
  generateInvoicePdf,
  generateMonthlyMaterialBalancePdf,
} from "@/lib/monthly-report-pdf";
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
function pdfPageCount(bytes: Uint8Array) {
  return (Buffer.from(bytes).toString("latin1").match(/\/Type \/Page\b/g) || []).length;
}

const company = {
  name: "NNS Enterprise", address: "No 89, Welikala, Pokunuwita", contacts: ["0789070440", "0724918351", "0342263642"],
  registeredNumber: "", bank: { accountTitle: "NNS Test Beneficiary", bankName: "NNS Test Bank", accountNumber: "12345678", branchCode: "Horana" },
};
const invoiceInput = (invoiceType: "A" | "B") => ({
  invoice: { invoiceNumber: `NNS/WPS/HR/NC/26/AUGUST/${invoiceType}`, invoiceDate: "2026-09-02", jobMonth: "August 2026", invoiceType, totalAmount: invoiceType === "A" ? 900 : 100 },
  displayNumber: formatMonthlyInvoiceDisplayNumber(2026, 8), year: 2026, month: 8,
  lines: [{ serviceType: "FTTH", cableLength: 50, description: "FTTH - DW length (0-100)", baseRate: 1000, invoiceAmount: invoiceType === "A" ? 900 : 100 }],
  optionalItems: [], company,
});

describe("monthly report PDF generation", () => {
  it("renders each report as a PDF snapshot", () => {
    const files = [
      generateDailyMaterialBalancePdf({ monthLabel: "October 2026", items: [{ sourceItemName: "Fiber", sourceUnit: "m", dailyEntries: [{ date: "2026-10-01", previousBalance: 12, issued: 4, usage: 2, balanceReturn: 1 }] }] }),
      generateMonthlyMaterialBalancePdf({ monthLabel: "October", year: 2026, rows: [{ item: "Fiber", opening: 12, issued: 4, inHand: 14, used: 2, endingWip: 1 }] }),
      generateInvoicePdf(invoiceInput("A")),
      generateInvoiceBackPdf({ monthLabel: "October 2026", invoiceNumber: "NNS/WPS/HR/NC/26/OCTOBER/001", rows: [] }),
      generateDrumNumberPdf({ monthLabel: "October 2026", rows: [{ telephoneNo: "0112345678", cableStart: 1, cableMiddle: 2, cableEnd: 3, drumNumber: "D-1", wastage: 0.2 }] }),
    ];
    expect(files.every(isPdf)).toBe(true);
    expect(generateDailyMaterialBalancePdf({ monthLabel: "Empty", items: [] })).toBeInstanceOf(Uint8Array);
  });

  it("uses white column text on a navy heading for the material and drum tables", () => {
    const monthly = pdfText(generateMonthlyMaterialBalancePdf({
      monthLabel: "October", year: 2026,
      rows: Array.from({ length: 34 }, (_, index) => ({ item: `Item ${index + 1}`, opening: 1, issued: 2, inHand: 3, used: 4, endingWip: 5 })),
    }));
    const drum = pdfText(generateDrumNumberPdf({ monthLabel: "October 2026", rows: [] }));
    expect(monthly).toContain("1. g");
    expect(monthly).toContain("0.07 0.25 0.38 rg");
    expect(drum).toContain("1. g");
    expect(drum).toContain("0.07 0.25 0.38 rg");
    expect(pdfPageCount(generateMonthlyMaterialBalancePdf({
      monthLabel: "October", year: 2026,
      rows: Array.from({ length: 34 }, (_, index) => ({ item: `Item ${index + 1}`, opening: 1, issued: 2, inHand: 3, used: 4, endingWip: 5 })),
    }))).toBe(1);
  });

  it.each([["A", "90%", "900.00"], ["B", "10%", "100.00"]] as const)(
    "prints exact template invoice content and a 100%% grand total on Invoice %s",
    (invoiceType, percent, actual) => {
      const bytes = generateInvoicePdf(invoiceInput(invoiceType));
      const content = pdfText(bytes);
      expect(content).toContain("S/Southern/HR/NC/26/August");
      expect(content).not.toContain("NNS/WPS/HR/NC");
      expect(content).toContain("Bill to:");
      expect(content).toContain("SLTS-OSP-2023-170");
      expect(content).toContain("Invoice :");
      expect(content).toContain("FTTH Wirings-DW Length-");
      expect(content).toContain("Grand Total \\(Rs.\\)");
      expect(content).toContain("1,000.00");
      expect(content).toContain(percent);
      expect(content).toContain(actual);
      expect(content).toContain("I do hereby certify that the above details are true and correct");
      expect(content).toContain("Checque should be drawn in favour of \"NNS Test Beneficiary\"");
      expect(content).toContain("SLTS Use Only:");
      expect(content).not.toContain("PAYMENT DETAILS");
    },
  );

  it("adds Data, Peo TV, and selected optional rows after the template pole rows", () => {
    const content = pdfText(generateInvoicePdf({
      ...invoiceInput("A"),
      lines: [
        { serviceType: "FTTH", cableLength: 50, baseRate: 6650, invoiceAmount: 5985 },
        { serviceType: "DATA", cableLength: 150, baseRate: 5500, invoiceAmount: 4950 },
        { serviceType: "PEO_TV", cableLength: 0, baseRate: 1800, invoiceAmount: 1620 },
      ],
      optionalItems: [
        { code: "POLE_56", description: "5.6m Pole Installation", quantity: 1, unitRate: 700, baseAmount: 700 },
        { code: "POLE_8", description: "8m Pole Installation", quantity: 1, unitRate: 900, baseAmount: 900 },
        { code: "HIGH_RISE", description: "FTTH - High Rise Building (Configuration only)", quantity: 1, unitRate: 3800, baseAmount: 3800 },
      ],
    }));
    const pole = content.indexOf("5.6m Pole Installations");
    const data = content.indexOf("DATA - DW length-");
    const peo = content.indexOf("PEO TV - Second visit");
    expect(content).not.toContain("IPTV");
    const pole8 = content.indexOf("8m Pole Installation");
    const highRise = content.indexOf("High Rise Building");
    expect(pole).toBeGreaterThan(-1);
    expect(data).toBeGreaterThan(pole);
    expect(peo).toBeGreaterThan(data);
    expect(pole8).toBeGreaterThan(peo);
    expect(highRise).toBeGreaterThan(pole8);
    const withoutOptional = pdfText(generateInvoicePdf({
      ...invoiceInput("A"),
      optionalItems: [{ code: "POLE_8", description: "8m Pole Installation", quantity: 0, unitRate: 900, baseAmount: 0 }],
    }));
    expect(withoutOptional).not.toContain("8m Pole Installation");
  });

  it("uses alternating light-blue day bands and strong separators", () => {
    const bytes = generateDailyMaterialBalancePdf({
      monthLabel: "October 2026",
      items: [{ sourceItemName: "Fiber", sourceUnit: "m", dailyEntries: [
        { date: "2026-10-01", previousBalance: 12, issued: 4, usage: 2, balanceReturn: 1 },
        { date: "2026-10-02", previousBalance: 11, issued: 3, usage: 1, balanceReturn: 0 },
      ] }],
    });
    const content = pdfText(bytes);
    expect(content).toContain("0.91 0.95 0.98 rg");
    expect(content).toContain("0.96 0.98 0.99 rg");
    expect(content).not.toContain("1. 0.95 0.84 rg");
    expect(content).toContain("1.8425196850393704 w");
  });

  it("draws bordered invoice signoff panels with configured bank details", () => {
    const content = pdfText(generateInvoicePdf(invoiceInput("A")));
    expect(content).toContain("Prepared By:");
    expect(content).toContain("Received By: \\(Sign/Date\\)");
    expect(content).toContain("Regional Signature");
    expect(content).toContain("Head Office Signature");
    expect(content).toContain("Account No: 12345678");
    expect(content).toContain("Bank: NNS Test Bank");
    expect(content).toContain("Branch: Horana");
    expect((content.match(/ re\nS/g) || []).length).toBeGreaterThan(30);
  });

  it("formats the shared A/B display number and preserves invoice-back numbering", () => {
    expect(formatMonthlyInvoiceDisplayNumber(2026, 8)).toBe("S/Southern/HR/NC/26/August");
    const back = pdfText(generateInvoiceBackPdf({ monthLabel: "August 2026", invoiceNumber: "NNS/WPS/HR/NC/26/AUGUST/001", rows: [] }));
    expect(back).toContain("NNS/WPS/HR/NC/26/AUGUST/001");
  });
});
