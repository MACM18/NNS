// ==========================================
// ACCOUNTING API - SINGLE ACCOUNT
// GET/PUT/DELETE /api/accounting/accounts/[id]
// ==========================================

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  getAccount,
  hasAccountingAccess,
  updateAccount,
} from "@/lib/accounting-service";

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
    const account = await getAccount(id);

    if (!account) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    return NextResponse.json({ data: account });
  } catch (error) {
    console.error("Error fetching account:", error);
    return NextResponse.json(
      { error: "Failed to fetch account" },
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
    const {
      name,
      description,
      subCategory,
      parentId,
      currencyId,
      isActive,
      displayOrder,
    } = body;

    const account = await updateAccount(id, {
      name,
      description,
      subCategory,
      parentId,
      currencyId,
      isActive,
      displayOrder,
    });

    return NextResponse.json({ data: account });
  } catch (error) {
    console.error("Error updating account:", error);
    return NextResponse.json(
      { error: "Failed to update account" },
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

    // Check if account has transactions
    const hasTransactions = await prisma.journalEntryLine.count({
      where: { accountId: id },
    });

    if (hasTransactions > 0) {
      return NextResponse.json(
        {
          error:
            "Cannot delete account with existing transactions. Deactivate it instead.",
        },
        { status: 400 }
      );
    }

    // Check if it's a system account
    const account = await prisma.chartOfAccount.findUnique({
      where: { id },
    });

    if (account?.isSystemAccount) {
      return NextResponse.json(
        { error: "Cannot delete system accounts" },
        { status: 400 }
      );
    }

    await prisma.chartOfAccount.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting account:", error);
    return NextResponse.json(
      { error: "Failed to delete account" },
      { status: 500 }
    );
  }
}
