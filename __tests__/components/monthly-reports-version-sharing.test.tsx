import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MonthlyReportsPage } from "@/components/reports/monthly-reports-page";

jest.mock("@/contexts/auth-context", () => ({ useAuth: () => ({ role: "admin" }) }));
jest.mock("@/components/ui/month-year-picker", () => ({ MonthYearPicker: () => <div>Month picker</div> }));
jest.mock("@/components/modals/generate-monthly-invoices-modal", () => ({ GenerateMonthlyInvoicesModal: () => null }));

const version = (id: string, number: number, shareActive: boolean) => ({
  id, version: number, status: number === 2 ? "published" : "archived",
  createdAt: "2026-10-05T00:00:00.000Z", publishedAt: "2026-10-05T00:00:00.000Z",
  shareActive, shareRevokedAt: !shareActive && number === 1 ? "2026-10-05T01:00:00.000Z" : null, documents: [{ id: `doc-${number}`, reportType: "invoice-a", title: "Invoice A", fileName: "invoice-a.pdf" }],
});
const response = (body: unknown) => ({ ok: true, json: async () => body }) as Response;

describe("monthly report version controls", () => {
  it("shows a custom confirmation and updates only the revoked version", async () => {
    let olderShared = true;
    const confirmSpy = jest.spyOn(window, "confirm").mockImplementation(() => { throw new Error("Browser confirmation must not be used"); });
    (global.fetch as jest.Mock) = jest.fn(async (_url: string, init?: RequestInit) => {
      if (init?.method === "DELETE") {
        expect(JSON.parse(String(init.body))).toEqual({ versionId: "version-1" });
        olderShared = false;
        return response({ data: { versionId: "version-1", shareActive: false, shareRevokedAt: "2026-10-05T01:00:00.000Z" } });
      }
      return response({ data: [{ id: "report-1", year: 2026, month: 10, currentVersionId: "version-2", versions: [version("version-2", 2, true), version("version-1", 1, olderShared)] }] });
    });

    try {
      render(<MonthlyReportsPage />);
      await screen.findByText("Version 1");
      const stopButtons = screen.getAllByRole("button", { name: "Stop sharing" });
      fireEvent.click(stopButtons[1]);
      const dialog = screen.getByRole("alertdialog", { name: "Stop sharing this version?" });
      expect(within(dialog).getByText(/Other versions keep their own links/)).toBeInTheDocument();
      fireEvent.click(within(dialog).getByRole("button", { name: "Stop sharing" }));

      await waitFor(() => expect(screen.getByText(/Sharing stopped/)).toBeInTheDocument());
      expect(screen.getAllByRole("button", { name: "Stop sharing" })).toHaveLength(1);
      const deleteButtons = screen.getAllByRole("button", { name: "Delete version" });
      expect(deleteButtons[0]).toBeDisabled();
      expect(deleteButtons[1]).toBeEnabled();
      expect(confirmSpy).not.toHaveBeenCalled();
    } finally { confirmSpy.mockRestore(); }
  });
});
