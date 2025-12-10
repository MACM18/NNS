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
        telephoneNo: { not: null },
        totalCable: { gt: -1 },
      },
      orderBy: { date: "asc" },
      select: {
        id: true,
        name: true,
        telephoneNo: true,
        totalCable: true,
        date: true,
        address: true,
      },
    });

    // Transform to snake_case
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const transformedLines = lines.map((line: any) => ({
      id: line.id,
      name: line.name,
      phone_number: line.telephoneNo,
      total_cable: line.totalCable ? Number(line.totalCable) : 0,
      date: line.date?.toISOString().split("T")[0],
      address: line.address,
    }));

    return NextResponse.json({ data: transformedLines });
  } catch (error) {
    console.error("Error fetching line details for invoice:", error);
    return NextResponse.json(
      { error: "Failed to fetch line details" },
      { status: 500 }
    );
  }
}
