import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/lines/[id]/usage - fetch the current drum usage for a line (if any)
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const usage = await prisma.drumUsage.findFirst({
      where: { line_details_id: id },
      include: {
        drum_tracking: {
          select: { id: true, drum_number: true, current_quantity: true },
        },
      },
      orderBy: { usage_date: "desc" },
    });

    if (!usage) return NextResponse.json({ data: null });

    return NextResponse.json({
      data: {
        id: usage.id,
        drum_id: usage.drum_id,
        line_id: usage.line_details_id,
        quantity_used: usage.quantity_used,
        usage_date: usage.usage_date,
        wastage_calculated: usage.wastage_calculated,
        drum: usage.drum_tracking,
      },
    });
  } catch (error) {
    console.error("Error fetching line usage:", error);
    return NextResponse.json(
      { error: "Failed to fetch line usage" },
      { status: 500 }
    );
  }
}
