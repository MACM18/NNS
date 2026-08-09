import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

const ALLOWED_ROLES = ["admin", "moderator", "superadmin"];

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!ALLOWED_ROLES.includes(String(session.user.role || "user").toLowerCase())) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const itemId = searchParams.get("itemId");
    const importId = searchParams.get("importId");
    const events = await prisma.inventoryStockEvent.findMany({
      where: {
        ...(itemId ? { inventoryItemId: itemId } : {}),
        ...(importId ? { materialBalanceImportId: importId } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: Math.min(Math.max(Number(searchParams.get("limit") || 100), 1), 500),
      include: { inventoryItem: { select: { id: true, name: true, unit: true } } },
    });

    return NextResponse.json({
      data: events.map((event) => ({
        id: event.id,
        inventoryItemId: event.inventoryItemId,
        itemName: event.inventoryItem.name,
        unit: event.inventoryItem.unit,
        sourceType: event.sourceType,
        sourceReferenceId: event.sourceReferenceId,
        materialBalanceImportId: event.materialBalanceImportId,
        previousStock: Number(event.previousStock),
        newStock: Number(event.newStock),
        quantityDelta: Number(event.quantityDelta),
        reason: event.reason,
        createdAt: event.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error("[inventory-stock-events] GET failed", error);
    return NextResponse.json({ error: "Failed to load stock events" }, { status: 500 });
  }
}
