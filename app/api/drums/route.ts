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
    const status = searchParams.get("status");
    const search = searchParams.get("search");
    const all = searchParams.get("all");
    const includeUsage = searchParams.get("includeUsage") === "true";

    // Build where clause
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};

    if (status) {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { drumNumber: { contains: search, mode: "insensitive" } },
      ];
    }

    // If "all" param is present, return all drums without pagination
    if (all === "true") {
      const drums = await prisma.drumTracking.findMany({
        where,
        orderBy: { createdAt: "desc" },
        include: {
          item: {
            select: { name: true },
          },
        },
      });

      // Include usage data if requested
      let usageData: any[] = [];
      if (includeUsage) {
        usageData = await prisma.drumUsage.findMany({
          orderBy: { usageDate: "desc" },
          include: {
            lineDetails: {
              select: { telephoneNo: true, name: true },
            },
          },
        });
      }

      // Transform drums with item name
      type DrumWithRelations = (typeof drums)[number];
      const transformedDrums = drums.map((drum: DrumWithRelations) => ({
        ...drum,
        item_name: drum.item?.name || "",
      }));

      return NextResponse.json({
        data: transformedDrums,
        usageData: includeUsage ? usageData : undefined,
      });
    }

    const [drums, total] = await Promise.all([
      prisma.drumTracking.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          item: {
            select: { name: true },
          },
        },
      }),
      prisma.drumTracking.count({ where }),
    ]);

    // Transform drums with item name
    type DrumWithRelations = (typeof drums)[number];
    const transformedDrums = drums.map((drum: DrumWithRelations) => ({
      ...drum,
      item_name: drum.item?.name || "",
    }));

    return NextResponse.json({
      data: transformedDrums,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching drums:", error);
    return NextResponse.json(
      { error: "Failed to fetch drums" },
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

    const drum = await prisma.drumTracking.create({
      data: body,
    });

    return NextResponse.json({ data: drum });
  } catch (error) {
    console.error("Error creating drum:", error);
    return NextResponse.json(
      { error: "Failed to create drum" },
      { status: 500 }
    );
  }
}
