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
    const limit = parseInt(searchParams.get("limit") || "20");

    const wasteReports = await prisma.wasteTracking.findMany({
      orderBy: { wasteDate: "desc" },
      take: limit,
      include: {
        reportedBy: {
          select: { fullName: true },
        },
        item: {
          select: { name: true },
        },
      },
    });

    // Transform the data to match the expected format (snake_case)
    type WasteReportWithRelations = (typeof wasteReports)[number];
    const formattedReports = wasteReports.map(
      (report: WasteReportWithRelations) => ({
        id: report.id,
        item_id: report.itemId,
        quantity: Number(report.quantity),
        waste_reason: report.wasteReason || "",
        waste_date: report.wasteDate ? report.wasteDate.toISOString().slice(0,10) : null,
        reported_by: report.reportedById ?? null,
        full_name: report.reportedBy?.fullName || "",
        created_at: report.createdAt?.toISOString(),
        item_name: report.item?.name || "",
      })
    );

    return NextResponse.json({ data: formattedReports });
  } catch (error) {
    console.error("Error fetching waste reports:", error);
    return NextResponse.json(
      { error: "Failed to fetch waste reports" },
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
    const { items, waste_date } = body;

    // Handle batch creation if items array is provided
    if (items && Array.isArray(items)) {
      const results = await prisma.$transaction(async (tx: any) => {
        const createdRecords = [];

        for (const item of items) {
          // Create waste record
          const wasteRecord = await tx.wasteTracking.create({
            data: {
              itemId: item.item_id ?? item.itemId,
              quantity: Number(item.quantity),
              wasteReason: item.waste_reason ?? item.wasteReason ?? "",
              wasteDate: waste_date ? new Date(waste_date) : new Date(),
              reportedById: session.user?.id,
            },
          });
          createdRecords.push(wasteRecord);

          // Update inventory stock (reduce by waste amount)
          const inventoryItem = await tx.inventoryItem.findUnique({
            where: { id: item.item_id ?? item.itemId },
          });

          if (inventoryItem) {
            const currentStock = Number(inventoryItem.currentStock || 0);
            const newStock = Math.max(0, currentStock - Number(item.quantity));
            await tx.inventoryItem.update({
              where: { id: item.item_id ?? item.itemId },
              data: {
                currentStock: newStock,
              },
            });
          }
        }

        return createdRecords;
      });

      const formatted = results.map((r: any) => ({
        id: r.id,
        item_id: r.itemId,
        quantity: Number(r.quantity),
        waste_reason: r.wasteReason || "",
        waste_date: r.wasteDate ? r.wasteDate.toISOString().slice(0,10) : null,
        reported_by: r.reportedById ?? null,
        created_at: r.createdAt?.toISOString(),
      }));

      return NextResponse.json({
        data: formatted,
        message: `${results.length} waste records created successfully`,
      });
    }

    // Single record creation (legacy support)
    const wasteReport = await prisma.wasteTracking.create({
      data: {
        itemId: body.item_id ?? body.itemId,
        quantity: Number(body.quantity),
        wasteReason: body.waste_reason ?? body.wasteReason ?? "",
        wasteDate: body.waste_date ? new Date(body.waste_date) : new Date(),
        reportedById: session.user?.id,
      },
    });

    return NextResponse.json({ data: wasteReport });
  } catch (error) {
    console.error("Error creating waste report:", error);
    return NextResponse.json(
      { error: "Failed to create waste report" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID required" }, { status: 400 });
    }

    await prisma.wasteTracking.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting waste report:", error);
    return NextResponse.json(
      { error: "Failed to delete waste report" },
      { status: 500 }
    );
  }
}
