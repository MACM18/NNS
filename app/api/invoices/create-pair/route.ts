import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createReviewedInvoicePair } from "@/lib/invoice-service";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const profile = await prisma.profile.findUnique({
      where: { userId: session.user.id },
      select: { id: true, role: true },
    });
    if (!["admin", "moderator", "superadmin"].includes((profile?.role || "").toLowerCase())) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const invoices = await createReviewedInvoicePair({
      month: Number(body.month),
      year: Number(body.year),
      lines: body.lines,
      optionalItems: body.optionalItems,
      pricingSnapshot: body.pricingSnapshot,
      createdById: profile!.id,
    });
    return NextResponse.json({ data: invoices.map(invoice => ({
      id: invoice.id,
      invoice_number: invoice.invoiceNumber,
      invoice_type: invoice.invoiceType,
      month: invoice.month,
      year: invoice.year,
      job_month: invoice.jobMonth,
      invoice_date: invoice.invoiceDate?.toISOString().slice(0, 10) || null,
      total_amount: Number(invoice.totalAmount),
      line_count: invoice.lineCount,
      line_details_ids: invoice.lineDetailsIds,
      line_details_snapshot: invoice.lineDetailsSnapshot,
      optional_items_snapshot: invoice.optionalItemsSnapshot,
      pricing_snapshot: invoice.pricingSnapshot,
      status: invoice.status,
      created_at: invoice.createdAt.toISOString(),
    })) });
  } catch (error) {
    console.error("Unable to create reviewed invoice pair:", error);
    const message = error instanceof Error ? error.message : "Unable to create invoices.";
    const status = /already exists|cannot be regenerated/i.test(message) ? 409 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
