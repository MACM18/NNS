import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import GoogleSheetMonthlySetup from "@/components/integrations/GoogleSheetMonthlySetup";

jest.mock("@googleworkspace/drive-picker-react", () => {
  const React = require("react");
  return {
    DrivePicker: ({ children, onPicked, onCanceled, ...props }: any) => React.createElement(
      "div",
      { "data-testid": "drive-picker", "data-app-id": props["app-id"], "data-api-key": props["developer-key"], "data-access-token": props["oauth-token"], "data-origin": props.origin },
      children,
      React.createElement("button", { onClick: () => onPicked({ detail: { docs: [{ id: "picked-id", name: "Chosen", mimeType: props.title.includes("folder") ? "application/vnd.google-apps.folder" : "application/vnd.google-apps.spreadsheet" }] } }) }, "Simulate pick"),
      React.createElement("button", { onClick: onCanceled }, "Simulate cancel"),
    ),
    DrivePickerDocsView: (props: any) => React.createElement("div", { "data-testid": "drive-picker-view", ...props }),
  };
}, { virtual: true });

const existingSettings = {
  connected: true,
  accountEmail: "admin@example.com",
  enabled: false,
  templateFileId: "old-template",
  destinationFolderId: "old-folder",
  namePattern: "NNS Telecom - {Month} {Year}",
  editors: [],
  lastRun: null,
};

function jsonResponse(body: unknown, ok = true) {
  return { ok, json: async () => body } as Response;
}

describe("Google monthly setup picker", () => {
  beforeEach(() => {
    let savedSettings = { ...existingSettings };
    (global.fetch as jest.Mock) = jest.fn(async (url: string, init?: RequestInit) => {
      if (url.endsWith("/settings") && init?.method === "PUT") {
        const body = JSON.parse(String(init.body));
        savedSettings = { ...savedSettings, ...body };
        return jsonResponse({ ok: true });
      }
      if (url.endsWith("/settings")) return jsonResponse(savedSettings);
      if (url.endsWith("/runs")) return jsonResponse({ runs: [], currentPeriod: "2026-10", currentConnection: null });
      if (url.endsWith("/picker-token")) return jsonResponse({ accessToken: "short-lived-admin-token", apiKey: "browser-key", appId: "project-number" });
      throw new Error(`Unexpected fetch: ${url}`);
    });
  });

  it("selects a spreadsheet, retains it when saved, and reloads the saved ID", async () => {
    render(<GoogleSheetMonthlySetup />);
    fireEvent.click(screen.getByRole("button", { name: /Monthly sheet setup/ }));
    await screen.findByText("Connected as admin@example.com");
    fireEvent.click(screen.getByRole("button", { name: "Choose master spreadsheet" }));

    const picker = await screen.findByTestId("drive-picker");
    expect(picker).toHaveAttribute("data-access-token", "short-lived-admin-token");
    expect(screen.getByTestId("drive-picker-view")).toHaveAttribute("view-id", "SPREADSHEETS");
    fireEvent.click(screen.getByRole("button", { name: "Simulate pick" }));
    expect(screen.getByLabelText("Master template ID")).toHaveValue("picked-id");

    fireEvent.click(screen.getByRole("button", { name: "Save monthly setup" }));
    await waitFor(() => expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining("/settings"), expect.objectContaining({ method: "PUT", body: expect.stringContaining('"templateFileId":"picked-id"') })));
    await waitFor(() => expect(screen.getByText("Monthly sheet setup saved.")).toBeInTheDocument());
    expect(screen.getByLabelText("Master template ID")).toHaveValue("picked-id");
  });

  it("requires checking and reviewing the current connection before preparing the month", async () => {
    const currentConnection = { id: "connection-123", sheetName: "NNS October", sheetUrl: "https://sheet.example/current", status: "active", autoSyncEnabled: true, createdAt: "2026-10-04T00:00:00.000Z" };
    const currentRun = { id: "run-123", period: "2026-10", status: "failed", error: "Previous attempt failed", fileUrl: "https://sheet.example/current", startedAt: "2026-10-04T00:00:00.000Z", finishedAt: "2026-10-04T00:01:00.000Z", events: [] };
    (global.fetch as jest.Mock) = jest.fn(async (url: string, init?: RequestInit) => {
      if (url.endsWith("/settings") && init?.method === "PUT") return jsonResponse({ ok: true });
      if (url.endsWith("/settings")) return jsonResponse(existingSettings);
      if (url.endsWith("/runs")) return jsonResponse({ runs: [currentRun], currentPeriod: "2026-10", currentConnection });
      if (url.endsWith("/provision")) return jsonResponse({ ok: true, runId: "run-123", status: "success", fileUrl: currentConnection.sheetUrl });
      throw new Error(`Unexpected fetch: ${url}`);
    });

    render(<GoogleSheetMonthlySetup />);
    fireEvent.click(screen.getByRole("button", { name: /Monthly sheet setup/ }));
    await screen.findByText("Connected as admin@example.com");
    const prepareButton = screen.getByRole("button", { name: "Prepare this month" });
    expect(prepareButton).toBeDisabled();
    fireEvent.click(screen.getByRole("checkbox", { name: /reviewed the current-month connection check/ }));
    expect(prepareButton).toBeEnabled();
    fireEvent.click(prepareButton);

    expect(await screen.findByRole("alertdialog", { name: "Confirm 2026-10 sheet setup" })).toBeInTheDocument();
    expect(screen.getByText("Current connection found")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Review connected sheet/ })).toHaveAttribute("href", currentConnection.sheetUrl);
    fireEvent.click(screen.getByRole("button", { name: "Continue existing setup" }));
    await waitFor(() => expect(global.fetch).toHaveBeenCalledWith("/api/integrations/google-sheets/monthly/provision", expect.objectContaining({
      method: "POST",
      body: JSON.stringify({ confirmed: true, expectedConnectionId: "connection-123", expectedRunId: "run-123" }),
    })));
  });

  it("selects folders from the folder view and leaves the saved value unchanged on cancel", async () => {
    render(<GoogleSheetMonthlySetup />);
    fireEvent.click(screen.getByRole("button", { name: /Monthly sheet setup/ }));
    await screen.findByText("Connected as admin@example.com");
    fireEvent.click(screen.getByRole("button", { name: "Choose destination folder" }));
    await screen.findByTestId("drive-picker");
    const folderView = screen.getByTestId("drive-picker-view");
    expect(folderView).toHaveAttribute("view-id", "FOLDERS");
    expect(folderView).toHaveAttribute("select-folder-enabled", "true");
    expect(folderView).toHaveAttribute("enable-drives", "true");
    fireEvent.click(screen.getByRole("button", { name: "Simulate pick" }));
    expect(screen.getByLabelText("Destination folder ID")).toHaveValue("picked-id");

    fireEvent.click(screen.getByRole("button", { name: "Choose destination folder" }));
    await screen.findByTestId("drive-picker");
    fireEvent.click(screen.getByRole("button", { name: "Simulate cancel" }));
    expect(screen.getByLabelText("Destination folder ID")).toHaveValue("picked-id");
    expect(screen.getByRole("status")).toHaveTextContent("Selection cancelled");
  });
});
