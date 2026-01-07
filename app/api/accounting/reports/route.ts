// ==========================================
// ACCOUNTING API - REPORTS
// GET /api/accounting/reports
// ==========================================

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  generateBalanceSheet,
  generateIncomeStatement,
  generateTrialBalance,
  hasAccountingAccess,
} from "@/lib/accounting-service";

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
    const reportType = searchParams.get("type"); // trial-balance, income-statement, balance-sheet
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const asOfDate = searchParams.get("asOfDate");

    if (!reportType) {
      return NextResponse.json(
        {
          error:
            "Report type is required (trial-balance, income-statement, balance-sheet)",
        },
        { status: 400 }
      );
    }

    let data;

    switch (reportType) {
      case "trial-balance":
        data = await generateTrialBalance(
          asOfDate ? new Date(asOfDate) : undefined
        );
        break;

      case "income-statement":
        if (!startDate || !endDate) {
          return NextResponse.json(
            {
              error:
                "Start date and end date are required for income statement",
            },
            { status: 400 }
          );
        }
        data = await generateIncomeStatement(
          new Date(startDate),
          new Date(endDate)
        );
        break;

      case "balance-sheet":
        data = await generateBalanceSheet(
          asOfDate ? new Date(asOfDate) : undefined
        );
        break;

      default:
        return NextResponse.json(
          { error: "Invalid report type" },
          { status: 400 }
        );
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error("Error generating report:", error);
    return NextResponse.json(
      { error: "Failed to generate report" },
      { status: 500 }
    );
  }
}
