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
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const type = searchParams.get("type"); // Single type: A, B, inventory
    const types = searchParams.get("types"); // Multiple types: A,B
    const month = searchParams.get("month");
    const year = searchParams.get("year");
    const search = searchParams.get("search");

    // Build where clause
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};

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

    return NextResponse.json({
      data: invoices,
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
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();

    const invoice = await prisma.generatedInvoice.create({
      data: body,
    });

    return NextResponse.json({ data: invoice });
  } catch (error) {
    console.error("Error creating invoice:", error);
    return NextResponse.json(
      { error: "Failed to create invoice" },
      { status: 500 }
    );
  }
}
