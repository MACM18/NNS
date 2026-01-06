import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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

    // Get this month's invoices (only A and B types)
    const monthlyInvoices = await prisma.generatedInvoice.findMany({
      where: {
        month,
        year,
        invoiceType: { in: ["A", "B"] },
      },
    });

    // Calculate stats
    const thisMonth = monthlyInvoices.length;
    const totalAmount = monthlyInvoices.reduce(
      (sum, inv) => sum + Number(inv.totalAmount ?? 0),
      0
    );
    const linesBilled = monthlyInvoices.reduce(
      (sum, inv) => sum + Number(inv.lineCount ?? 0),
      0
    );
    const averageLinesBilled = thisMonth > 0 ? linesBilled / thisMonth : 0;
    const avgRate =
      averageLinesBilled > 0 ? Math.round(totalAmount / averageLinesBilled) : 0;

    return NextResponse.json({
      data: {
        thisMonth,
        totalAmount,
        linesBilled: averageLinesBilled,
        avgRate,
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
