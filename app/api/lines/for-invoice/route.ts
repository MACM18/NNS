import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { computeCableMeasurements } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const month = searchParams.get("month");
    const year = searchParams.get("year");

    if (!month || !year) {
      return NextResponse.json(
        { error: "Month and year are required" },
        { status: 400 }
      );
    }

    const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
    const endDate = new Date(parseInt(year), parseInt(month), 0);

    const lines = await prisma.lineDetails.findMany({
      where: {
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: { date: "asc" },
      select: {
        id: true,
        name: true,
        telephoneNo: true,
        cableStart: true,
        cableMiddle: true,
        cableEnd: true,
        date: true,
        address: true,
      },
    });

    // Transform to snake_case and compute cable measurements correctly
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const transformedLines = lines.map((line: any) => {
      const { totalCable } = computeCableMeasurements(
        Number(line.cableStart || 0),
        Number(line.cableMiddle || 0),
        Number(line.cableEnd || 0)
      );
      return {
        id: line.id,
        name: line.name,
        phone_number: line.telephoneNo,
        total_cable: totalCable,
        date: line.date?.toISOString().split("T")[0],
        address: line.address,
      };
    });

    return NextResponse.json({ data: transformedLines });
  } catch (error) {
    console.error("Error fetching line details for invoice:", error);
    return NextResponse.json(
      { error: "Failed to fetch line details" },
      { status: 500 }
    );
  }
}
