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
      where: { lineDetailsId: id },
      include: {
        drum: {
          select: { id: true, drumNumber: true, currentQuantity: true },
        },
      },
      orderBy: { usageDate: "desc" },
    });

    if (!usage) return NextResponse.json({ data: null });

    return NextResponse.json({
      data: {
        id: usage.id,
        drum_id: usage.drumId,
        line_id: usage.lineDetailsId,
        quantity_used: usage.quantityUsed,
        usage_date: usage.usageDate,
        wastage_calculated: usage.wastageCalculated,
        drum: usage.drum,
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
