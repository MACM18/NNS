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
    const status = searchParams.get("status");
    const search = searchParams.get("search");
    const all = searchParams.get("all");
    const includeUsage = searchParams.get("includeUsage") === "true";

    // Build where clause
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};

    if (status) {
      where.status = status;
    }

    if (search) {
      where.OR = [{ drumNumber: { contains: search, mode: "insensitive" } }];
    }

    // If "all" param is present, return all drums without pagination
    if (all === "true") {
      const drums = await prisma.drumTracking.findMany({
        where,
        orderBy: { createdAt: "desc" },
        include: {
          item: {
            select: { name: true },
          },
        },
      });

      // Include usage data if requested
      let usageData: any[] = [];
      if (includeUsage) {
        const rawUsage = await prisma.drumUsage.findMany({
          orderBy: { usageDate: "desc" },
          include: {
            lineDetails: {
              select: { telephoneNo: true, name: true },
            },
          },
        });

        usageData = rawUsage.map((u) => ({
          id: u.id,
          quantity_used: Number(u.quantityUsed),
          usage_date: u.usageDate ? u.usageDate.toISOString() : null,
          cable_start_point: Number(u.cableStartPoint ?? 0),
          cable_end_point: Number(u.cableEndPoint ?? 0),
          wastage_calculated: Number(u.wastageCalculated ?? 0),
          line_details: {
            telephone_no: u.lineDetails?.telephoneNo ?? "",
            name: u.lineDetails?.name ?? "",
          },
        }));
      }

      // Transform drums with item name and snake_case fields
      type DrumWithRelations = (typeof drums)[number];
      const transformedDrums = drums.map((drum: DrumWithRelations) => ({
        id: drum.id,
        drum_number: drum.drumNumber,
        item_id: drum.itemId ?? null,
        item_name: drum.item?.name || "",
        initial_quantity: Number(drum.initialQuantity),
        current_quantity: Number(drum.currentQuantity),
        status: drum.status,
        received_date: drum.receivedDate
          ? drum.receivedDate.toISOString()
          : null,
        created_at: drum.createdAt?.toISOString(),
        updated_at: drum.updatedAt?.toISOString(),
      }));

      return NextResponse.json({
        data: transformedDrums,
        usageData: includeUsage ? usageData : undefined,
      });
    }

    const [drums, total] = await Promise.all([
      prisma.drumTracking.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          item: {
            select: { name: true },
          },
        },
      }),
      prisma.drumTracking.count({ where }),
    ]);

    // Transform drums with item name and snake_case fields
    type DrumWithRelations = (typeof drums)[number];
    const transformedDrums = drums.map((drum: DrumWithRelations) => ({
      id: drum.id,
      drum_number: drum.drumNumber,
      item_id: drum.itemId ?? null,
      item_name: drum.item?.name || "",
      initial_quantity: Number(drum.initialQuantity),
      current_quantity: Number(drum.currentQuantity),
      status: drum.status,
      received_date: drum.receivedDate ? drum.receivedDate.toISOString() : null,
      created_at: drum.createdAt?.toISOString(),
      updated_at: drum.updatedAt?.toISOString(),
    }));

    return NextResponse.json({
      data: transformedDrums,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching drums:", error);
    return NextResponse.json(
      { error: "Failed to fetch drums" },
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

    // Accept snake_case or camelCase inputs
    const drumNumber = body.drum_number ?? body.drumNumber;
    const itemId = body.item_id ?? body.itemId ?? null;
    const initialQuantity = Number(
      body.initial_quantity ?? body.initialQuantity ?? 0
    );
    const currentQuantity = Number(
      body.current_quantity ?? body.currentQuantity ?? initialQuantity
    );
    const receivedDate = body.received_date ?? body.receivedDate ?? undefined;
    const status = body.status ?? "active";

    const drum = await prisma.drumTracking.create({
      data: {
        drumNumber,
        itemId,
        initialQuantity: initialQuantity,
        currentQuantity: currentQuantity,
        receivedDate: receivedDate ? new Date(receivedDate) : undefined,
        status,
      },
    });

    const formatted = {
      id: drum.id,
      drum_number: drum.drumNumber,
      item_id: drum.itemId ?? null,
      initial_quantity: Number(drum.initialQuantity),
      current_quantity: Number(drum.currentQuantity),
      status: drum.status,
      received_date: drum.receivedDate ? drum.receivedDate.toISOString() : null,
      created_at: drum.createdAt?.toISOString(),
      updated_at: drum.updatedAt?.toISOString(),
    };

    return NextResponse.json({ data: formatted });
  } catch (error) {
    console.error("Error creating drum:", error);
    return NextResponse.json(
      { error: "Failed to create drum" },
      { status: 500 }
    );
  }
}
