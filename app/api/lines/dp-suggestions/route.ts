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
    const query = searchParams.get("q");

    if (!query || query.length < 3) {
      return NextResponse.json({ data: [] });
    }

    // Find DPs that start with the query string
    const lines = await prisma.lineDetails.findMany({
      where: {
        dp: {
          startsWith: query,
          mode: "insensitive",
        },
      },
      select: {
        dp: true,
      },
      take: 50, // Get more results to aggregate
    });

    // Group and count DPs
    const dpCounts = lines.reduce(
      (acc: Record<string, number>, item: { dp: string | null }) => {
        if (item.dp) {
          acc[item.dp] = (acc[item.dp] || 0) + 1;
        }
        return acc;
      },
      {} as Record<string, number>
    );

    // Convert to array format
    const suggestions = Object.entries(dpCounts)
      .map(([dp, count]) => ({ dp, count }))
      .slice(0, 10); // Limit to 10 suggestions

    return NextResponse.json({ data: suggestions });
  } catch (error) {
    console.error("Error fetching DP suggestions:", error);
    return NextResponse.json(
      { error: "Failed to fetch DP suggestions" },
      { status: 500 }
    );
  }
}
