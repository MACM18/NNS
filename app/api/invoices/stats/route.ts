import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildInvoiceAnalytics } from "@/lib/invoice-analytics";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const month = parseInt(
      searchParams.get("month") || String(new Date().getMonth() + 1)
    );
    const year = parseInt(
      searchParams.get("year") || String(new Date().getFullYear())
    );

    if (!Number.isInteger(month) || month < 1 || month > 12 || !Number.isInteger(year) || year < 2000 || year > 2100) {
      return NextResponse.json({ error: "Month and year must be valid" }, { status: 400 });
    }

    const monthlyInvoices = await prisma.generatedInvoice.findMany({
      where: {
        month,
        year,
        invoiceType: { in: ["A", "B"] },
      },
      select: { month: true, year: true, invoiceType: true, totalAmount: true, lineCount: true },
    });
    const monthData = buildInvoiceAnalytics(monthlyInvoices.map(invoice => ({
      month: invoice.month,
      year: invoice.year,
      invoiceType: invoice.invoiceType,
      totalAmount: Number(invoice.totalAmount || 0),
      lineCount: Number(invoice.lineCount || 0),
    })), year).byMonth[month - 1];

    return NextResponse.json({
      data: {
        thisMonth: monthData.invoicePairs,
        totalAmount: monthData.totalBilled,
        linesBilled: monthData.lines,
        avgRate: monthData.lines > 0 ? Math.round(monthData.totalBilled / monthData.lines) : 0,
        amountA: monthData.amountA,
        amountB: monthData.amountB,
      },
    });
  } catch (error) {
    console.error("Error fetching invoice stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch invoice stats" },
      { status: 500 }
    );
  }
}
