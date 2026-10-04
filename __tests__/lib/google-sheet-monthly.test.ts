import { grantMonthlySheetPermissions, monthlyBalanceDestinations, monthlyProvisioningDue, monthlyTemplateUpdates, resolveMonthlyTemplateRanges } from "@/lib/google-sheet-monthly";
import { monthlyInvoiceNumber } from "@/lib/monthly-invoice-number";

describe("monthly Google Sheet provisioning", () => {
  it("becomes due at 00:05 Sri Lanka time on the first local day only", () => {
    expect(monthlyProvisioningDue(new Date("2026-09-30T18:34:00.000Z")).due).toBe(false);
    expect(monthlyProvisioningDue(new Date("2026-09-30T18:35:00.000Z")).due).toBe(true);
    expect(monthlyProvisioningDue(new Date("2026-09-30T20:00:00.000Z")).period).toBe("2026-10");
    expect(monthlyProvisioningDue(new Date("2026-10-01T18:35:00.000Z")).due).toBe(false);
  });

  it("updates only the specified cells and uses the template invoice formats", () => {
    const updates = monthlyTemplateUpdates("2026-10");
    expect(updates).toEqual([
      { range: "'Material Balance'!DW2", values: [[10]] },
      { range: "'Material Balance - Month'!D4", values: [[": OCTOBER"]] },
      { range: "'Material Balance - Month'!D5", values: [[": 2026"]] },
      { range: "'Invoice A'!F5", values: [["NNS/WPS/HR/NC/26/OCTOBER/A"]] },
      { range: "'Invoice A'!F7", values: [["2026-11-02"]] },
      { range: "'Invoice A'!F8", values: [["OCTOBER 2026"]] },
      { range: "'Invoice B'!F5", values: [["NNS/WPS/HR/NC/26/OCTOBER/B"]] },
      { range: "'Invoice B'!F7", values: [["2026-11-02"]] },
      { range: "'Invoice B'!F8", values: [["OCTOBER 2026"]] },
      { range: "'Invoice back'!O1", values: [["Invoice No: NNS/WPS/HR/NC/26/OCTOBER/001"]] },
    ]);
  });

  it("matches tab titles case-insensitively and preserves the exact title when writing", () => {
    const updates = monthlyTemplateUpdates("2026-10");
    const resolved = resolveMonthlyTemplateRanges(updates, [
      "Material Balance", "Material Balance - Month", "Invoice A", "Invoice B", "Invoice Back ",
    ]);
    expect(resolved.find(update => update.range.endsWith("!O1"))?.range).toBe("'Invoice Back '!O1");
    expect(() => resolveMonthlyTemplateRanges(updates, ["Material Balance", "Invoice A"])).toThrow("missing required template tabs");
  });

  it("handles December rollover and retains two digit invoice years", () => {
    const updates = monthlyTemplateUpdates("2026-12");
    expect(updates.find(update => update.range === "'Invoice A'!F5")?.values).toEqual([["NNS/WPS/HR/NC/26/DECEMBER/A"]]);
    expect(updates.find(update => update.range === "'Invoice A'!F7")?.values).toEqual([["2027-01-02"]]);
    expect(updates.find(update => update.range === "'Material Balance - Month'!D5")?.values).toEqual([[": 2026"]]);
  });

  it("copies prior H8-down balances to both opening balance columns without modifying other cells", () => {
    const balances = [[125], [0], [""], [42.5]];
    expect(monthlyBalanceDestinations(balances)).toEqual([
      { range: "'Material Balance'!C3:C", values: balances },
      { range: "'Material Balance - Month'!C8:C", values: balances },
    ]);
    expect(monthlyBalanceDestinations([])).toEqual([]);
  });

  it("uses the new invoice number format for newly generated invoices", () => {
    expect(monthlyInvoiceNumber(2026, 10, "A")).toBe("NNS/WPS/HR/NC/26/OCTOBER/A");
    expect(monthlyInvoiceNumber(2026, 10, "B")).toBe("NNS/WPS/HR/NC/26/OCTOBER/B");
  });
  it("records each Drive editor permission as added, already shared, or failed", async () => {
    const recipients = [
      { emailAddress: "new@example.com", type: "user" as const },
      { emailAddress: "existing@example.com", type: "user" as const },
      { emailAddress: "invalid@example.com", type: "user" as const },
      { emailAddress: "ops-group@example.com", type: "group" as const },
    ];
    const addPermission = jest.fn(async ({ emailAddress }: { emailAddress: string }) => {
      if (emailAddress === "invalid@example.com") throw new Error("Invalid recipient");
    });
    const outcomes = await grantMonthlySheetPermissions(recipients, [
      { type: "user", emailAddress: "existing@example.com" },
    ], addPermission);
    expect(outcomes.map(outcome => outcome.status)).toEqual(["added", "already_shared", "failed", "added"]);
    expect(outcomes[2]).toMatchObject({ recipient: "invalid@example.com", error: "Invalid recipient" });
    expect(addPermission).toHaveBeenCalledTimes(3);
  });

});
