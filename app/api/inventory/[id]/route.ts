import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { recordInventoryStockEvent } from "@/lib/inventory-stock-event-service";

const INVENTORY_MANAGER_ROLES = ["admin", "moderator", "superadmin"];

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
    const includeInactive = new URL(req.url).searchParams.get("includeInactive") === "true";
    if (includeInactive) {
      const profile = await prisma.profile.findUnique({
        where: { userId: session.user.id },
        select: { role: true },
      });
      if (!INVENTORY_MANAGER_ROLES.includes((profile?.role || "").toLowerCase())) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const item = await prisma.inventoryItem.findUnique({
      where: { id },
    });

    if (!item || (!item.isActive && !includeInactive)) {
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
      is_active: item.isActive,
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
    if (body.current_stock !== undefined || body.currentStock !== undefined) {
      const currentStock = Number(body.current_stock ?? body.currentStock);
      if (!Number.isFinite(currentStock)) {
        return NextResponse.json({ error: "Current stock must be a finite number" }, { status: 400 });
      }
      updateData.currentStock = currentStock;
    }
    if (body.drum_size !== undefined || body.drumSize !== undefined)
      updateData.drumSize = body.drum_size ?? body.drumSize;
    if (body.reorder_level !== undefined || body.reorderLevel !== undefined) {
      const reorderLevel = Number(body.reorder_level ?? body.reorderLevel);
      if (!Number.isFinite(reorderLevel) || reorderLevel < 0) {
        return NextResponse.json({ error: "Reorder level must be a non-negative finite number" }, { status: 400 });
      }
      updateData.reorderLevel = reorderLevel;
    }
    if (body.is_active !== undefined || body.isActive !== undefined) {
      updateData.isActive = Boolean(body.is_active ?? body.isActive);
    }

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
      is_active: item.isActive,
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
    const profile = await prisma.profile.findUnique({
      where: { userId: session.user.id },
      select: { id: true, role: true },
    });
    if (!INVENTORY_MANAGER_ROLES.includes((profile?.role || "").toLowerCase())) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const result = await prisma.$transaction(async (tx) => {
      const item = await tx.inventoryItem.findUnique({
        where: { id },
        select: {
          id: true,
          name: true,
          currentStock: true,
          _count: {
            select: {
              inventoryInvoiceItems: true,
              drumTracking: true,
              monthlyWastage: true,
              wasteTracking: true,
              monthlyInventoryUsages: true,
              materialBalanceItems: true,
              materialBalanceMappings: true,
              inventoryStockEvents: true,
            },
          },
        },
      });
      if (!item) throw new Error("Item not found");

      const historyCounts = item._count;
      const hasHistory = Object.values(historyCounts).some((count) => count > 0);
      const hasNonZeroStock = Number(item.currentStock || 0) !== 0;

      if (hasHistory || hasNonZeroStock) {
        const archived = await tx.inventoryItem.update({
          where: { id },
          data: { isActive: false },
          select: { id: true, name: true, isActive: true },
        });
        return {
          action: "archived" as const,
          item: archived,
          reason: hasHistory ? "Item has historical records" : "Item has non-zero stock",
          historyCounts,
        };
      }

      await tx.inventoryItem.delete({ where: { id } });
      return { action: "deleted" as const, item: { id, name: item.name, isActive: false }, historyCounts };
    });

    return NextResponse.json({
      success: true,
      action: result.action,
      item: result.item,
      reason: "reason" in result ? result.reason : null,
      history_counts: result.historyCounts,
    });
  } catch (error) {
    console.error("Error deleting inventory item:", error);
    if (error instanceof Error && error.message === "Item not found") {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }
    return NextResponse.json(
      { error: "Failed to delete inventory item" },
      { status: 500 }
    );
  }
}
