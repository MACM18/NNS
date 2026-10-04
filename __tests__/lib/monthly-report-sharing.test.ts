import { canManageMonthlyReports, createMonthlyShareToken, createReportDocumentId, hashMonthlyShareToken, monthDateBounds } from "@/lib/monthly-report-sharing";

describe("monthly report sharing primitives", () => {
  it("limits report management to the approved roles", () => {
    expect(["admin", "moderator", "superadmin"].every(canManageMonthlyReports)).toBe(true);
    expect(["user", "", null, undefined].some(canManageMonthlyReports)).toBe(false);
  });

  it("creates independent high-entropy parent and document identifiers", () => {
    const token = createMonthlyShareToken();
    const secondToken = createMonthlyShareToken();
    const documentId = createReportDocumentId();
    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(documentId).toMatch(/^[A-Za-z0-9_-]{32}$/);
    expect(token).not.toBe(secondToken);
    expect(hashMonthlyShareToken(token)).not.toContain(token);
    expect(hashMonthlyShareToken(token)).toHaveLength(64);
  });

  it("validates months and handles December boundaries", () => {
    const bounds = monthDateBounds(2026, 12);
    expect(bounds.start.toISOString()).toBe("2026-12-01T00:00:00.000Z");
    expect(bounds.endExclusive.toISOString()).toBe("2027-01-01T00:00:00.000Z");
    expect(() => monthDateBounds(2026, 13)).toThrow();
  });
});
