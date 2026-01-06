// ==========================================
// ACCOUNTING API - SINGLE CURRENCY
// GET/PUT/DELETE /api/accounting/currencies/[id]
// ==========================================

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCurrency, hasAccountingAccess, updateExchangeRate } from "@/lib/accounting-service";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;
    const currency = await getCurrency(id);

    if (!currency) {
      return NextResponse.json({ error: "Currency not found" }, { status: 404 });
    }

    return NextResponse.json({ data: currency });
  } catch (error) {
    console.error("Error fetching currency:", error);
    return NextResponse.json(
      { error: "Failed to fetch currency" },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;
    const body = await req.json();
    const { name, symbol, exchangeRate, isBase, isActive, decimalPlaces } = body;

    // If setting as base currency, unset other base currencies
    if (isBase) {
      await prisma.currency.updateMany({
        where: { isBase: true, id: { not: id } },
        data: { isBase: false },
      });
    }

    const currency = await prisma.currency.update({
      where: { id },
      data: {
        name,
        symbol,
        exchangeRate,
        isBase,
        isActive,
        decimalPlaces,
      },
    });

    return NextResponse.json({ data: currency });
  } catch (error) {
    console.error("Error updating currency:", error);
    return NextResponse.json(
      { error: "Failed to update currency" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;

    // Check if currency is base currency
    const currency = await prisma.currency.findUnique({ where: { id } });
    if (currency?.isBase) {
      return NextResponse.json(
        { error: "Cannot delete base currency" },
        { status: 400 }
      );
    }

    // Check if currency is used in any transactions
    const usedInJournals = await prisma.journalEntry.count({
      where: { currencyId: id },
    });
    const usedInPayments = await prisma.invoicePayment.count({
      where: { currencyId: id },
    });

    if (usedInJournals > 0 || usedInPayments > 0) {
      return NextResponse.json(
        { error: "Cannot delete currency with existing transactions. Deactivate it instead." },
        { status: 400 }
      );
    }

    await prisma.currency.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting currency:", error);
    return NextResponse.json(
      { error: "Failed to delete currency" },
      { status: 500 }
    );
  }
}
