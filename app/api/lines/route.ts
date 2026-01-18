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
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const month = searchParams.get("month");
    const year = searchParams.get("year");
    const status = searchParams.get("status");
    const search = searchParams.get("search");
    const dateFilter = searchParams.get("dateFilter"); // 'today', 'week', 'month'
    const sortField = searchParams.get("sortField") || "created_at";
    const sortDirection = searchParams.get("sortDirection") || "desc";

    // Build where clause
    const where: Record<string, unknown> = {};

    // Support explicit startDate/endDate query params (YYYY-MM-DD)
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");

    if (startDateParam && endDateParam) {
      const startDate = new Date(startDateParam);
      const endDate = new Date(endDateParam + "T23:59:59.999Z");
      where.date = { gte: startDate, lte: endDate };
    } else if (dateFilter) {
      const now = new Date();
      let startDate: Date;

      switch (dateFilter) {
        case "today":
          startDate = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate()
          );
          break;
        case "week":
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case "month":
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        default:
          startDate = new Date(0);
      }

      where.date = { gte: startDate };
    } else if (month && year) {
      const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
      const endDate = new Date(
        parseInt(year),
        parseInt(month),
        0,
        23,
        59,
        59,
        999
      );
      where.date = {
        gte: startDate,
        lte: endDate,
      };
    }

    if (status) {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { telephone_no: { contains: search, mode: "insensitive" } },
        { name: { contains: search, mode: "insensitive" } },
        { address: { contains: search, mode: "insensitive" } },
        { dp: { contains: search, mode: "insensitive" } },
      ];
    }

    // Map sortField to Prisma field names
    const fieldMapping: Record<string, string> = {
      created_at: "createdAt",
      date: "date",
      name: "name",
      telephone_no: "telephoneNo",
    };
    const prismaField = fieldMapping[sortField] || "createdAt";

    const [lines, total] = await Promise.all([
      prisma.lineDetails.findMany({
        where,
        orderBy: { [prismaField]: sortDirection === "asc" ? "asc" : "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.lineDetails.count({ where }),
    ]);

    return NextResponse.json({
      data: lines,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching lines:", error);
    return NextResponse.json(
      { error: "Failed to fetch lines" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();

    const line = await prisma.lineDetails.create({
      data: body,
    });

    return NextResponse.json({ data: line });
  } catch (error) {
    console.error("Error creating line:", error);
    return NextResponse.json(
      { error: "Failed to create line" },
      { status: 500 }
    );
  }
}
