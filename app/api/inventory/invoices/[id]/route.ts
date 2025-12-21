import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/inventory/invoices/[id] - Get single invoice with items
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const invoice = await prisma.inventoryInvoice.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            item: true,
          },
        },
      },
    });

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    const formattedItems = (invoice.items || []).map((it) => ({
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

    const formatted = {
      id: invoice.id,
      invoice_number: invoice.invoiceNumber,
      warehouse: invoice.warehouse,
      date: invoice.date ? invoice.date.toISOString().slice(0,10) : null,
      issued_by: invoice.issuedBy || "",
      drawn_by: invoice.drawnBy || "",
      total_items: Number(invoice.totalItems || 0),
      status: invoice.status,
      created_at: invoice.createdAt?.toISOString(),
      updated_at: invoice.updatedAt?.toISOString(),
      items: formattedItems,
    };

    return NextResponse.json({ data: formatted });
  } catch (error) {
    console.error("Error fetching invoice:", error);
    return NextResponse.json(
      { error: "Failed to fetch invoice" },
      { status: 500 }
    );
  }
}

// DELETE /api/inventory/invoices/[id] - Delete invoice and its items
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Delete in transaction to ensure consistency
    await prisma.$transaction(async (tx: any) => {
      // First delete related invoice items
      await tx.inventoryInvoiceItem.deleteMany({
        where: { invoiceId: id },
      });

      // Then delete the invoice
      await tx.inventoryInvoice.delete({
        where: { id },
      });
    });

    return NextResponse.json({
      success: true,
      message: "Invoice deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting invoice:", error);
    return NextResponse.json(
      { error: "Failed to delete invoice" },
      { status: 500 }
    );
  }
}

// PATCH /api/inventory/invoices/[id] - Update invoice
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    const invoice = await prisma.inventoryInvoice.update({
      where: { id },
      data: {
        ...body,
      },
    });

    return NextResponse.json({
      success: true,
      data: invoice,
    });
  } catch (error) {
    console.error("Error updating invoice:", error);
    return NextResponse.json(
      { error: "Failed to update invoice" },
      { status: 500 }
    );
  }
}
