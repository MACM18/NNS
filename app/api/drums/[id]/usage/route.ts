import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/drums/[id]/usage - Get drum usage records with line details
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

    // Get drum info
    const drum = await prisma.drumTracking.findUnique({
      where: { id },
      select: {
        id: true,
        initialQuantity: true,
        currentQuantity: true,
        drumNumber: true,
        status: true,
        receivedDate: true,
      },
    });

    if (!drum) {
      return NextResponse.json({ error: "Drum not found" }, { status: 404 });
    }

    // Get usage records
    const usageRecords = await prisma.drumUsage.findMany({
      where: { drumId: id },
      orderBy: { usageDate: "asc" },
      include: {
        lineDetails: {
          select: {
            telephoneNo: true,
            name: true,
            dp: true,
          },
        },
      },
    });

    // Transform to snake_case
    const formattedDrum = {
      id: drum.id,
      initial_quantity: Number(drum.initialQuantity),
      current_quantity: Number(drum.currentQuantity),
      drum_number: drum.drumNumber,
      status: drum.status,
      manual_wastage_override: null,
    };

    const formattedUsage = usageRecords.map((u) => ({
      id: u.id,
      quantity_used: Number(u.quantityUsed),
      usage_date: u.usageDate ? u.usageDate.toISOString() : null,
      cable_start_point: Number(u.cableStartPoint ?? 0),
      cable_end_point: Number(u.cableEndPoint ?? 0),
      wastage_calculated: Number(u.wastageCalculated ?? 0),
      line_details: {
        telephone_no: u.lineDetails?.telephoneNo ?? "",
        name: u.lineDetails?.name ?? "",
        dp: u.lineDetails?.dp ?? "",
      },
    }));

    return NextResponse.json({
      data: {
        drum: formattedDrum,
        usageRecords: formattedUsage,
      },
    });
  } catch (error) {
    console.error("Error fetching drum usage:", error);
    return NextResponse.json(
      { error: "Failed to fetch drum usage" },
      { status: 500 }
    );
  }
}

// PATCH /api/drums/[id]/usage - Update drum wastage settings
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
    // Wastage override settings are not supported in current schema
    return NextResponse.json(
      { error: "Wastage override settings are not supported" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Error updating drum wastage settings:", error);
    return NextResponse.json(
      { error: "Failed to update drum wastage settings" },
      { status: 500 }
    );
  }
}
