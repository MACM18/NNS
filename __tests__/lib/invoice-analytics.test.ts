import { buildInvoiceAnalytics } from "@/lib/invoice-analytics";

describe("invoice analytics aggregation", () => {
  it("counts an A/B month as one job and adds the split amounts to the full total", () => {
    const result = buildInvoiceAnalytics([
      { month: 8, year: 2026, invoiceType: "A", totalAmount: 900, lineCount: 12 },
      { month: 8, year: 2026, invoiceType: "B", totalAmount: 100, lineCount: 12 },
    ], 2026);

    expect(result.allTime).toEqual({ totalBilled: 1000, invoicePairs: 1, lines: 12, amountA: 900, amountB: 100 });
    expect(result.byMonth[7]).toMatchObject({ month: 8, totalBilled: 1000, amountA: 900, amountB: 100, invoicePairs: 1, lines: 12 });
    expect(result.byMonth).toHaveLength(12);
  });

  it("counts a partial pair and its lines once", () => {
    const result = buildInvoiceAnalytics([
      { month: 9, year: 2026, invoiceType: "A", totalAmount: 450, lineCount: 7 },
    ], 2026);

    expect(result.allTime).toEqual({ totalBilled: 450, invoicePairs: 1, lines: 7, amountA: 450, amountB: 0 });
  });

  it("keeps the all-time summary while filtering the monthly trend by year", () => {
    const result = buildInvoiceAnalytics([
      { month: 12, year: 2025, invoiceType: "A", totalAmount: 180, lineCount: 3 },
      { month: 12, year: 2025, invoiceType: "B", totalAmount: 20, lineCount: 3 },
      { month: 1, year: 2026, invoiceType: "A", totalAmount: 270, lineCount: 4 },
      { month: 1, year: 2026, invoiceType: "B", totalAmount: 30, lineCount: 4 },
    ], 2026);

    expect(result.allTime).toMatchObject({ totalBilled: 500, invoicePairs: 2, lines: 7 });
    expect(result.years).toEqual([2026, 2025]);
    expect(result.byMonth[0]).toMatchObject({ totalBilled: 300, invoicePairs: 1, lines: 4 });
    expect(result.byMonth[11]).toMatchObject({ totalBilled: 0, invoicePairs: 0, lines: 0 });
  });
});
