import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildInvoiceAnalytics } from "@/lib/invoice-analytics";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const rawYear = new URL(request.url).searchParams.get("year");
    const year = rawYear ? Number(rawYear) : new Date().getFullYear();
    if (!Number.isInteger(year) || year < 2000 || year > 2100) {
      return NextResponse.json({ error: "Year must be valid" }, { status: 400 });
    }

    const invoices = await prisma.generatedInvoice.findMany({
      where: { invoiceType: { in: ["A", "B"] }, month: { gte: 1, lte: 12 }, year: { gte: 2000, lte: 2100 } },
      select: { month: true, year: true, invoiceType: true, totalAmount: true, lineCount: true },
      orderBy: [{ year: "asc" }, { month: "asc" }],
    });

    const data = buildInvoiceAnalytics(invoices.map(invoice => ({
      month: invoice.month,
      year: invoice.year,
      invoiceType: invoice.invoiceType,
      totalAmount: Number(invoice.totalAmount || 0),
      lineCount: Number(invoice.lineCount || 0),
    })), year);
    return NextResponse.json({ data });
  } catch (error) {
    console.error("Error fetching invoice analytics:", error);
    return NextResponse.json({ error: "Failed to load invoice analytics" }, { status: 500 });
  }
}
