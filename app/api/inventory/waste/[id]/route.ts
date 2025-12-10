import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/inventory/waste/[id] - Get single waste record
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

    const wasteRecord = await prisma.wasteTracking.findUnique({
      where: { id },
      include: {
        inventory_items: {
          select: {
            id: true,
            item_name: true,
            current_stock: true,
          },
        },
        profiles: {
          select: {
            id: true,
            full_name: true,
          },
        },
      },
    });

    if (!wasteRecord) {
      return NextResponse.json(
        { error: "Waste record not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: wasteRecord });
  } catch (error) {
    console.error("Error fetching waste record:", error);
    return NextResponse.json(
      { error: "Failed to fetch waste record" },
      { status: 500 }
    );
  }
}

// DELETE /api/inventory/waste/[id] - Delete waste record and restore stock
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

    // Get the waste record first to know how much to restore
    const wasteRecord = await prisma.wasteTracking.findUnique({
      where: { id },
      include: {
        inventory_items: {
          select: {
            id: true,
            current_stock: true,
          },
        },
      },
    });

    if (!wasteRecord) {
      return NextResponse.json(
        { error: "Waste record not found" },
        { status: 404 }
      );
    }

    // Delete waste record and restore stock in a transaction
    await prisma.$transaction(async (tx: any) => {
      // Delete the waste record
      await tx.wasteTracking.delete({
        where: { id },
      });

      // Restore stock to inventory item
      if (wasteRecord.item_id && wasteRecord.inventory_items) {
        const currentStock = wasteRecord.inventory_items.current_stock ?? 0;
        const quantityToRestore = wasteRecord.quantity ?? 0;

        await tx.inventoryItem.update({
          where: { id: wasteRecord.item_id },
          data: {
            current_stock: currentStock + quantityToRestore,
          },
        });
      }
    });

    return NextResponse.json({
      success: true,
      message: "Waste record deleted and stock restored",
    });
  } catch (error) {
    console.error("Error deleting waste record:", error);
    return NextResponse.json(
      { error: "Failed to delete waste record" },
      { status: 500 }
    );
  }
}

// PATCH /api/inventory/waste/[id] - Update waste record
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

    const wasteRecord = await prisma.wasteTracking.update({
      where: { id },
      data: {
        ...body,
        updated_at: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      data: wasteRecord,
    });
  } catch (error) {
    console.error("Error updating waste record:", error);
    return NextResponse.json(
      { error: "Failed to update waste record" },
      { status: 500 }
    );
  }
}
