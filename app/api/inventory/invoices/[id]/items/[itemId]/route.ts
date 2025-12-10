import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/inventory/invoices/[id]/items/[itemId] - Get single invoice item
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { itemId } = await params;

    const item = await prisma.inventoryInvoiceItem.findUnique({
      where: { id: itemId },
      include: {
        inventory_items: true,
      },
    });

    if (!item) {
      return NextResponse.json(
        { error: "Invoice item not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: item });
  } catch (error) {
    console.error("Error fetching invoice item:", error);
    return NextResponse.json(
      { error: "Failed to fetch invoice item" },
      { status: 500 }
    );
  }
}

// PATCH /api/inventory/invoices/[id]/items/[itemId] - Update invoice item
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { itemId } = await params;
    const body = await request.json();

    const item = await prisma.inventoryInvoiceItem.update({
      where: { id: itemId },
      data: {
        description: body.description,
        unit: body.unit,
        quantity_requested: body.quantity_requested,
        quantity_issued: body.quantity_issued,
        updated_at: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      data: item,
    });
  } catch (error) {
    console.error("Error updating invoice item:", error);
    return NextResponse.json(
      { error: "Failed to update invoice item" },
      { status: 500 }
    );
  }
}

// DELETE /api/inventory/invoices/[id]/items/[itemId] - Delete invoice item
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { itemId } = await params;

    await prisma.inventoryInvoiceItem.delete({
      where: { id: itemId },
    });

    return NextResponse.json({
      success: true,
      message: "Invoice item deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting invoice item:", error);
    return NextResponse.json(
      { error: "Failed to delete invoice item" },
      { status: 500 }
    );
  }
}
