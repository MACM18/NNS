import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { recalculateDrumWithHistory } from "@/lib/drum-tracking-service";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Find all active drums
    const activeDrums = await prisma.drumTracking.findMany({
      where: { status: "active" },
      select: { id: true, drumNumber: true },
    });

    const results = [];
    for (const drum of activeDrums) {
      const res = await recalculateDrumWithHistory(drum.id);
      results.push({
        id: drum.id,
        drum_number: drum.drumNumber,
        new_quantity: res.newQuantity,
        wastage: res.wastage,
      });
    }

    return NextResponse.json({
      success: true,
      message: `Recalculated ${activeDrums.length} active drums`,
      data: results,
    });
  } catch (error) {
    console.error("Error recalculating active drums:", error);
    return NextResponse.json(
      { error: "Failed to recalculate drums" },
      { status: 500 }
    );
  }
}
