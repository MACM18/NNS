import { monthlyClearRequests, monthlyProvisioningDue } from "@/lib/google-sheet-monthly";

describe("monthly Google Sheet provisioning", () => {
  it("becomes due at 00:05 Sri Lanka time on the first local day only", () => {
    expect(monthlyProvisioningDue(new Date("2026-09-30T18:34:00.000Z")).due).toBe(false);
    expect(monthlyProvisioningDue(new Date("2026-09-30T18:35:00.000Z")).due).toBe(true);
    expect(monthlyProvisioningDue(new Date("2026-09-30T20:00:00.000Z")).period).toBe("2026-10");
    expect(monthlyProvisioningDue(new Date("2026-10-01T18:35:00.000Z")).due).toBe(false);
  });

  it("clears populated literal cells while preserving formulas and empty cells", () => {
    const requests = monthlyClearRequests([{
      properties: { sheetId: 17 },
      data: [{
        startRow: 1, startColumn: 2,
        rowData: [{ values: [
          { userEnteredValue: { stringValue: "entry" } },
          { userEnteredValue: { formulaValue: "=SUM(A1:A2)" } },
          { userEnteredValue: { numberValue: 8 } },
          {},
        ] }],
      }],
    } as any]);
    expect(requests).toHaveLength(2);
    expect(requests.map(request => request.updateCells?.range?.startColumnIndex)).toEqual([2, 4]);
    expect(requests.every(request => request.updateCells?.fields === "userEnteredValue")).toBe(true);
  });
});
