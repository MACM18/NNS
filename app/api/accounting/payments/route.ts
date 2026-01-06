// ==========================================
// ACCOUNTING API - PAYMENTS
// GET/POST /api/accounting/payments
// ==========================================

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  getPayments,
  hasAccountingAccess,
  recordPayment,
} from "@/lib/accounting-service";
import type { InvoiceTypeValue, PaymentMethodType } from "@/types/accounting";

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
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const invoiceType = searchParams.get("invoiceType") as InvoiceTypeValue | null;
    const paymentMethod = searchParams.get("paymentMethod") as PaymentMethodType | null;
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    const status = searchParams.get("status");
    const search = searchParams.get("search");

    const { payments, total } = await getPayments(
      {
        invoiceType: invoiceType || undefined,
        paymentMethod: paymentMethod || undefined,
        dateFrom: dateFrom ? new Date(dateFrom) : undefined,
        dateTo: dateTo ? new Date(dateTo) : undefined,
        status: status || undefined,
        search: search || undefined,
      },
      page,
      limit
    );

    return NextResponse.json({
      data: payments,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching payments:", error);
    return NextResponse.json(
      { error: "Failed to fetch payments" },
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
      select: { id: true, role: true },
    });

    if (!hasAccountingAccess(profile?.role)) {
      return NextResponse.json(
        { error: "Access denied. Moderator or admin role required." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const {
      invoiceId,
      invoiceType,
      paymentDate,
      amount,
      currencyId,
      exchangeRate,
      paymentMethod,
      reference,
      bankAccountId,
      notes,
    } = body;

    if (!invoiceId || !invoiceType || !paymentDate || !amount || !paymentMethod) {
      return NextResponse.json(
        { error: "Invoice ID, invoice type, payment date, amount, and payment method are required" },
        { status: 400 }
      );
    }

    if (amount <= 0) {
      return NextResponse.json(
        { error: "Payment amount must be greater than zero" },
        { status: 400 }
      );
    }

    const result = await recordPayment(
      {
        invoiceId,
        invoiceType,
        paymentDate: new Date(paymentDate),
        amount,
        currencyId,
        exchangeRate,
        paymentMethod,
        reference,
        bankAccountId,
        notes,
      },
      profile!.id
    );

    return NextResponse.json({ data: result }, { status: 201 });
  } catch (error) {
    console.error("Error recording payment:", error);
    const message = error instanceof Error ? error.message : "Failed to record payment";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
