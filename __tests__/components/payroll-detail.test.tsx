/**
 * Payroll Detail Page Tests
 * Aligns with app/dashboard/payroll/[id]/page.tsx.
 */

import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PayrollDetailPage from "@/app/dashboard/payroll/[id]/page";
import { generateSalarySlipPDF } from "@/lib/salary-slip-pdf";

jest.mock("@/lib/salary-slip-pdf", () => ({
  generateSalarySlipPDF: jest.fn(),
}));

global.fetch = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: jest.fn(),
    refresh: jest.fn(),
  }),
}));

// Payroll detail page uses React's `use(params)` with params as a Promise.
jest.mock("react", () => ({
  ...jest.requireActual("react"),
  use: (promise: unknown) => {
    if (
      promise &&
      typeof promise === "object" &&
      "then" in promise &&
      typeof (promise as PromiseLike<unknown>).then === "function"
    ) {
      return { id: "period1" };
    }
    return promise;
  },
}));

jest.mock("@/contexts/auth-context", () => ({
  useAuth: () => ({ role: "admin" }),
}));

const addNotification = jest.fn();
jest.mock("@/contexts/notification-context", () => ({
  useNotification: () => ({ addNotification }),
}));

describe("Payroll Detail Page", () => {
  const mockPeriod = {
    id: "period1",
    name: "January 2026",
    startDate: "2026-01-01T00:00:00Z",
    endDate: "2026-01-31T00:00:00Z",
    status: "processing",
  };

  const mockPayments = [
    {
      id: "payment1",
      payrollPeriodId: "period1",
      workerId: "worker1",
      paymentType: "per_line",
      linesCompleted: 10,
      perLineRate: 500,
      baseAmount: 5000,
      bonusAmount: 1000,
      deductionAmount: 500,
      netAmount: 5500,
      status: "calculated",
      worker: {
        id: "worker1",
        fullName: "John Doe",
        bankName: "Commercial Bank",
        bankBranch: "Colombo",
        accountNumber: "1234567890",
      },
      adjustments: [
        {
          id: "adj1",
          type: "bonus",
          category: "performance_bonus",
          description: "Good work",
          amount: 1000,
        },
      ],
    },
    {
      id: "payment2",
      payrollPeriodId: "period1",
      workerId: "worker2",
      paymentType: "fixed_monthly",
      linesCompleted: 0,
      baseAmount: 50000,
      bonusAmount: 0,
      deductionAmount: 0,
      netAmount: 50000,
      status: "calculated",
      worker: {
        id: "worker2",
        fullName: "Jane Smith",
      },
      adjustments: [],
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    addNotification.mockClear();

    (global.fetch as jest.Mock).mockImplementation(
      (input: RequestInfo | URL, init?: RequestInit) => {
        const url = typeof input === "string" ? input : (input as Request).url;
        const method = (init?.method ?? "GET").toUpperCase();

        if (method === "GET" && url === "/api/payroll/periods/period1") {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              data: { ...mockPeriod, payments: mockPayments },
            }),
          });
        }

        if (method === "POST" && url === "/api/payroll/periods/period1") {
          return Promise.resolve({
            ok: true,
            json: async () => ({ success: true }),
          });
        }

        if (method === "POST" && url === "/api/payroll/adjustments") {
          return Promise.resolve({
            ok: true,
            json: async () => ({ success: true }),
          });
        }

        if (method === "DELETE" && url === "/api/payroll/adjustments?id=adj1") {
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

  it("renders period header and payments", async () => {
    render(<PayrollDetailPage params={Promise.resolve({ id: "period1" })} />);

    await waitFor(() => {
      expect(screen.getByText("January 2026")).toBeInTheDocument();
    });

    expect(screen.getByText("Processing")).toBeInTheDocument();
    expect(screen.getByText("Workers")).toBeInTheDocument();
    expect(screen.getAllByText("John Doe").length).toBeGreaterThan(0);
    expect(screen.getByText("Jane Smith")).toBeInTheDocument();
  });

  it("posts approve action to /api/payroll/periods/:id", async () => {
    const user = userEvent.setup();
    render(<PayrollDetailPage params={Promise.resolve({ id: "period1" })} />);

    await waitFor(() => {
      expect(screen.getByText("January 2026")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: /^approve$/i }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/payroll/periods/period1",
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "approve" }),
        })
      );
    });
  });

  it("opens Salary Slip modal and generates PDF", async () => {
    const user = userEvent.setup();
    render(<PayrollDetailPage params={Promise.resolve({ id: "period1" })} />);

    await waitFor(() => {
      expect(screen.getAllByText("John Doe").length).toBeGreaterThan(0);
    });

    const johnRow = screen.getAllByText("John Doe")[0].closest("tr");
    expect(johnRow).toBeTruthy();
    const buttons = within(johnRow!).getAllByRole("button");

    // Actions cell has: [+] then [salary slip]
    await user.click(buttons[1]);

    await waitFor(() => {
      expect(screen.getByText("Salary Slip")).toBeInTheDocument();
      expect(
        screen.getByText(/Payment details for John Doe/)
      ).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: /download pdf/i }));
    expect(generateSalarySlipPDF).toHaveBeenCalled();
  });

  it("notifies on fetch failure", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: false });
    render(<PayrollDetailPage params={Promise.resolve({ id: "period1" })} />);

    await waitFor(() => {
      expect(addNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Error",
          message: "Failed to load payroll period",
          type: "error",
        })
      );
    });
  });

  it("shows a spinner while loading", () => {
    (global.fetch as jest.Mock).mockImplementation(() => new Promise(() => {}));
    render(<PayrollDetailPage params={Promise.resolve({ id: "period1" })} />);
    expect(document.querySelector(".animate-spin")).toBeTruthy();
  });
});
