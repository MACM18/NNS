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
import {
  getCashFlowSummary,
  getCashBasisIncomeStatement,
  getPartnershipSummary,
  getReceivableAging,
  getTaxReadySummary,
} from "@/lib/partnership-accounting-service";

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
    const financialYearId = searchParams.get("financialYearId");
    const outputFormat = searchParams.get("format");
    const basis = searchParams.get("basis") || "accrual";

    if (basis !== "accrual" && basis !== "cash") {
      return NextResponse.json({ error: "basis must be accrual or cash" }, { status: 400 });
    }

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
        data = basis === "cash"
          ? await getCashBasisIncomeStatement(new Date(startDate), new Date(endDate))
          : await generateIncomeStatement(new Date(startDate), new Date(endDate));
        break;

      case "balance-sheet":
        data = await generateBalanceSheet(
          asOfDate ? new Date(asOfDate) : undefined
        );
        break;

      case "receivable-aging":
        data = await getReceivableAging(asOfDate ? new Date(asOfDate) : new Date());
        break;

      case "cash-flow":
        if (!startDate || !endDate) {
          return NextResponse.json({ error: "Start date and end date are required for cash flow" }, { status: 400 });
        }
        data = await getCashFlowSummary(new Date(startDate), new Date(endDate));
        break;

      case "partnership-summary":
        if (!financialYearId) {
          return NextResponse.json({ error: "financialYearId is required for partnership summary" }, { status: 400 });
        }
        data = await getPartnershipSummary(financialYearId);
        break;

      case "tax-summary":
        if (!financialYearId) {
          return NextResponse.json({ error: "financialYearId is required for tax summary" }, { status: 400 });
        }
        data = await getTaxReadySummary(financialYearId);
        break;

      default:
        return NextResponse.json(
          { error: "Invalid report type" },
          { status: 400 }
        );
    }

    if (reportType === "tax-summary" && outputFormat === "csv") {
      const taxData = data as Awaited<ReturnType<typeof getTaxReadySummary>>;
      const rows = [
        ["Field", "Amount", "Configured mapping"],
        ["Gross invoiced revenue", taxData.grossInvoicedRevenue, taxData.taxMappings.turnover],
        ["Collected revenue", taxData.collectedRevenue, "cash_collections"],
        ["Gross business income", taxData.grossBusinessIncome, taxData.taxMappings.turnover],
        ["Allowable business expenses", taxData.allowableBusinessExpenses, taxData.taxMappings.allowableExpenses],
        ["Net business profit", taxData.netBusinessProfit, taxData.taxMappings.netProfit],
        ["Partner drawings", taxData.totalDrawings, "partner_drawings"],
        ["Expenses missing vouchers", taxData.deductibleExpensesMissingVouchers, "voucher_completeness"],
      ];
      const csv = rows.map((row) => row.map((value) => `"${String(value ?? "").replaceAll('"', '""')}"`).join(",")).join("\n");
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="tax-summary-${financialYearId}.csv"`,
        },
      });
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
