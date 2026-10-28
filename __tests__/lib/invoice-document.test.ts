import { DEFAULT_INVOICE_DOCUMENT_FIELDS, normalizeInvoiceContentSnapshot } from "@/lib/invoice-document";
import { invoicePdfFilename } from "@/lib/monthly-report-pdf";

describe("invoice document snapshots", () => {
  it("fills older invoices with current template defaults", () => {
    const content = normalizeInvoiceContentSnapshot(null);
    expect(content.fields.billToName).toBe("Sri Lanka Telecom (Services) Limited");
    expect(content.fields.preparedByLabel).toBe(DEFAULT_INVOICE_DOCUMENT_FIELDS.preparedByLabel);
    expect(content.percentA + content.percentB).toBe(100);
  });

  it("keeps custom row order and validates editable split values", () => {
    const content = normalizeInvoiceContentSnapshot({
      percentA: 75,
      percentB: 25,
      customRows: [
        { id: "row-a", description: "Pole installation", rtom: "GL", quantity: 2, unitRate: 700 },
        { id: "row-b", description: "Travel", rtom: "", quantity: 1, unitRate: 250.5 },
      ],
    });
    expect(content.customRows.map(row => row.description)).toEqual(["Pole installation", "Travel"]);
    expect(content.percentA).toBe(75);
    expect(() => normalizeInvoiceContentSnapshot({ percentA: 75, percentB: 20 })).toThrow("add up to 100");
  });

  it("creates distinct readable filenames for A and B", () => {
    expect(invoicePdfFilename("A", "S/Southern/HR/NC/26/August")).toBe("NNS-Invoice-A-S-Southern-HR-NC-26-August.pdf");
    expect(invoicePdfFilename("B", "S/Southern/HR/NC/26/August")).not.toBe(invoicePdfFilename("A", "S/Southern/HR/NC/26/August"));
  });
});
