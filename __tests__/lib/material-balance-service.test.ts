import {
  normalizeMaterialSourceName,
  parseMaterialBalanceMonthValues,
  parseMaterialBalanceValues,
  resolveTargetKey,
  shouldImportMaterialBalanceItem,
} from "@/lib/material-balance-service";

function makeSheet(month: number, year: number, days: number) {
  const header: unknown[] = ["NNS Enterprise - Daily material balance", null];
  const labels: unknown[] = ["Item", "Unit"];
  for (let day = 1; day <= days; day += 1) {
    header.push("Date:", `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`, null, null);
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

  it("resolves known Material Balance aliases to current inventory names", () => {
    expect(resolveTargetKey("FAC Connector(NOS)")).toBe("fac");
    expect(resolveTargetKey("Fiber Rosset Box(NOS)")).toBe("fiberrosette");
    expect(resolveTargetKey("Nut and Bolt(NOS)")).toBe("nutbolt");
    expect(resolveTargetKey("C HOOK(NOS)")).toBe("chook");
    expect(resolveTargetKey("L HOOK(NOS)")).toBe("lhook");
    expect(resolveTargetKey("U CLIP(NOS)")).toBe("uclip");
    expect(resolveTargetKey("INTERNAL WIRE(M)")).toBe("internalwire");
    expect(resolveTargetKey("FIBER DROP WIRE(M)")).toBe("fiberdropwire");
    expect(resolveTargetKey("RJ-45(NOS)")).toBe("rj45");
    expect(resolveTargetKey("RJ-11(NOS)")).toBe("rj11");
    expect(resolveTargetKey("CABLE TIE 6(NOS)")).toBe("ctie");
    expect(resolveTargetKey("TOP BOLT(NOS)")).toBe("topbolt");
  });

  it("recognizes the complete Google Sheet catalog and skips only empty new rows", () => {
    const catalog = [
      ["PROTECTOR(NOS)", "NOS"],
      ["C HOOK(NOS)", "NOS"],
      ["L HOOK(NOS)", "NOS"],
      ["NUT&BOLT(NOS)", "NOS"],
      ["RETAINERS WHITE(NOS)", "NOS"],
      ["RETAINERS BLACK(NOS)", "NOS"],
      ["DROP WIRE(M)", "M"],
      ["EARTH ROD(NOS)", "NOS"],
      ["EARTH WIRE(M)", "M"],
      ["INTERNAL WIRE(M)", "M"],
      ["U CLIP(NOS)", "NOS"],
      ["DROP WIRE CLET(NOS)", "NOS"],
      ["CONCRETE NAIL 1 1/2(NOS)", "NOS"],
      ["CONCRETE NAIL 1 (NOS)", "NOS"],
      ["FIBER DROP WIRE(M)", "M"],
      ["SINGLE ROSSET BOX(NOS)", "NOS"],
      ["FIBER ROSSET BOX(NOS)", "NOS"],
      ["FAC CONNECTOR(NOS)", "NOS"],
      ["12.5*20 TRUNKING(M)", "M"],
      ["SPIRAL CASING 1/4(M)", "M"],
      ["PVC CONDUIT(M)", "M"],
      ["CONDUIT CLIP(NOS)", "NOS"],
      ["CAT 5E CABLE(M)", "M"],
      ["RJ-45(NOS)", "NOS"],
      ["RJ-11(NOS)", "NOS"],
      ["CABLE TIE 4(NOS)", "NOS"],
      ["CABLE TIE 6(NOS)", "NOS"],
      ["TOP BOLT(NOS)", "NOS"],
      ["DROP CONNECTOR(NOS)", "NOS"],
      ["SCREW NAIL 1(NOS)", "NOS"],
      ["SCREW NAIL 1 1/2(NOS)", "NOS"],
      ["ROLL PLUG(NOS)", "NOS"],
      ["SOCKET(NOS)", "NOS"],
      ["BEND(NOS)", "NOS"],
    ] as const;
    const header: unknown[] = ["Title", null, "Date:", "2026-08-01", null, null, "Total"];
    const labels: unknown[] = ["Item", "Unit", "Previous Day balance", "Issued", "Usage", "Balance Return", "Issued", "Usage", "Return", "Final Balance"];
    const rows = catalog.map(([name, unit], index) => [name, unit, index + 1, 0, 0, 0, 0, 0, 0, index + 1]);
    const parsed = parseMaterialBalanceValues([header, labels, ...rows], 8, 2026);

    expect(parsed.items).toHaveLength(catalog.length);
    expect(parsed.items.map((item) => item.sourceItemName)).toEqual(catalog.map(([name]) => name));
    expect(shouldImportMaterialBalanceItem(parsed.items[0], {
      sourceItemName: "PROTECTOR(NOS)",
      normalizedSourceName: "protector",
      sourceRow: 3,
      openingBalance: 0,
      stockIssued: 0,
      inHand: 0,
      materialUsed: 0,
      endingWip: 0,
      warnings: [],
    })).toBe(false);
    expect(shouldImportMaterialBalanceItem(undefined, {
      sourceItemName: "FIBER DROP WIRE(M)",
      normalizedSourceName: "fiberdropwirem",
      sourceRow: 17,
      openingBalance: 0,
      stockIssued: 0,
      inHand: 0,
      materialUsed: 0,
      endingWip: -85,
      warnings: [],
    })).toBe(true);
    expect(shouldImportMaterialBalanceItem({
      ...parsed.items[0],
      totalIssued: 2,
      dailyEntries: [{ ...parsed.items[0].dailyEntries[0], issued: 2 }],
    }, null)).toBe(true);
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

  it("parses the month-end Ending WIP Material column dynamically", () => {
    const parsed = parseMaterialBalanceMonthValues([
      ["MATERIAL BALANCE SHEET FOR NEW CONNECTION"],
      ["No", "Item", "Opening Balance", "Stock Issued", null, "In hand End of the month", "Material used for invoice", "Ending WIP Material"],
      [1, "C HOOK(NOS)", 4, 15, null, 6, 13, 6],
      [2, "FIBER DROP WIRE(M)", 1160, 2000, null, -85, 2569, -85],
    ], 8, 2026);

    expect(parsed.itemCount).toBe(2);
    expect(parsed.items[0]).toEqual(expect.objectContaining({ normalizedSourceName: "chook", endingWip: 6 }));
    expect(parsed.items[1].warnings).toContain("Negative month-end Ending WIP Material");
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
