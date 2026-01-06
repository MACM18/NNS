// ==========================================
// ACCOUNTING API - ACCOUNTS (Chart of Accounts)
// GET/POST /api/accounting/accounts
// ==========================================

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  createAccount,
  getAccounts,
  getAccountsHierarchy,
  hasAccountingAccess,
} from "@/lib/accounting-service";
import type { AccountCategoryType } from "@/types/accounting";

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
    const hierarchy = searchParams.get("hierarchy") === "true";
    const category = searchParams.get("category") as AccountCategoryType | null;
    const subCategory = searchParams.get("subCategory");
    const isActive = searchParams.get("isActive");
    const search = searchParams.get("search");
    const parentId = searchParams.get("parentId");

    if (hierarchy) {
      const accounts = await getAccountsHierarchy();
      return NextResponse.json({ data: accounts });
    }

    const accounts = await getAccounts({
      category: category || undefined,
      subCategory: subCategory || undefined,
      isActive: isActive ? isActive === "true" : undefined,
      search: search || undefined,
      parentId: parentId || undefined,
    });

    return NextResponse.json({ data: accounts });
  } catch (error) {
    console.error("Error fetching accounts:", error);
    return NextResponse.json(
      { error: "Failed to fetch accounts" },
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
      description,
      category,
      subCategory,
      parentId,
      currencyId,
      normalBalance,
      openingBalance,
      displayOrder,
    } = body;

    if (!code || !name || !category) {
      return NextResponse.json(
        { error: "Code, name, and category are required" },
        { status: 400 }
      );
    }

    // Check if code already exists
    const existing = await prisma.chartOfAccount.findUnique({
      where: { code },
    });
    if (existing) {
      return NextResponse.json(
        { error: "Account code already exists" },
        { status: 400 }
      );
    }

    const account = await createAccount({
      code,
      name,
      description,
      category,
      subCategory,
      parentId,
      currencyId,
      normalBalance,
      openingBalance,
      displayOrder,
    });

    return NextResponse.json({ data: account }, { status: 201 });
  } catch (error) {
    console.error("Error creating account:", error);
    return NextResponse.json(
      { error: "Failed to create account" },
      { status: 500 }
    );
  }
}
