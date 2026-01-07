// ==========================================
// API: Exchange Rates
// GET /api/accounting/exchange-rates - Fetch latest rates
// POST /api/accounting/exchange-rates/update - Update database rates
// ==========================================

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasAccountingAccess } from "@/lib/accounting-service";
import {
  fetchExchangeRates,
  updateDatabaseExchangeRates,
  getSupportedCurrencies,
  CURRENCY_INFO,
} from "@/lib/exchange-rate-service";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const profile = await prisma.profile.findUnique({
      where: { userId: session.user.id },
      select: { role: true },
    });

    if (!hasAccountingAccess(profile?.role)) {
      return NextResponse.json(
        { error: "Access denied. Moderator or admin role required." },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const baseCurrency = searchParams.get("base") || "LKR";
    const action = searchParams.get("action");

    if (action === "supported") {
      // Return list of supported currencies
      const supported = await getSupportedCurrencies();
      return NextResponse.json({
        data: supported,
        currencyInfo: CURRENCY_INFO,
      });
    }

    // Fetch latest exchange rates
    const rates = await fetchExchangeRates(baseCurrency);

    return NextResponse.json({
      data: rates,
      baseCurrency,
      lastUpdated: new Date().toISOString(),
      currencyInfo: CURRENCY_INFO,
    });
  } catch (error) {
    console.error("Error fetching exchange rates:", error);
    return NextResponse.json(
      { error: "Failed to fetch exchange rates" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const profile = await prisma.profile.findUnique({
      where: { userId: session.user.id },
      select: { role: true },
    });

    if (!hasAccountingAccess(profile?.role)) {
      return NextResponse.json(
        { error: "Access denied. Moderator or admin role required." },
        { status: 403 }
      );
    }

    // Update all currency exchange rates in database
    const result = await updateDatabaseExchangeRates();

    return NextResponse.json({
      success: true,
      message: `Updated ${result.updated} currency rates`,
      data: result,
    });
  } catch (error) {
    console.error("Error updating exchange rates:", error);
    return NextResponse.json(
      { error: "Failed to update exchange rates" },
      { status: 500 }
    );
  }
}
