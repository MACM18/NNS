import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createBankAccount } from "@/lib/accounting-service";
import { prisma } from "@/lib/prisma";
import { hasAccountingAccess } from "@/lib/accounting-service";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = (session.user.role || "user").toLowerCase();
    if (!hasAccountingAccess(role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const {
      code,
      name,
      bankName,
      accountTitle,
      accountNumber,
      branchCode,
      iban,
      currencyId,
      openingBalance,
    } = body;

    if (!code || !name) {
      return NextResponse.json(
        { error: "Code and name required" },
        { status: 400 },
      );
    }

    // Ensure code uniqueness
    const existing = await prisma.chartOfAccount.findUnique({
      where: { code },
    });
    if (existing) {
      return NextResponse.json(
        { error: "Account code already exists" },
        { status: 400 },
      );
    }

    const result = await createBankAccount({
      code,
      name,
      bankName,
      accountTitle,
      accountNumber,
      branchCode,
      iban,
      currencyId,
      openingBalance,
    });

    return NextResponse.json({ data: result }, { status: 201 });
  } catch (error) {
    console.error("Error creating bank account:", error);
    return NextResponse.json(
      { error: "Failed to create bank account" },
      { status: 500 },
    );
  }
}

export async function GET() {
  try {
    // Return list of bank accounts joined with chart account info
    const banks = await prisma.bankAccount.findMany({
      include: { chartAccount: true },
    });
    return NextResponse.json({ data: banks });
  } catch (error) {
    console.error("Error fetching bank accounts:", error);
    return NextResponse.json(
      { error: "Failed to fetch bank accounts" },
      { status: 500 },
    );
  }
}
