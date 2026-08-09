import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { recordInventoryStockEvent } from "@/lib/inventory-stock-event-service";

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

    const item = await prisma.inventoryItem.findUnique({
      where: { id },
    });

    if (!item) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    const formatted = {
      id: item.id,
      name: item.name,
      unit: item.unit,
      current_stock: Number(item.currentStock ?? 0),
      drum_size:
        item.drumSize !== null && item.drumSize !== undefined
          ? Number(item.drumSize)
          : null,
      reorder_level: Number(item.reorderLevel ?? 0),
      created_at: item.createdAt?.toISOString(),
      updated_at: item.updatedAt?.toISOString(),
    };

    return NextResponse.json({ data: formatted });
  } catch (error) {
    console.error("Error fetching inventory item:", error);
    return NextResponse.json(
      { error: "Failed to fetch inventory item" },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const profile = await prisma.profile.findUnique({
      where: { userId: session.user.id },
      select: { id: true, role: true },
    });
    if (!["admin", "moderator", "superadmin"].includes((profile?.role || "").toLowerCase())) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Accept snake_case or camelCase
    const updateData: Record<string, unknown> = {};
    if (body.name !== undefined) updateData.name = body.name;
    if (body.unit !== undefined) updateData.unit = body.unit;
    if (body.current_stock !== undefined || body.currentStock !== undefined)
      updateData.currentStock = Number(
        body.current_stock ?? body.currentStock ?? 0
      );
    if (body.drum_size !== undefined || body.drumSize !== undefined)
      updateData.drumSize = body.drum_size ?? body.drumSize;
    if (body.reorder_level !== undefined || body.reorderLevel !== undefined)
      updateData.reorderLevel = Number(
        body.reorder_level ?? body.reorderLevel ?? 0
      );

    const item = await prisma.$transaction(async (tx) => {
      const existing = await tx.inventoryItem.findUnique({ where: { id } });
      if (!existing) throw new Error("Item not found");
      const updated = await tx.inventoryItem.update({ where: { id }, data: updateData });
      if (updateData.currentStock !== undefined) {
        await recordInventoryStockEvent(tx, {
          inventoryItemId: id,
          previousStock: Number(existing.currentStock || 0),
          newStock: Number(updated.currentStock || 0),
          sourceType: "manual",
          sourceReferenceId: id,
          createdById: profile?.id || null,
          reason: "Inventory item stock edited manually",
        });
      }
      return updated;
    });

    const formatted = {
      id: item.id,
      name: item.name,
      unit: item.unit,
      current_stock: Number(item.currentStock ?? 0),
      drum_size:
        item.drumSize !== null && item.drumSize !== undefined
          ? Number(item.drumSize)
          : null,
      reorder_level: Number(item.reorderLevel ?? 0),
      created_at: item.createdAt?.toISOString(),
      updated_at: item.updatedAt?.toISOString(),
    };

    return NextResponse.json({ data: formatted });
  } catch (error) {
    console.error("Error updating inventory item:", error);
    return NextResponse.json(
      { error: "Failed to update inventory item" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    await prisma.inventoryItem.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting inventory item:", error);
    return NextResponse.json(
      { error: "Failed to delete inventory item" },
      { status: 500 }
    );
  }
}
