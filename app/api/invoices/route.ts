import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  createAndIssueGeneratedInvoice,
} from "@/lib/partnership-accounting-service";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const type = searchParams.get("type"); // Single type: A, B, inventory
    const types = searchParams.get("types"); // Multiple types: A,B
    const month = searchParams.get("month");
    const year = searchParams.get("year");
    const search = searchParams.get("search");

    // Build where clause
    const where: Record<string, unknown> = {};

    if (types) {
      // Multiple types (comma-separated)
      where.invoiceType = { in: types.split(",") };
    } else if (type) {
      where.invoiceType = type;
    }

    if (month && year) {
      where.month = parseInt(month);
      where.year = parseInt(year);
    }

    if (search) {
      where.OR = [{ invoiceNumber: { contains: search, mode: "insensitive" } }];
    }

    const [invoices, total] = await Promise.all([
      prisma.generatedInvoice.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.generatedInvoice.count({ where }),
    ]);

    const formatted = invoices.map((inv) => ({
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

    return NextResponse.json({
      data: formatted,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching invoices:", error);
    return NextResponse.json(
      { error: "Failed to fetch invoices" },
      { status: 500 }
    );
  }
}

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

    // Accept snake_case or camelCase inputs
    const invoiceNumber = body.invoice_number ?? body.invoiceNumber;
    const invoiceType = body.invoice_type ?? body.invoiceType;
    const month = body.month !== undefined ? Number(body.month) : undefined;
    const year = body.year !== undefined ? Number(body.year) : undefined;
    const jobMonth = body.job_month ?? body.jobMonth;
    const invoiceDate = body.invoice_date ?? body.invoiceDate;
    const totalAmount = Number(body.total_amount ?? body.totalAmount ?? 0);
    const lineCount = Number(body.line_count ?? body.lineCount ?? 0);
    const lineDetailsIds = body.line_details_ids ?? body.lineDetailsIds ?? null;
    const status = body.status ?? "generated";

    if (!invoiceNumber || !Number.isFinite(totalAmount) || totalAmount <= 0) {
      return NextResponse.json(
        { error: "Invoice number and a positive total amount are required" },
        { status: 400 },
      );
    }

    const invoice = await createAndIssueGeneratedInvoice({
      invoiceNumber,
      invoiceType,
      month,
      year,
      jobMonth,
      invoiceDate: invoiceDate ? new Date(invoiceDate) : new Date(),
      totalAmount,
      lineCount,
      lineDetailsIds: lineDetailsIds ?? undefined,
      status,
      createdById: profile!.id,
    });

    const formatted = {
      id: invoice.id,
      invoice_number: invoice.invoiceNumber,
      invoice_type: invoice.invoiceType,
      month: invoice.month ?? null,
      year: invoice.year ?? null,
      job_month: invoice.jobMonth || null,
      invoice_date: invoice.invoiceDate
        ? invoice.invoiceDate.toISOString().slice(0, 10)
        : null,
      total_amount: invoice.totalAmount ? Number(invoice.totalAmount) : 0,
      line_count: invoice.lineCount ? Number(invoice.lineCount) : 0,
      line_details_ids: invoice.lineDetailsIds || null,
      status: invoice.status || null,
      paid_amount: Number(invoice.paidAmount || 0),
      payment_status: invoice.paymentStatus,
      due_date: invoice.dueDate?.toISOString().slice(0, 10) || null,
      accounting_status: invoice.accountingStatus,
      created_at: invoice.createdAt?.toISOString(),
    };

    return NextResponse.json({ data: formatted });
  } catch (error) {
    console.error("Error creating invoice:", error);
    return NextResponse.json(
      { error: "Failed to create invoice" },
      { status: 500 }
    );
  }
}
