import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { serializeMaterialBalanceImport } from "@/lib/material-balance-service";

const ALLOWED_ROLES = ["admin", "moderator", "superadmin"];

function isAllowedRole(role: unknown): boolean {
  return ALLOWED_ROLES.includes(String(role || "user").toLowerCase());
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!isAllowedRole(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await context.params;
    if (!id) {
      return NextResponse.json({ error: "Connection ID is required" }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date");
    const sourceItem = searchParams.get("sourceItem")?.trim().toLowerCase();

    const latestImport = await prisma.materialBalanceImport.findFirst({
      where: { connectionId: id },
      orderBy: { importedAt: "desc" },
      include: {
        items: {
          orderBy: { sourceRow: "asc" },
          include: {
            inventoryItem: {
              select: {
                id: true,
                name: true,
                unit: true,
                currentStock: true,
                inventoryStockEvents: {
                  orderBy: { createdAt: "desc" },
                  take: 1,
                  select: { sourceType: true, createdAt: true },
                },
              },
            },
            dailyEntries: {
              orderBy: { balanceDate: "asc" },
            },
          },
        },
      },
    });

    if (!latestImport) {
      return NextResponse.json({ data: null });
    }

    const serialized = serializeMaterialBalanceImport(latestImport);
    if (date || sourceItem) {
      serialized.items = serialized.items
        .filter((item: any) =>
          sourceItem ? item.sourceItemName.toLowerCase().includes(sourceItem) : true
        )
        .map((item: any) => ({
          ...item,
          dailyEntries: date
            ? item.dailyEntries.filter((entry: any) => entry.date === date)
            : item.dailyEntries,
        }));
    }

    return NextResponse.json({ data: serialized });
  } catch (error: any) {
    console.error("[material-balance] GET failed", error);
    return NextResponse.json(
      { error: error?.message || "Failed to load Material Balance" },
      { status: 500 }
    );
  }
}
