export type InvoiceAnalyticsRow = {
  month: number | null;
  year: number | null;
  invoiceType: string | null;
  totalAmount: number;
  lineCount: number;
};

type MonthlyPair = {
  year: number;
  month: number;
  amountA: number;
  amountB: number;
  lines: number;
};

const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export function buildInvoiceAnalytics(rows: InvoiceAnalyticsRow[], year: number) {
  const pairs = new Map<string, MonthlyPair>();
  for (const invoice of rows) {
    if (!invoice.month || !invoice.year || (invoice.invoiceType !== "A" && invoice.invoiceType !== "B")) continue;
    const key = `${invoice.year}-${invoice.month}`;
    const pair = pairs.get(key) || { year: invoice.year, month: invoice.month, amountA: 0, amountB: 0, lines: 0 };
    if (invoice.invoiceType === "A") pair.amountA += invoice.totalAmount;
    else pair.amountB += invoice.totalAmount;
    // A and B share the same source lines. Count them once, including partial pairs.
    pair.lines = Math.max(pair.lines, invoice.lineCount);
    pairs.set(key, pair);
  }

  const allTimePairs = [...pairs.values()];
  const selectedYearPairs = allTimePairs.filter(pair => pair.year === year);
  const allTime = allTimePairs.reduce((summary, pair) => ({
    totalBilled: summary.totalBilled + pair.amountA + pair.amountB,
    invoicePairs: summary.invoicePairs + 1,
    lines: summary.lines + pair.lines,
    amountA: summary.amountA + pair.amountA,
    amountB: summary.amountB + pair.amountB,
  }), { totalBilled: 0, invoicePairs: 0, lines: 0, amountA: 0, amountB: 0 });

  const byMonth = Array.from({ length: 12 }, (_, index) => {
    const month = index + 1;
    const pair = selectedYearPairs.find(item => item.month === month);
    return {
      month,
      label: monthNames[index],
      totalBilled: pair ? pair.amountA + pair.amountB : 0,
      amountA: pair?.amountA || 0,
      amountB: pair?.amountB || 0,
      invoicePairs: pair ? 1 : 0,
      lines: pair?.lines || 0,
    };
  });

  return {
    allTime,
    year,
    years: [...new Set(allTimePairs.map(pair => pair.year))].sort((a, b) => b - a),
    byMonth,
  };
}
