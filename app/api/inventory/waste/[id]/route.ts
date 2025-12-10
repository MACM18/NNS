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
        item: {
          select: {
            id: true,
            name: true,
            currentStock: true,
          },
        },
        reportedBy: {
          select: {
            id: true,
            fullName: true,
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
        item: {
          select: {
            id: true,
            currentStock: true,
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
      if (wasteRecord.itemId && wasteRecord.item) {
        const currentStock = Number(wasteRecord.item.currentStock ?? 0);
        const quantityToRestore = Number(wasteRecord.quantity ?? 0);

        await tx.inventoryItem.update({
          where: { id: wasteRecord.itemId },
          data: {
            currentStock: currentStock + quantityToRestore,
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

    // Map potential snake_case to camelCase
    const updateData: any = {};
    if (body.itemId ?? body.item_id)
      updateData.itemId = body.itemId ?? body.item_id;
    if (body.quantity != null) updateData.quantity = Number(body.quantity);
    if (body.wasteReason ?? body.waste_reason)
      updateData.wasteReason = body.wasteReason ?? body.waste_reason;
    if (body.wasteDate ?? body.waste_date)
      updateData.wasteDate = new Date(body.wasteDate ?? body.waste_date);
    if (body.reportedById ?? body.reported_by)
      updateData.reportedById = body.reportedById ?? body.reported_by;

    const wasteRecord = await prisma.wasteTracking.update({
      where: { id },
      data: updateData,
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
