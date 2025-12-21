import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const category = searchParams.get("category");
    const search = searchParams.get("search");
    const all = searchParams.get("all");

    // Build where clause
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};

    if (category) {
      where.category = category;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
        { serial_no: { contains: search, mode: "insensitive" } },
      ];
    }

    // If "all" param is present, return all items without pagination
    if (all === "true") {
      const items = await prisma.inventoryItem.findMany({
        where,
        orderBy: { name: "asc" },
      });

      const formatted = items.map((it) => ({
        id: it.id,
        name: it.name,
        unit: it.unit,
        current_stock: Number(it.currentStock ?? 0),
        drum_size:
          it.drumSize !== null && it.drumSize !== undefined
            ? Number(it.drumSize)
            : null,
        reorder_level: Number(it.reorderLevel ?? 0),
        created_at: it.createdAt?.toISOString(),
        updated_at: it.updatedAt?.toISOString(),
      }));

      return NextResponse.json({ data: formatted });
    }

    const [items, total] = await Promise.all([
      prisma.inventoryItem.findMany({
        where,
        orderBy: { name: "asc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.inventoryItem.count({ where }),
    ]);

    const formatted = items.map((it) => ({
      id: it.id,
      name: it.name,
      unit: it.unit,
      current_stock: Number(it.currentStock ?? 0),
      drum_size:
        it.drumSize !== null && it.drumSize !== undefined
          ? Number(it.drumSize)
          : null,
      reorder_level: Number(it.reorderLevel ?? 0),
      created_at: it.createdAt?.toISOString(),
      updated_at: it.updatedAt?.toISOString(),
    }));

    return NextResponse.json({
      data: formatted,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching inventory:", error);
    return NextResponse.json(
      { error: "Failed to fetch inventory" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();

    // Whitelist supported fields (snake_case accepted)
    const name = body.name;
    const unit = body.unit;
    const current_stock = body.current_stock ?? body.currentStock ?? 0;
    const drum_size = body.drum_size ?? body.drumSize ?? undefined;
    const reorder_level = body.reorder_level ?? body.reorderLevel ?? 0;

    const item = await prisma.inventoryItem.create({
      data: {
        name,
        unit,
        currentStock: Number(current_stock || 0),
        drumSize: drum_size !== undefined ? Number(drum_size) : undefined,
        reorderLevel: Number(reorder_level || 0),
      },
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
    console.error("Error creating inventory item:", error);
    return NextResponse.json(
      { error: "Failed to create inventory item" },
      { status: 500 }
    );
  }
}
