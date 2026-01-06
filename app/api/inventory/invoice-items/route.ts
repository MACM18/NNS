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
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    // Optional filtering by dates
    const where: any = {};
    if (startDate && endDate) {
      where.invoice = {
        date: {
          gte: new Date(startDate),
          lte: new Date(endDate + "T23:59:59.999Z"),
        },
      };
    }

    const items = await prisma.inventoryInvoiceItem.findMany({
      where,
      include: {
        invoice: true,
        item: true,
      },
      orderBy: { createdAt: "asc" },
    });

    const formatted = items.map((it) => ({
      id: it.id,
      invoice_id: it.invoiceId,
      item_id: it.itemId,
      description: it.description,
      unit: it.unit,
      quantity_requested: Number(it.quantityRequested ?? 0),
      quantity_issued: Number(it.quantityIssued ?? 0),
      created_at: it.createdAt?.toISOString(),
      inventory_invoices: it.invoice
        ? { date: it.invoice.date?.toISOString().split("T")[0] }
        : null,
      item_name: it.item?.name || "",
    }));

    return NextResponse.json({ data: formatted });
  } catch (error) {
    console.error("Error fetching invoice items:", error);
    return NextResponse.json(
      { error: "Failed to fetch invoice items" },
      { status: 500 }
    );
  }
}
