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
        initial_quantity: true,
        current_quantity: true,
        manual_wastage_override: true,
        wastage_calculation_method: true,
        drum_number: true,
        status: true,
      },
    });

    if (!drum) {
      return NextResponse.json({ error: "Drum not found" }, { status: 404 });
    }

    // Get usage records
    const usageRecords = await prisma.drumUsage.findMany({
      where: { drum_id: id },
      orderBy: { usage_date: "asc" },
      include: {
        line_details: {
          select: {
            telephone_no: true,
            name: true,
            dp: true,
          },
        },
      },
    });

    return NextResponse.json({
      data: {
        drum,
        usageRecords,
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
    const body = await request.json();
    const { wastage_calculation_method, manual_wastage_override } = body;

    const updateData: Record<string, unknown> = {
      wastage_calculation_method,
      updated_at: new Date(),
    };

    if (wastage_calculation_method === "manual_override") {
      updateData.manual_wastage_override = manual_wastage_override;
    } else {
      updateData.manual_wastage_override = null;
    }

    const drum = await prisma.drumTracking.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      data: drum,
    });
  } catch (error) {
    console.error("Error updating drum wastage settings:", error);
    return NextResponse.json(
      { error: "Failed to update drum wastage settings" },
      { status: 500 }
    );
  }
}
