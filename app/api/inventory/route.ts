import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const INVENTORY_MANAGER_ROLES = ["admin", "moderator", "superadmin"];

async function getInventoryProfile() {
  const session = await auth();
  if (!session?.user) return null;
  return prisma.profile.findUnique({
    where: { userId: session.user.id },
    select: { id: true, role: true },
  });
}

function canManageInventory(role: string | null | undefined) {
  return INVENTORY_MANAGER_ROLES.includes((role || "").toLowerCase());
}

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
    const includeInactive = searchParams.get("includeInactive") === "true";

    if (includeInactive) {
      const profile = await getInventoryProfile();
      if (!canManageInventory(profile?.role)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    // Build where clause
    const where: Record<string, unknown> = includeInactive ? {} : { isActive: true };

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
      const includeRelations = searchParams.get("includeRelations") === "true";

      const items = await prisma.inventoryItem.findMany({
        where,
        orderBy: { name: "asc" },
        include: includeRelations
          ? {
              inventoryInvoiceItems: { include: { invoice: true } },
              wasteTracking: true,
            }
          : undefined,
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
        is_active: it.isActive,
        created_at: it.createdAt?.toISOString(),
        updated_at: it.updatedAt?.toISOString(),
        inventory_invoice_items: includeRelations
          ? (((it as any).inventoryInvoiceItems || []) as any[]).map(
              (ii: any) => ({
                id: ii.id,
                invoice_id: ii.invoiceId,
                item_id: ii.itemId,
                quantity_issued: Number(ii.quantityIssued ?? 0),
                quantity_requested: Number(ii.quantityRequested ?? 0),
                created_at: ii.createdAt?.toISOString(),
                inventory_invoices: ii.invoice
                  ? { date: ii.invoice.date?.toISOString().split("T")[0] }
                  : null,
              })
            )
          : undefined,
        waste_tracking: includeRelations
          ? (((it as any).wasteTracking || []) as any[]).map((w: any) => ({
              id: w.id,
              quantity: Number(w.quantity),
              waste_date: w.wasteDate
                ? w.wasteDate.toISOString().split("T")[0]
                : null,
            }))
          : undefined,
      }));

      return NextResponse.json({ data: formatted });
    }

    const includeRelations = searchParams.get("includeRelations") === "true";

    const [items, total] = await Promise.all([
      prisma.inventoryItem.findMany({
        where,
        orderBy: { name: "asc" },
        skip: (page - 1) * limit,
        take: limit,
        include: includeRelations
          ? {
              inventoryInvoiceItems: { include: { invoice: true } },
              wasteTracking: true,
            }
          : undefined,
      }),
      prisma.inventoryItem.count({ where }),
    ]);

    const formatted = items.map((it: any) => ({
      id: it.id,
      name: it.name,
      unit: it.unit,
      current_stock: Number(it.currentStock ?? 0),
      drum_size:
        it.drumSize !== null && it.drumSize !== undefined
          ? Number(it.drumSize)
          : null,
      reorder_level: Number(it.reorderLevel ?? 0),
      is_active: it.isActive,
      created_at: it.createdAt?.toISOString(),
      updated_at: it.updatedAt?.toISOString(),
      inventory_invoice_items: includeRelations
        ? (((it as any).inventoryInvoiceItems || []) as any[]).map(
            (ii: any) => ({
              id: ii.id,
              invoice_id: ii.invoiceId,
              item_id: ii.itemId,
              quantity_issued: Number(ii.quantityIssued ?? 0),
              quantity_requested: Number(ii.quantityRequested ?? 0),
              created_at: ii.createdAt?.toISOString(),
              inventory_invoices: ii.invoice
                ? { date: ii.invoice.date?.toISOString().split("T")[0] }
                : null,
            })
          )
        : undefined,
      waste_tracking: includeRelations
        ? (((it as any).wasteTracking || []) as any[]).map((w: any) => ({
            id: w.id,
            quantity: Number(w.quantity),
            waste_date: w.wasteDate
              ? w.wasteDate.toISOString().split("T")[0]
              : null,
          }))
        : undefined,
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
    const profile = await getInventoryProfile();
    if (!profile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!canManageInventory(profile.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();

    // Whitelist supported fields (snake_case accepted)
    const name = String(body.name ?? "").trim();
    const unit = String(body.unit ?? "pcs").trim() || "pcs";
    const current_stock = Number(body.current_stock ?? body.currentStock ?? 0);
    const drum_size = body.drum_size ?? body.drumSize ?? undefined;
    const reorder_level = Number(body.reorder_level ?? body.reorderLevel ?? 0);

    if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });
    if (!Number.isFinite(current_stock)) return NextResponse.json({ error: "Current stock must be a finite number" }, { status: 400 });
    if (!Number.isFinite(reorder_level) || reorder_level < 0) {
      return NextResponse.json({ error: "Reorder level must be a non-negative finite number" }, { status: 400 });
    }

    const item = await prisma.inventoryItem.create({
      data: {
        name,
        unit,
        currentStock: current_stock,
        drumSize: drum_size !== undefined ? Number(drum_size) : undefined,
        reorderLevel: reorder_level,
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
      is_active: item.isActive,
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
