import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// POST to fetch multiple line details by IDs
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { ids } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: "Line detail IDs are required" },
        { status: 400 }
      );
    }

    const lines = await prisma.lineDetails.findMany({
      where: {
        id: { in: ids },
      },
      select: {
        id: true,
        name: true,
        phone_number: true,
        total_cable: true,
        date: true,
        address: true,
      },
    });

    // Transform to snake_case for frontend compatibility
    const transformedLines = lines.map((line: any) => ({
      id: line.id,
      name: line.name,
      phone_number: line.phone_number,
      total_cable: line.total_cable,
      date: line.date,
      address: line.address,
    }));

    return NextResponse.json({ data: transformedLines });
  } catch (error) {
    console.error("Error fetching line details by IDs:", error);
    return NextResponse.json(
      { error: "Failed to fetch line details" },
      { status: 500 }
    );
  }
}
