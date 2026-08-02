import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasAccountingAccess } from "@/lib/accounting-service";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const profile = await prisma.profile.findUnique({ where: { userId: session.user.id }, select: { role: true } });
    if (!hasAccountingAccess(profile?.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const asOf = new Date(request.nextUrl.searchParams.get("asOfDate") || new Date().toISOString());
    const invoices = await prisma.generatedInvoice.findMany({
      where: { accountingStatus: "posted", paymentStatus: { in: ["unpaid", "partial"] } },
      orderBy: [{ dueDate: "asc" }, { invoiceDate: "asc" }],
    });
    const data = invoices.map((invoice) => {
      const outstanding = Math.max(0, Number(invoice.totalAmount) - Number(invoice.paidAmount || 0));
      const dueDate = new Date(invoice.dueDate || invoice.invoiceDate || invoice.createdAt);
      const ageDays = Math.max(0, Math.floor((asOf.getTime() - dueDate.getTime()) / 86400000));
      const bucket = ageDays <= 0 ? "current" : ageDays <= 30 ? "1_30" : ageDays <= 60 ? "31_60" : ageDays <= 90 ? "61_90" : "90_plus";
      return { id: invoice.id, invoiceNumber: invoice.invoiceNumber, invoiceDate: invoice.invoiceDate, dueDate, totalAmount: Number(invoice.totalAmount), paidAmount: Number(invoice.paidAmount || 0), outstanding, ageDays, bucket };
    });
    const buckets = ["current", "1_30", "31_60", "61_90", "90_plus"].map((bucket) => ({ bucket, count: data.filter((invoice) => invoice.bucket === bucket).length, amount: data.filter((invoice) => invoice.bucket === bucket).reduce((sum, invoice) => sum + invoice.outstanding, 0) }));
    return NextResponse.json({ data: { asOfDate: asOf, buckets, invoices: data, totalOutstanding: data.reduce((sum, invoice) => sum + invoice.outstanding, 0) } });
  } catch (error) {
    console.error("Error fetching receivables:", error);
    return NextResponse.json({ error: "Failed to fetch receivables" }, { status: 500 });
  }
}
