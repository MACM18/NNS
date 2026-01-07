/**
 * Payroll Dashboard Page Tests
 * NOTE: These tests align with the current UI in app/dashboard/payroll/page.tsx.
 */

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PayrollDashboardPage from "@/app/dashboard/payroll/page";

global.fetch = jest.fn();

// Next.js router is not used for navigation here (Link is used), but keep it mocked.
jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: jest.fn(),
    refresh: jest.fn(),
  }),
}));

// Page uses `const { role } = useAuth()`.
jest.mock("@/contexts/auth-context", () => ({
  useAuth: () => ({
    role: "admin",
  }),
}));

const addNotification = jest.fn();
jest.mock("@/contexts/notification-context", () => ({
  useNotification: () => ({
    addNotification,
  }),
}));

describe("Payroll Dashboard Page", () => {
  const mockPeriods = [
    {
      id: "period1",
      name: "January 2026 Payroll",
      month: 1,
      year: 2026,
      startDate: "2026-01-01T00:00:00Z",
      endDate: "2026-01-31T00:00:00Z",
      status: "draft",
      totalAmount: 0,
      _count: { payments: 0 },
    },
    {
      id: "period2",
      name: "February 2026 Payroll",
      month: 2,
      year: 2026,
      startDate: "2026-02-01T00:00:00Z",
      endDate: "2026-02-28T00:00:00Z",
      status: "processing",
      totalAmount: 150000,
      _count: { payments: 25 },
    },
    {
      id: "period3",
      name: "March 2026 Payroll",
      month: 3,
      year: 2026,
      startDate: "2026-03-01T00:00:00Z",
      endDate: "2026-03-31T00:00:00Z",
      status: "approved",
      totalAmount: 200000,
      _count: { payments: 30 },
    },
  ];

  const mockSummary = {
    totalPeriods: 3,
    draftPeriods: 1,
    approvedPeriods: 1,
    paidPeriods: 0,
    totalPaidAmount: 0,
    currentPeriod: {
      id: "period2",
      name: "February 2026 Payroll",
      totalAmount: 150000,
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    addNotification.mockClear();

    (global.fetch as jest.Mock).mockImplementation(
      (input: RequestInfo | URL, init?: RequestInit) => {
        const url =
          typeof input === "string"
            ? input
            : input instanceof URL
            ? input.toString()
            : (input as Request).url;
        const method = (init?.method ?? "GET").toUpperCase();

        if (method === "GET" && url === "/api/payroll/periods?action=summary") {
          return Promise.resolve({
            ok: true,
            json: async () => ({ data: mockSummary }),
          });
        }

        if (
          method === "GET" &&
          url?.startsWith("/api/payroll/periods?pageSize=")
        ) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ data: mockPeriods }),
          });
        }

        if (method === "POST" && url === "/api/payroll/periods") {
          return Promise.resolve({
            ok: true,
            json: async () => ({ data: { id: "period4" } }),
          });
        }

        if (method === "POST" && url?.startsWith("/api/payroll/periods/")) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ success: true }),
          });
        }

        return Promise.resolve({
          ok: false,
          json: async () => ({ error: "Not found" }),
        });
      }
    );
  });

  it("renders periods after loading", async () => {
    render(<PayrollDashboardPage />);

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: "Payroll" })
      ).toBeInTheDocument();
    });

    expect(screen.getByText("Payroll Periods")).toBeInTheDocument();
    expect(screen.getAllByText("January 2026 Payroll").length).toBeGreaterThan(
      0
    );
    expect(screen.getAllByText("February 2026 Payroll").length).toBeGreaterThan(
      0
    );
    expect(screen.getAllByText("March 2026 Payroll").length).toBeGreaterThan(0);
  });

  it("shows action buttons based on status and posts correct action payload", async () => {
    const user = userEvent.setup();
    render(<PayrollDashboardPage />);

    await waitFor(() => {
      expect(screen.getByText("January 2026 Payroll")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: /calculate/i }));

    expect(global.fetch).toHaveBeenCalledWith(
      "/api/payroll/periods/period1",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ action: "calculate" }),
      })
    );
  });

  it("opens the create period modal and posts to /api/payroll/periods", async () => {
    const user = userEvent.setup();
    render(<PayrollDashboardPage />);

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: "Payroll" })
      ).toBeInTheDocument();
    });

    await user.click(
      screen.getByRole("button", { name: /new payroll period/i })
    );
    expect(screen.getByText("Create Payroll Period")).toBeInTheDocument();

    const nameInput = screen.getByPlaceholderText("January 2026 Payroll");
    await user.clear(nameInput);
    await user.type(nameInput, "April 2026 Payroll");

    await user.click(screen.getByRole("button", { name: /create period/i }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/payroll/periods",
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: expect.stringContaining("April 2026 Payroll"),
        })
      );
    });
  });

  it("shows a spinner while loading", () => {
    (global.fetch as jest.Mock).mockImplementation(() => new Promise(() => {}));
    const { container } = render(<PayrollDashboardPage />);
    expect(container.querySelector(".animate-spin")).toBeInTheDocument();
  });

  it("notifies on API errors (no inline error text)", async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error("network"));

    render(<PayrollDashboardPage />);

    await waitFor(() => {
      expect(addNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Error",
          message: "Failed to load payroll data",
        })
      );
    });
  });
});
