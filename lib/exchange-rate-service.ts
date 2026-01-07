// ==========================================
// EXCHANGE RATE SERVICE
// Free API: ExchangeRate-API (https://www.exchangerate-api.com/)
// ==========================================

import { prisma } from "@/lib/prisma";

// Cache exchange rates for 1 hour
const CACHE_DURATION_MS = 60 * 60 * 1000; // 1 hour

// Allow-list of supported base currencies for the external API.
// This restricts which values can influence the outbound request URL.
const ALLOWED_BASE_CURRENCIES: Set<string> = new Set([
  "LKR",
  "USD",
  "EUR",
  "GBP",
]);

interface ExchangeRateCache {
  rates: Record<string, number>;
  lastUpdated: Date;
  baseCurrency: string;
}

let rateCache: ExchangeRateCache | null = null;

// Free API endpoint (no API key required for basic usage)
const EXCHANGE_RATE_API_URL = "https://open.er-api.com/v6/latest";

/**
 * Normalize and validate the requested base currency against an allow-list.
 * Falls back to "LKR" if the requested value is not allowed.
 */
function normalizeBaseCurrency(requestedBaseCurrency: string | undefined): string {
  const normalized = (requestedBaseCurrency || "LKR").trim().toUpperCase();

  if (ALLOWED_BASE_CURRENCIES.has(normalized)) {
    return normalized;
  }

  // Fallback to a safe default under server control
  return "LKR";
}

/**
 * Fetch latest exchange rates from external API
 * Base currency is LKR (Sri Lankan Rupee)
 */
export async function fetchExchangeRates(
  baseCurrency: string = "LKR"
): Promise<Record<string, number>> {
  // Ensure the base currency influencing the outbound URL is validated.
  const safeBaseCurrency = normalizeBaseCurrency(baseCurrency);

  try {
    // Check cache first
    if (
      rateCache &&
      rateCache.baseCurrency === safeBaseCurrency &&
      Date.now() - rateCache.lastUpdated.getTime() < CACHE_DURATION_MS
    ) {
      return rateCache.rates;
    }

    const response = await fetch(
      `${EXCHANGE_RATE_API_URL}/${encodeURIComponent(safeBaseCurrency)}`,
      {
        next: { revalidate: 3600 }, // Cache for 1 hour in Next.js
      }
    );

    if (!response.ok) {
      throw new Error(`Exchange rate API error: ${response.status}`);
    }

    const data = await response.json();

    if (data.result !== "success") {
      throw new Error(data.error || "Failed to fetch exchange rates");
    }

    const rates = data.rates as Record<string, number>;

    // Update cache
    rateCache = {
      rates,
      lastUpdated: new Date(),
      baseCurrency: safeBaseCurrency,
    };

    return rates;
  } catch (error) {
    console.error("Error fetching exchange rates:", error);

    // Return cached rates if available, even if expired
    if (rateCache) {
      return rateCache.rates;
    }

    // Return default rates if no cache available
    return {
      LKR: 1,
      USD: 0.0031, // ~320 LKR to 1 USD
      EUR: 0.0029,
      GBP: 0.0025,
    };
  }
}

/**
 * Get exchange rate for a specific currency pair
 */
export async function getExchangeRate(
  fromCurrency: string,
  toCurrency: string = "LKR"
): Promise<number> {
  const rates = await fetchExchangeRates(toCurrency);
  return rates[fromCurrency] || 1;
}

/**
 * Update all currency exchange rates in database
 */
export async function updateDatabaseExchangeRates(): Promise<{
  updated: number;
  rates: Record<string, number>;
}> {
  // Get base currency from settings
  const settings = await prisma.accountingSettings.findFirst();
  const baseCurrencyId = settings?.baseCurrencyId;

  let baseCurrencyCode = "LKR";
  if (baseCurrencyId) {
    const baseCurrency = await prisma.currency.findUnique({
      where: { id: baseCurrencyId },
    });
    if (baseCurrency) {
      baseCurrencyCode = baseCurrency.code;
    }
  }

  // Fetch rates with base currency
  const rates = await fetchExchangeRates(baseCurrencyCode);

  // Get all currencies from database
  const currencies = await prisma.currency.findMany({
    where: { isActive: true },
  });

  let updated = 0;

  // Update each currency's exchange rate
  for (const currency of currencies) {
    if (currency.code === baseCurrencyCode) {
      // Base currency always has rate of 1
      await prisma.currency.update({
        where: { id: currency.id },
        data: { exchangeRate: 1 },
      });
    } else if (rates[currency.code]) {
      // Calculate rate relative to base currency
      // API returns rate FROM base TO target
      // We need rate FROM target TO base (how much base per 1 unit of target)
      const rate = 1 / rates[currency.code];

      await prisma.currency.update({
        where: { id: currency.id },
        data: { exchangeRate: rate },
      });
      updated++;
    }
  }

  return { updated, rates };
}

/**
 * Get supported currencies from the API
 */
export async function getSupportedCurrencies(): Promise<string[]> {
  try {
    const rates = await fetchExchangeRates("USD");
    return Object.keys(rates).sort();
  } catch {
    // Return common currencies if API fails
    return [
      "AED",
      "AUD",
      "BDT",
      "CAD",
      "CHF",
      "CNY",
      "EUR",
      "GBP",
      "HKD",
      "IDR",
      "INR",
      "JPY",
      "KRW",
      "LKR",
      "MYR",
      "NZD",
      "PHP",
      "PKR",
      "SAR",
      "SGD",
      "THB",
      "USD",
      "VND",
      "ZAR",
    ];
  }
}

/**
 * Get currency info (name, symbol) for common currencies
 */
export const CURRENCY_INFO: Record<string, { name: string; symbol: string }> = {
  LKR: { name: "Sri Lankan Rupee", symbol: "Rs" },
  USD: { name: "US Dollar", symbol: "$" },
  EUR: { name: "Euro", symbol: "€" },
  GBP: { name: "British Pound", symbol: "£" },
  INR: { name: "Indian Rupee", symbol: "₹" },
  AUD: { name: "Australian Dollar", symbol: "A$" },
  CAD: { name: "Canadian Dollar", symbol: "C$" },
  JPY: { name: "Japanese Yen", symbol: "¥" },
  CNY: { name: "Chinese Yuan", symbol: "¥" },
  SGD: { name: "Singapore Dollar", symbol: "S$" },
  AED: { name: "UAE Dirham", symbol: "د.إ" },
  SAR: { name: "Saudi Riyal", symbol: "﷼" },
  MYR: { name: "Malaysian Ringgit", symbol: "RM" },
  THB: { name: "Thai Baht", symbol: "฿" },
  PHP: { name: "Philippine Peso", symbol: "₱" },
  PKR: { name: "Pakistani Rupee", symbol: "₨" },
  BDT: { name: "Bangladeshi Taka", symbol: "৳" },
  IDR: { name: "Indonesian Rupiah", symbol: "Rp" },
  VND: { name: "Vietnamese Dong", symbol: "₫" },
  KRW: { name: "South Korean Won", symbol: "₩" },
  CHF: { name: "Swiss Franc", symbol: "CHF" },
  HKD: { name: "Hong Kong Dollar", symbol: "HK$" },
  NZD: { name: "New Zealand Dollar", symbol: "NZ$" },
  ZAR: { name: "South African Rand", symbol: "R" },
};
