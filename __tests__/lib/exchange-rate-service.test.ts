/**
 * Exchange Rate Service Tests
 * Aligns with lib/exchange-rate-service.ts.
 */

type ExchangeServiceModule = typeof import("@/lib/exchange-rate-service");

async function loadModules(): Promise<{
  exchangeService: ExchangeServiceModule;
  prisma: typeof import("@/lib/prisma")["prisma"];
}> {
  jest.resetModules();
  const prismaModule = await import("@/lib/prisma");
  const exchangeService = await import("@/lib/exchange-rate-service");
  return { exchangeService, prisma: prismaModule.prisma };
}

jest.mock("@/lib/prisma", () => ({
  prisma: {
    currency: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    accountingSettings: {
      findFirst: jest.fn(),
    },
  },
}));

global.fetch = jest.fn();

describe("Exchange Rate Service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockReset();
  });

  describe("fetchExchangeRates", () => {
    it("fetches rates from the external API", async () => {
      const { exchangeService } = await loadModules();
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          result: "success",
          rates: { USD: 1, EUR: 0.9, GBP: 0.8 },
        }),
      });

      const rates = await exchangeService.fetchExchangeRates("USD");

      expect(global.fetch).toHaveBeenCalledWith(
        "https://open.er-api.com/v6/latest/USD",
        { next: { revalidate: 3600 } }
      );
      expect(rates).toEqual({ USD: 1, EUR: 0.9, GBP: 0.8 });
    });

    it("uses cached rates for repeated calls", async () => {
      const { exchangeService } = await loadModules();
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          result: "success",
          rates: { USD: 1, EUR: 0.9 },
        }),
      });

      const first = await exchangeService.fetchExchangeRates("USD");
      const second = await exchangeService.fetchExchangeRates("USD");

      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(first).toEqual(second);
    });

    it("returns fallback rates on API failure (does not throw)", async () => {
      const consoleSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});
      const { exchangeService } = await loadModules();
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      const rates = await exchangeService.fetchExchangeRates("LKR");

      expect(rates).toMatchObject({
        LKR: 1,
        USD: 0.0031,
        EUR: 0.0029,
        GBP: 0.0025,
      });

      consoleSpy.mockRestore();
    });
  });

  describe("updateDatabaseExchangeRates", () => {
    it("updates base currency to 1 and others to 1/rate", async () => {
      const { exchangeService, prisma } = await loadModules();
      (prisma.accountingSettings.findFirst as jest.Mock).mockResolvedValue({
        baseCurrencyId: "cur_lkr",
      });
      (prisma.currency.findUnique as jest.Mock).mockResolvedValue({
        id: "cur_lkr",
        code: "LKR",
      });
      (prisma.currency.findMany as jest.Mock).mockResolvedValue([
        { id: "cur_lkr", code: "LKR", isActive: true },
        { id: "cur_usd", code: "USD", isActive: true },
        { id: "cur_xxx", code: "XXX", isActive: true },
      ]);

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          result: "success",
          rates: { LKR: 1, USD: 0.003125 },
        }),
      });
      (prisma.currency.update as jest.Mock).mockResolvedValue({});

      const result = await exchangeService.updateDatabaseExchangeRates();

      expect(global.fetch).toHaveBeenCalledWith(
        "https://open.er-api.com/v6/latest/LKR",
        { next: { revalidate: 3600 } }
      );

      expect(prisma.currency.update).toHaveBeenCalledWith({
        where: { id: "cur_lkr" },
        data: { exchangeRate: 1 },
      });

      expect(prisma.currency.update).toHaveBeenCalledWith({
        where: { id: "cur_usd" },
        data: { exchangeRate: 1 / 0.003125 },
      });

      // No update for unknown currency code missing from rates
      expect(prisma.currency.update).not.toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: "cur_xxx" } })
      );

      expect(result.updated).toBe(1);
      expect(result.rates).toEqual({ LKR: 1, USD: 0.003125 });
    });

    it("defaults base currency to LKR when settings are missing", async () => {
      const { exchangeService, prisma } = await loadModules();
      (prisma.accountingSettings.findFirst as jest.Mock).mockResolvedValue(
        null
      );
      (prisma.currency.findMany as jest.Mock).mockResolvedValue([
        { id: "cur_lkr", code: "LKR", isActive: true },
      ]);

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ result: "success", rates: { LKR: 1 } }),
      });
      (prisma.currency.update as jest.Mock).mockResolvedValue({});

      await exchangeService.updateDatabaseExchangeRates();
      expect(prisma.currency.findUnique).not.toHaveBeenCalled();
    });
  });

  describe("getSupportedCurrencies", () => {
    it("returns sorted currency codes", async () => {
      const { exchangeService } = await loadModules();
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          result: "success",
          rates: { USD: 1, EUR: 0.9, GBP: 0.8 },
        }),
      });

      const currencies = await exchangeService.getSupportedCurrencies();
      expect(currencies).toEqual(["EUR", "GBP", "USD"]);
    });

    it("returns default-rate currency codes even when API fails", async () => {
      const consoleSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});
      const { exchangeService } = await loadModules();
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      const currencies = await exchangeService.getSupportedCurrencies();
      expect(currencies).toEqual(["EUR", "GBP", "LKR", "USD"]);

      consoleSpy.mockRestore();
    });
  });

  describe("CURRENCY_INFO", () => {
    it("contains currency names and symbols", async () => {
      const { exchangeService } = await loadModules();
      expect(exchangeService.CURRENCY_INFO["USD"]).toEqual({
        name: "US Dollar",
        symbol: "$",
      });
      expect(exchangeService.CURRENCY_INFO["EUR"]).toEqual({
        name: "Euro",
        symbol: "€",
      });
      expect(exchangeService.CURRENCY_INFO["LKR"]).toEqual({
        name: "Sri Lankan Rupee",
        symbol: "Rs",
      });
    });
  });
});
