import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const items = await prisma.inventoryInvoiceItem.findMany({
      where: { invoiceId: id },
      include: { item: true },
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
