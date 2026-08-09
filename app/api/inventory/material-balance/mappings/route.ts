import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { normalizeMaterialSourceName } from "@/lib/material-balance-service";

const READ_ROLES = ["admin", "moderator", "superadmin"];
const WRITE_ROLES = ["admin", "superadmin"];

async function getAuthorizedRole() {
  const session = await auth();
  if (!session?.user?.id) return { session: null, role: null };
  const role = String(session.user.role || "user").toLowerCase();
  return { session, role };
}

export async function GET() {
  try {
    const { session, role } = await getAuthorizedRole();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!role || !READ_ROLES.includes(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const mappings = await prisma.materialBalanceItemMapping.findMany({
      orderBy: { sourceName: "asc" },
      include: { inventoryItem: { select: { id: true, name: true, unit: true } } },
    });
    return NextResponse.json({ data: mappings });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Failed to load Material Balance mappings" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { session, role } = await getAuthorizedRole();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!role || !WRITE_ROLES.includes(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await request.json();
    const sourceName = String(body.sourceName || body.source_name || "").trim();
    const inventoryItemId = String(body.inventoryItemId || body.inventory_item_id || "").trim();
    if (!sourceName || !inventoryItemId) {
      return NextResponse.json({ error: "sourceName and inventoryItemId are required" }, { status: 400 });
    }

    const [profile, inventoryItem] = await Promise.all([
      prisma.profile.findUnique({ where: { userId: session.user.id }, select: { id: true } }),
      prisma.inventoryItem.findUnique({ where: { id: inventoryItemId }, select: { id: true } }),
    ]);
    if (!inventoryItem) return NextResponse.json({ error: "Inventory item not found" }, { status: 404 });

    const mapping = await prisma.materialBalanceItemMapping.upsert({
      where: { normalizedSourceName: normalizeMaterialSourceName(sourceName) },
      create: {
        sourceName,
        normalizedSourceName: normalizeMaterialSourceName(sourceName),
        inventoryItemId,
        createdById: profile?.id || null,
      },
      update: { sourceName, inventoryItemId, createdById: profile?.id || null },
      include: { inventoryItem: { select: { id: true, name: true, unit: true } } },
    });
    return NextResponse.json({ data: mapping }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Failed to save Material Balance mapping" }, { status: 500 });
  }
}
