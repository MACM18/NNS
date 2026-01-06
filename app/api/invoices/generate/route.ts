import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
      // Delete existing invoice if present
      await prisma.generatedInvoice.deleteMany({
        where: {
          invoiceNumber: invoice.invoice_number,
          month: parseInt(month),
          year: parseInt(year),
        },
      });

      // Create new invoice
      const createdInvoice = await prisma.generatedInvoice.create({
        data: {
          invoiceNumber: invoice.invoice_number,
          invoiceType: invoice.invoice_type,
          month: parseInt(month),
          year: parseInt(year),
          jobMonth: invoice.job_month,
          invoiceDate: new Date(invoice.invoice_date),
          totalAmount: invoice.total_amount,
          lineCount: invoice.line_count,
          lineDetailsIds: invoice.line_details_ids,
          status: invoice.status || "generated",
        },
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
