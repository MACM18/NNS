import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createIssuedInvoiceFromLines } from "@/lib/partnership-accounting-service";

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
    const requestedNumbers = new Set<string>();

    for (const invoice of invoices) {
      const invoiceNumber = String(invoice.invoice_number || "").trim();
      const lineDetailsIds = Array.isArray(invoice.line_details_ids)
        ? invoice.line_details_ids.filter((id: unknown): id is string => typeof id === "string")
        : [];
      if (!invoiceNumber || lineDetailsIds.length === 0) {
        return NextResponse.json(
          { error: "Each invoice requires an invoice number and at least one line ID" },
          { status: 400 },
        );
      }
      if (requestedNumbers.has(invoiceNumber)) {
        return NextResponse.json({ error: "Duplicate invoice number in request: " + invoiceNumber }, { status: 409 });
      }
      requestedNumbers.add(invoiceNumber);
      const existing = await prisma.generatedInvoice.findFirst({
        where: {
          invoiceNumber,
        },
      });
      if (existing) {
        return NextResponse.json(
          { error: "Invoices cannot be regenerated or replaced: " + invoiceNumber },
          { status: 409 },
        );
      }
      const createdInvoice = await createIssuedInvoiceFromLines({
        invoiceNumber,
        invoiceType: invoice.invoice_type,
        month: parseInt(month),
        year: parseInt(year),
        jobMonth: invoice.job_month,
        invoiceDate: new Date(invoice.invoice_date),
        lineDetailsIds,
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
      pricing_schedule_id: inv.pricingScheduleId || null,
      pricing_snapshot: inv.pricingSnapshot || null,
      line_details_snapshot: inv.lineDetailsSnapshot || null,
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
    if (error instanceof Error && error.message.includes("already exists")) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    return NextResponse.json(
      { error: "Failed to generate invoices" },
      { status: 500 }
    );
  }
}
