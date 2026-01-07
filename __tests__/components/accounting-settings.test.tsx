/**
 * Accounting Settings Page Component Tests
 * Tests for the settings UI and CRUD operations
 */

import {
  render,
  screen,
  fireEvent,
  waitFor,
  within,
} from "@testing-library/react";
import "@testing-library/jest-dom";
import userEvent from "@testing-library/user-event";
import AccountingSettingsPage from "@/app/dashboard/accounting/settings/page";

// Mock fetch
global.fetch = jest.fn();

// Mock Next.js router
jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: jest.fn(),
    refresh: jest.fn(),
  }),
}));

// Mock AuthContext
jest.mock("@/contexts/auth-context", () => ({
  useAuth: () => ({ role: "admin" }),
}));

// Mock NotificationContext
const addNotification = jest.fn();
jest.mock("@/contexts/notification-context", () => ({
  useNotification: () => ({ addNotification }),
}));

describe("Accounting Settings Page", () => {
  const mockCurrencies = [
    {
      id: "curr1",
      code: "LKR",
      name: "Sri Lankan Rupee",
      symbol: "Rs.",
      exchangeRate: 1,
      isActive: true,
      isBase: true,
      decimalPlaces: 2,
      createdAt: new Date("2026-01-01T00:00:00Z"),
      updatedAt: new Date("2026-01-01T00:00:00Z"),
    },
    {
      id: "curr2",
      code: "USD",
      name: "US Dollar",
      symbol: "$",
      exchangeRate: 0.0033,
      isActive: true,
      isBase: false,
      decimalPlaces: 2,
      createdAt: new Date("2026-01-01T00:00:00Z"),
      updatedAt: new Date("2026-01-01T00:00:00Z"),
    },
  ];

  const mockPeriods = [
    {
      id: "period1",
      name: "2026 Q1",
      startDate: new Date("2026-01-01"),
      endDate: new Date("2026-03-31"),
      isActive: true,
      isClosed: false,
      createdBy: { id: "admin1", fullName: "Admin" },
      createdAt: new Date("2026-01-01T00:00:00Z"),
    },
  ];

  const mockSettings = {
    baseCurrencyId: "curr1",
    fiscalYearStart: 1,
    autoGenerateJournalEntries: true,
    requireApproval: false,
    allowBackdatedEntries: true,
    entryNumberPrefix: "JE-",
    paymentNumberPrefix: "PAY-",
    updatedAt: new Date("2026-01-01T00:00:00Z"),
  };

  const mockSupportedCurrencies = ["LKR", "USD", "EUR"];
  const mockCurrencyInfo = {
    LKR: { name: "Sri Lankan Rupee", symbol: "Rs" },
    USD: { name: "US Dollar", symbol: "$" },
    EUR: { name: "Euro", symbol: "€" },
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

        if (method === "GET" && url?.startsWith("/api/accounting/currencies")) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ data: mockCurrencies }),
          });
        }
        if (method === "GET" && url === "/api/accounting/periods") {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ data: mockPeriods }),
          });
        }
        if (method === "GET" && url === "/api/accounting/settings") {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ data: mockSettings }),
          });
        }
        if (
          method === "GET" &&
          url === "/api/accounting/exchange-rates?action=supported"
        ) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                data: mockSupportedCurrencies,
                currencyInfo: mockCurrencyInfo,
              }),
          });
        }

        if (method === "POST" && url === "/api/accounting/exchange-rates") {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ message: "Exchange rates updated" }),
          });
        }

        if (method === "PUT" && url === "/api/accounting/settings") {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ data: { ...mockSettings } }),
          });
        }

        if (method === "POST" && url === "/api/accounting/periods") {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                data: {
                  id: "period2",
                  name: "2026 Q2",
                  startDate: new Date("2026-04-01"),
                  endDate: new Date("2026-06-30"),
                  isActive: true,
                  isClosed: false,
                  createdBy: { id: "admin1", fullName: "Admin" },
                  createdAt: new Date("2026-04-01T00:00:00Z"),
                },
              }),
          });
        }

        if (method === "POST" && url === "/api/accounting/currencies") {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                data: {
                  id: "curr3",
                  code: "EUR",
                  name: "Euro",
                  symbol: "€",
                  exchangeRate: 0.0029,
                },
              }),
          });
        }

        if (
          method === "PUT" &&
          url?.startsWith("/api/accounting/currencies/")
        ) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                data: { ...mockCurrencies[1], exchangeRate: 0.0035 },
              }),
          });
        }

        if (
          method === "DELETE" &&
          url?.startsWith("/api/accounting/currencies/")
        ) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ success: true }),
          });
        }

        return Promise.resolve({
          ok: false,
          json: () => Promise.resolve({ error: "Not found" }),
        });
      }
    );
  });

  const openCurrenciesTab = async () => {
    const user = userEvent.setup();
    await waitFor(() => {
      expect(screen.getByText("Accounting Settings")).toBeInTheDocument();
    });
    await user.click(screen.getByRole("tab", { name: /currencies/i }));
    return user;
  };

  const openGeneralTab = async () => {
    const user = userEvent.setup();
    await waitFor(() => {
      expect(screen.getByText("Accounting Settings")).toBeInTheDocument();
    });
    await user.click(screen.getByRole("tab", { name: /general/i }));
    return user;
  };

  it("should render settings page with currencies and periods", async () => {
    render(<AccountingSettingsPage />);

    await waitFor(() => {
      expect(screen.getByText("Accounting Settings")).toBeInTheDocument();
    });

    // Periods tab is the default
    expect(screen.getByText("2026 Q1")).toBeInTheDocument();

    // Currencies are visible under the Currencies tab
    await openCurrenciesTab();
    expect(screen.getByText("LKR")).toBeInTheDocument();
    expect(screen.getByText("USD")).toBeInTheDocument();
  });

  it("should open create currency modal", async () => {
    render(<AccountingSettingsPage />);

    await openCurrenciesTab();

    const addButton = screen.getByRole("button", { name: /^add currency$/i });
    fireEvent.click(addButton);

    await waitFor(() => {
      const dialog = screen.getByRole("dialog");
      expect(
        within(dialog).getByRole("heading", { name: /^add currency$/i })
      ).toBeInTheDocument();
    });
  });

  it("should create new currency", async () => {
    render(<AccountingSettingsPage />);

    const user = await openCurrenciesTab();

    // Open modal
    const addButton = screen.getByRole("button", { name: /^add currency$/i });
    await user.click(addButton);

    await waitFor(() => {
      const dialog = screen.getByRole("dialog");
      expect(
        within(dialog).getByRole("heading", { name: /^add currency$/i })
      ).toBeInTheDocument();
    });

    const dialog = screen.getByRole("dialog");

    // Fill form (labels aren't programmatically associated, so use placeholders/roles)
    await user.type(within(dialog).getByPlaceholderText("USD"), "EUR");
    await user.type(within(dialog).getByPlaceholderText("US Dollar"), "Euro");
    await user.type(within(dialog).getByPlaceholderText("$"), "€");

    const exchangeRateInput = within(dialog).getByRole("spinbutton");
    await user.clear(exchangeRateInput);
    await user.type(exchangeRateInput, "0.0029");

    // Submit
    const submitButton = within(dialog).getByRole("button", {
      name: /^add currency$/i,
    });
    await user.click(submitButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/accounting/currencies",
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: expect.stringContaining("EUR"),
        })
      );
    });
  });

  it("should edit existing currency", async () => {
    render(<AccountingSettingsPage />);

    const user = await openCurrenciesTab();

    await waitFor(() => {
      expect(screen.getByText("USD")).toBeInTheDocument();
    });

    // Click the first icon button in the USD row (edit is an icon-only button)
    const usdRow = screen.getByText("USD").closest("tr");
    expect(usdRow).toBeTruthy();
    const iconButtons = usdRow!.querySelectorAll("button");
    await user.click(iconButtons[0]);

    // Update exchange rate
    const dialog = screen.getByRole("dialog");
    const rateInput = within(dialog).getByRole("spinbutton");
    await user.clear(rateInput);
    await user.type(rateInput, "0.0035");

    // Submit
    const submitButton = within(dialog).getByRole("button", {
      name: /^update currency$/i,
    });
    await user.click(submitButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        `/api/accounting/currencies/${mockCurrencies[1].id}`,
        expect.objectContaining({
          method: "PUT",
        })
      );
    });
  });

  it("should delete currency", async () => {
    render(<AccountingSettingsPage />);

    const user = await openCurrenciesTab();

    await waitFor(() => {
      expect(screen.getByText("USD")).toBeInTheDocument();
    });

    // Delete is a confirmation dialog triggered by icon-only button
    const usdRow = screen.getByText("USD").closest("tr");
    expect(usdRow).toBeTruthy();
    const iconButtons = usdRow!.querySelectorAll("button");
    await user.click(iconButtons[1]);
    await waitFor(() => {
      const dialog = screen.getByRole("dialog");
      expect(
        within(dialog).getByRole("heading", { name: /^delete currency$/i })
      ).toBeInTheDocument();
    });

    const dialog = screen.getByRole("dialog");
    await user.click(
      within(dialog).getByRole("button", { name: /^delete currency$/i })
    );

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        `/api/accounting/currencies/${mockCurrencies[1].id}`,
        expect.objectContaining({
          method: "DELETE",
        })
      );
    });
  });

  it("should refresh exchange rates", async () => {
    render(<AccountingSettingsPage />);

    const user = await openCurrenciesTab();

    // Click refresh button
    const refreshButton = screen.getByRole("button", {
      name: /update rates/i,
    });
    await user.click(refreshButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/accounting/exchange-rates",
        expect.objectContaining({
          method: "POST",
        })
      );
    });
  });

  it("should create accounting period", async () => {
    const user = userEvent.setup();
    render(<AccountingSettingsPage />);

    await waitFor(() => {
      expect(screen.getByText("Accounting Settings")).toBeInTheDocument();
    });

    // Open modal
    const addPeriodButton = screen.getByRole("button", {
      name: /add period/i,
    });
    await user.click(addPeriodButton);

    await waitFor(() => {
      expect(screen.getByText("Create Accounting Period")).toBeInTheDocument();
    });

    // Fill form
    await user.clear(screen.getByPlaceholderText(/e\.g\., january 2026/i));
    await user.type(
      screen.getByPlaceholderText(/e\.g\., january 2026/i),
      "2026 Q2"
    );

    // Submit
    const submitButton = screen.getByRole("button", { name: /create/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/accounting/periods",
        expect.objectContaining({
          method: "POST",
        })
      );
    });
  });

  it("updates settings via PUT (e.g., toggling Auto-generate Journal Entries)", async () => {
    render(<AccountingSettingsPage />);

    const user = await openGeneralTab();

    const row = screen
      .getByText(/auto-generate journal entries/i)
      .closest("div")?.parentElement;
    expect(row).toBeTruthy();
    const toggle = row!.querySelector('[role="switch"]');
    expect(toggle).toBeTruthy();
    await user.click(toggle!);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/accounting/settings",
        expect.objectContaining({
          method: "PUT",
          body: expect.stringContaining("autoGenerateJournalEntries"),
        })
      );
    });
  });

  it("notifies on fetch errors", async () => {
    (global.fetch as jest.Mock).mockImplementation(() =>
      Promise.reject(new Error("Network"))
    );

    render(<AccountingSettingsPage />);

    await waitFor(() => {
      expect(addNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Error",
          message: "Failed to load settings",
          type: "error",
        })
      );
    });
  });

  it("shows a spinner while loading", () => {
    (global.fetch as jest.Mock).mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    render(<AccountingSettingsPage />);

    expect(document.querySelector(".animate-spin")).toBeTruthy();
  });
});
