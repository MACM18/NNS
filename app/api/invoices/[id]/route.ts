import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { updateReviewedInvoicePair } from "@/lib/invoice-service";

async function requireManager() {
  const session = await auth();
  if (!session?.user?.id) return { response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  const profile = await prisma.profile.findUnique({ where: { userId: session.user.id }, select: { role: true } });
  if (!["admin", "moderator", "superadmin"].includes((profile?.role || "").toLowerCase())) return { response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  return {};
}

function present(invoice: NonNullable<Awaited<ReturnType<typeof prisma.generatedInvoice.findUnique>>>) {
  return {
    id: invoice.id,
    invoice_number: invoice.invoiceNumber,
    invoice_type: invoice.invoiceType,
    month: invoice.month,
    year: invoice.year,
    job_month: invoice.jobMonth,
    invoice_date: invoice.invoiceDate?.toISOString().slice(0, 10) || null,
    total_amount: Number(invoice.totalAmount || 0),
    line_count: Number(invoice.lineCount || 0),
    line_details_ids: invoice.lineDetailsIds,
    line_details_snapshot: invoice.lineDetailsSnapshot,
    optional_items_snapshot: invoice.optionalItemsSnapshot,
    pricing_snapshot: invoice.pricingSnapshot,
    invoice_content_snapshot: invoice.invoiceContentSnapshot,
    status: invoice.status,
    created_at: invoice.createdAt.toISOString(),
  };
}

export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const access = await requireManager();
    if (access.response) return access.response;
    const { id } = await context.params;
    const invoice = await prisma.generatedInvoice.findUnique({ where: { id } });
    if (!invoice || !invoice.month || !invoice.year || !["A", "B"].includes(String(invoice.invoiceType))) return NextResponse.json({ error: "Invoice not found." }, { status: 404 });
    const invoices = await prisma.generatedInvoice.findMany({ where: { month: invoice.month, year: invoice.year, invoiceType: { in: ["A", "B"] } }, orderBy: { invoiceType: "asc" } });
    return NextResponse.json({ data: invoices.map(present) });
  } catch (error) {
    console.error("Could not load invoice for editing:", error);
    return NextResponse.json({ error: "Could not load this invoice." }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const access = await requireManager();
    if (access.response) return access.response;
    const { id } = await context.params;
    const body = await request.json();
    const invoices = await updateReviewedInvoicePair({
      invoiceId: id,
      lines: body.lines,
      optionalItems: body.optionalItems,
      invoiceContentSnapshot: body.invoiceContentSnapshot,
      pricingSnapshot: body.pricingSnapshot,
    });
    return NextResponse.json({ data: invoices.map(present) });
  } catch (error) {
    console.error("Could not update invoice:", error);
    const message = error instanceof Error ? error.message : "Could not update invoice.";
    return NextResponse.json({ error: message }, { status: /not found|cannot be edited/i.test(message) ? 404 : 400 });
  }
}
