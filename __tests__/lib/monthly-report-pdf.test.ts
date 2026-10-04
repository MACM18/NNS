import { generateDailyMaterialBalancePdf, generateDrumNumberPdf, generateInvoiceBackPdf, generateInvoicePdf, generateMonthlyMaterialBalancePdf } from "@/lib/monthly-report-pdf";

function isPdf(bytes: Uint8Array) { return Buffer.from(bytes).subarray(0, 5).toString() === "%PDF-"; }

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
});
