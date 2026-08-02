import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createAndIssueGeneratedInvoice } from "@/lib/partnership-accounting-service";

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
    if (!["admin", "moderator", "superadmin"].includes((profile?.role || "").toLowerCase())) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { invoices, month, year } = body;

    if (!invoices || !Array.isArray(invoices)) {
      return NextResponse.json(
        { error: "Invoices array is required" },
        { status: 400 }
      );
    }

    const results = [];

    for (const invoice of invoices) {
      const existing = await prisma.generatedInvoice.findFirst({
        where: {
          invoiceNumber: invoice.invoice_number,
          month: parseInt(month),
          year: parseInt(year),
        },
      });
      if (existing && (existing.accountingStatus === "posted" || Number(existing.paidAmount) > 0)) {
        return NextResponse.json(
          { error: "Issued or paid invoices cannot be regenerated: " + invoice.invoice_number },
          { status: 409 },
        );
      }
      if (existing) {
        await prisma.generatedInvoice.delete({ where: { id: existing.id } });
      }
      const createdInvoice = await createAndIssueGeneratedInvoice({
        invoiceNumber: invoice.invoice_number,
        invoiceType: invoice.invoice_type,
        month: parseInt(month),
        year: parseInt(year),
        jobMonth: invoice.job_month,
        invoiceDate: new Date(invoice.invoice_date),
        totalAmount: Number(invoice.total_amount),
        lineCount: Number(invoice.line_count),
        lineDetailsIds: invoice.line_details_ids,
        status: invoice.status || "issued",
        createdById: profile!.id,
      });

      results.push(createdInvoice);
    }

    const formatted = results.map((inv) => ({
      id: inv.id,
      invoice_number: inv.invoiceNumber,
      invoice_type: inv.invoiceType,
      month: inv.month ?? null,
      year: inv.year ?? null,
      job_month: inv.jobMonth || null,
      invoice_date: inv.invoiceDate
        ? inv.invoiceDate.toISOString().slice(0, 10)
        : null,
      total_amount: inv.totalAmount ? Number(inv.totalAmount) : 0,
      line_count: inv.lineCount ? Number(inv.lineCount) : 0,
      line_details_ids: inv.lineDetailsIds || null,
      status: inv.status || null,
      paid_amount: Number(inv.paidAmount || 0),
      payment_status: inv.paymentStatus,
      due_date: inv.dueDate?.toISOString().slice(0, 10) || null,
      accounting_status: inv.accountingStatus,
      created_at: inv.createdAt?.toISOString(),
    }));

    return NextResponse.json({ data: formatted });
  } catch (error) {
    console.error("Error generating invoices:", error);
    return NextResponse.json(
      { error: "Failed to generate invoices" },
      { status: 500 }
    );
  }
}
