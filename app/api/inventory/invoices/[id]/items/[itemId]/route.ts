import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { recordInventoryStockEvent } from "@/lib/inventory-stock-event-service";

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
        item: true,
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
    const profile = await prisma.profile.findUnique({
      where: { userId: session.user.id },
      select: { id: true, role: true },
    });
    if (!["admin", "moderator", "superadmin"].includes((profile?.role || "").toLowerCase())) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id, itemId } = await params;
    const body = await request.json();
    const existing = await prisma.inventoryInvoiceItem.findUnique({ where: { id: itemId } });
    if (!existing || existing.invoiceId !== id) {
      return NextResponse.json({ error: "Invoice item not found" }, { status: 404 });
    }
    const parentInvoice = await prisma.inventoryInvoice.findUnique({
      where: { id },
      select: { isSystemGenerated: true },
    });
    if (parentInvoice?.isSystemGenerated) {
      return NextResponse.json(
        { error: "Items on system-generated Material Balance invoices cannot be edited" },
        { status: 409 },
      );
    }
    const newQuantity = Number(body.quantity_issued ?? body.quantityIssued ?? 0);
    const oldQuantity = Number(existing.quantityIssued ?? 0);

    const item = await prisma.$transaction(async (tx) => {
      if (existing.itemId && newQuantity !== oldQuantity) {
        const inventoryItem = await tx.inventoryItem.findUnique({ where: { id: existing.itemId } });
        const previousStock = Number(inventoryItem?.currentStock || 0);
        const newStock = previousStock + newQuantity - oldQuantity;
        await tx.inventoryItem.update({
          where: { id: existing.itemId },
          data: { currentStock: newStock },
        });
        await recordInventoryStockEvent(tx, {
          inventoryItemId: existing.itemId,
          previousStock,
          newStock,
          sourceType: "inventory_receipt",
          sourceReferenceId: itemId,
          createdById: profile?.id || null,
          reason: "Inventory receipt line updated",
        });
      }
      return tx.inventoryInvoiceItem.update({
        where: { id: itemId },
        data: {
          description: body.description,
          unit: body.unit,
          quantityRequested: body.quantity_requested ?? body.quantityRequested,
          quantityIssued: newQuantity,
        },
      });
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
    const profile = await prisma.profile.findUnique({
      where: { userId: session.user.id },
      select: { id: true, role: true },
    });
    if (!["admin", "moderator", "superadmin"].includes((profile?.role || "").toLowerCase())) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id, itemId } = await params;

    const existing = await prisma.inventoryInvoiceItem.findUnique({ where: { id: itemId } });
    if (!existing || existing.invoiceId !== id) {
      return NextResponse.json({ error: "Invoice item not found" }, { status: 404 });
    }
    const parentInvoice = await prisma.inventoryInvoice.findUnique({
      where: { id },
      select: { isSystemGenerated: true },
    });
    if (parentInvoice?.isSystemGenerated) {
      return NextResponse.json(
        { error: "Items on system-generated Material Balance invoices cannot be deleted" },
        { status: 409 },
      );
    }
    await prisma.$transaction(async (tx) => {
      if (existing.itemId) {
        const inventoryItem = await tx.inventoryItem.findUnique({ where: { id: existing.itemId } });
        const previousStock = Number(inventoryItem?.currentStock || 0);
        const newStock = previousStock - Number(existing.quantityIssued || 0);
        await tx.inventoryItem.update({
          where: { id: existing.itemId },
          data: { currentStock: newStock },
        });
        await recordInventoryStockEvent(tx, {
          inventoryItemId: existing.itemId,
          previousStock,
          newStock,
          sourceType: "inventory_receipt",
          sourceReferenceId: itemId,
          createdById: profile?.id || null,
          reason: "Inventory receipt line deleted",
        });
      }
      await tx.inventoryInvoiceItem.delete({ where: { id: itemId } });
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
