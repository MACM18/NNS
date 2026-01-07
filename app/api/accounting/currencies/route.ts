// ==========================================
// ACCOUNTING API - CURRENCIES
// GET/POST /api/accounting/currencies
// ==========================================

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCurrencies, hasAccountingAccess } from "@/lib/accounting-service";

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
    const activeOnly = searchParams.get("activeOnly") !== "false";

    const currencies = await getCurrencies(activeOnly);

    return NextResponse.json({ data: currencies });
  } catch (error) {
    console.error("Error fetching currencies:", error);
    return NextResponse.json(
      { error: "Failed to fetch currencies" },
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

    const body = await req.json();
    const {
      code,
      name,
      symbol,
      exchangeRate,
      isBase,
      isActive,
      decimalPlaces,
    } = body;

    if (!code || !name || !symbol) {
      return NextResponse.json(
        { error: "Code, name, and symbol are required" },
        { status: 400 }
      );
    }

    // Check if code already exists
    const existing = await prisma.currency.findUnique({
      where: { code: code.toUpperCase() },
    });
    if (existing) {
      return NextResponse.json(
        { error: "Currency code already exists" },
        { status: 400 }
      );
    }

    // If setting as base currency, unset other base currencies
    if (isBase) {
      await prisma.currency.updateMany({
        where: { isBase: true },
        data: { isBase: false },
      });
    }

    const currency = await prisma.currency.create({
      data: {
        code: code.toUpperCase(),
        name,
        symbol,
        exchangeRate: exchangeRate || 1,
        isBase: isBase || false,
        isActive: isActive !== false,
        decimalPlaces: decimalPlaces || 2,
      },
    });

    return NextResponse.json({ data: currency }, { status: 201 });
  } catch (error) {
    console.error("Error creating currency:", error);
    return NextResponse.json(
      { error: "Failed to create currency" },
      { status: 500 }
    );
  }
}
