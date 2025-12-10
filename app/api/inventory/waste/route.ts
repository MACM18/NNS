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
      orderBy: { waste_date: "desc" },
      take: limit,
      include: {
        profile: {
          select: { full_name: true },
        },
        inventoryItem: {
          select: { name: true },
        },
      },
    });

    // Transform the data to match the expected format
    type WasteReportWithRelations = (typeof wasteReports)[number];
    const formattedReports = wasteReports.map(
      (report: WasteReportWithRelations) => ({
        ...report,
        item_name: report.inventoryItem?.name || "",
        full_name: report.profile?.full_name || "",
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
              item_id: item.item_id,
              quantity: Number(item.quantity),
              waste_reason: item.waste_reason || "",
              waste_date: waste_date ? new Date(waste_date) : new Date(),
              reported_by: session.user?.id,
            },
          });
          createdRecords.push(wasteRecord);

          // Update inventory stock (reduce by waste amount)
          const inventoryItem = await tx.inventoryItem.findUnique({
            where: { id: item.item_id },
          });

          if (inventoryItem) {
            const currentStock = inventoryItem.current_stock || 0;
            const newStock = Math.max(0, currentStock - Number(item.quantity));
            await tx.inventoryItem.update({
              where: { id: item.item_id },
              data: {
                current_stock: newStock,
                updated_at: new Date(),
              },
            });
          }
        }

        return createdRecords;
      });

      return NextResponse.json({
        data: results,
        message: `${results.length} waste records created successfully`,
      });
    }

    // Single record creation (legacy support)
    const wasteReport = await prisma.wasteTracking.create({
      data: body,
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
