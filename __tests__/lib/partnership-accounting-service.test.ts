import {
  getFinancialYearBounds,
  getReceivableAgingBucket,
} from "@/lib/partnership-accounting-service";

describe("partnership accounting rules", () => {
  it("uses April 1 to March 31 for the default financial year", () => {
    const bounds = getFinancialYearBounds(new Date("2026-08-02T00:00:00Z"));

    expect(bounds.startDate.toISOString()).toBe("2026-04-01T00:00:00.000Z");
    expect(bounds.endDate.toISOString()).toBe("2027-03-31T00:00:00.000Z");
    expect(bounds.yearOfAssessment).toBe("2026/2027");
  });

  it("places dates before April in the previous financial year", () => {
    const bounds = getFinancialYearBounds(new Date("2026-03-31T00:00:00Z"));

    expect(bounds.startDate.toISOString()).toBe("2025-04-01T00:00:00.000Z");
    expect(bounds.endDate.toISOString()).toBe("2026-03-31T00:00:00.000Z");
  });

  it("uses explicit aging boundaries", () => {
    expect(getReceivableAgingBucket(0)).toBe("current");
    expect(getReceivableAgingBucket(30)).toBe("1_30");
    expect(getReceivableAgingBucket(31)).toBe("31_60");
    expect(getReceivableAgingBucket(60)).toBe("31_60");
    expect(getReceivableAgingBucket(61)).toBe("61_90");
    expect(getReceivableAgingBucket(90)).toBe("61_90");
    expect(getReceivableAgingBucket(91)).toBe("90_plus");
  });
});
