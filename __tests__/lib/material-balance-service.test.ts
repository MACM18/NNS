import {
  normalizeMaterialSourceName,
  parseMaterialBalanceValues,
} from "@/lib/material-balance-service";

function makeSheet(month: number, year: number, days: number) {
  const header: unknown[] = ["NNS Enterprise - Daily material balance", null];
  const labels: unknown[] = ["Item", "Unit"];
  for (let day = 1; day <= days; day += 1) {
    header.push("Date", `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`, null, null);
    labels.push("Previous Day balance", "Issued", "Usage", "Balance Return");
  }
  const totalColumn = header.length;
  header.push("Total");
  labels.push("Issued", "Usage", "Return", "Final Balance");

  const firstItem: unknown[] = ["C HOOK(NOS)", "NOS"];
  for (let day = 1; day <= days; day += 1) {
    firstItem.push(day === 1 ? 10 : 10 + day - 1, 2, 1, 0);
  }
  firstItem.push(days * 2, days, days * 0, 10 + days);

  const negativeItem: unknown[] = ["FIBER ROSSET BOX(NOS)", "NOS"];
  for (let day = 1; day <= days; day += 1) negativeItem.push(-2, 0, 0, 0);
  negativeItem.push(0, 0, 0, -2);

  return { values: [header, labels, firstItem, negativeItem], totalColumn };
}

describe("Material Balance parser", () => {
  it("normalizes trailing parenthetical units without backtracking regexes", () => {
    expect(normalizeMaterialSourceName("C HOOK(NOS)")).toBe("chook");
    expect(normalizeMaterialSourceName("Fiber Rosset Box (NOS)")).toBe("fiberrosettebox");
    expect(normalizeMaterialSourceName(`source ${"(".repeat(10000)}value`)).toBe("sourcevalue");
  });

  it("parses variable daily blocks and source totals", () => {
    const { values } = makeSheet(8, 2026, 31);
    const parsed = parseMaterialBalanceValues(values, 8, 2026);

    expect(parsed.dayCount).toBe(31);
    expect(parsed.items).toHaveLength(2);
    expect(parsed.items[0]).toEqual(expect.objectContaining({
      sourceItemName: "C HOOK(NOS)",
      openingBalance: 10,
      totalIssued: 62,
      totalUsage: 31,
      finalBalance: 41,
    }));
    expect(parsed.items[0].dailyEntries).toHaveLength(31);
    expect(parsed.discrepancies).toHaveLength(0);
  });

  it("supports February-sized sheets and preserves negative balances", () => {
    const { values } = makeSheet(2, 2028, 29);
    const parsed = parseMaterialBalanceValues(values, 2, 2028);

    expect(parsed.dayCount).toBe(29);
    expect(parsed.items[0].dailyEntries).toHaveLength(29);
    expect(parsed.items[1].finalBalance).toBe(-2);
    expect(parsed.items[1].warnings).toEqual(expect.arrayContaining([
      "Negative opening or final balance",
    ]));
  });

  it("reports daily-versus-total discrepancies without changing source values", () => {
    const { values, totalColumn } = makeSheet(8, 2026, 2);
    (values[2][totalColumn] as number) = 999;
    const parsed = parseMaterialBalanceValues(values, 8, 2026);

    expect(parsed.items[0].totalIssued).toBe(999);
    expect(parsed.discrepancies).toEqual(expect.arrayContaining([
      expect.objectContaining({ itemName: "C HOOK(NOS)", field: "issued" }),
    ]));
  });

  it("warns when no valid date blocks exist", () => {
    const parsed = parseMaterialBalanceValues([
      ["Title", "Material Balance"],
      ["Item", "Unit"],
      ["C HOOK(NOS)", "NOS"],
    ], 8, 2026);

    expect(parsed.dayCount).toBe(0);
    expect(parsed.warnings).toContain("No valid daily Material Balance blocks were found");
  });
});
