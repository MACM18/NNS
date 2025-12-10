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
