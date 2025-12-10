import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// POST /api/lines/create-with-usage
// Creates a line_details row and, if a drum is selected, records drum usage,
// updates drum current quantity/status, and updates Drop Wire Cable inventory stock.
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();

    // Extract fields used for drum usage calculation
    const selectedDrumId: string | undefined =
      body.selected_drum_id || body.drum_id || undefined;
    const usageDateStr: string = body.date;
    const usageDate = usageDateStr ? new Date(usageDateStr) : new Date();
    const cableStart = Number.parseFloat(String(body.cable_start ?? 0)) || 0;
    const cableEnd = Number.parseFloat(String(body.cable_end ?? 0)) || 0;
    const totalCable = Number.parseFloat(String(body.total_cable ?? 0)) || 0;
    const wastageInput =
      Number.parseFloat(String(body.wastage_input ?? 0)) || 0;

    let createdLine: any = null;
    let finalWastage = wastageInput;

    const result = await prisma.$transaction(async (tx: any) => {
      // 1) Create the line_details as-is (expects snake_case fields matching DB)
      const { selected_drum_id, drum_id, ...linePayload } = body;
      createdLine = await tx.line_details.create({ data: linePayload });

      // 2) Handle drum usage + inventory updates if a drum was selected
      if (selectedDrumId && totalCable > 0) {
        // Find last usage record to compute potential additional wastage from gap
        const lastUsage = await tx.drum_usage.findFirst({
          where: { drum_id: selectedDrumId },
          orderBy: { usage_date: "desc" },
          include: { line_details: { select: { id: true, cable_end: true } } },
        });

        let additionalWastage = 0;
        let previousLineId: string | null = null;
        if (lastUsage) {
          const previousEndPoint =
            (lastUsage as any).cable_end_point ??
            (lastUsage as any).cable_end ??
            lastUsage.line_details?.cable_end ??
            0;
          if (cableStart < (Number(previousEndPoint) || 0)) {
            additionalWastage = (Number(previousEndPoint) || 0) - cableStart;
            finalWastage += additionalWastage;
            previousLineId = lastUsage.line_details?.id || null;
          }
        }

        // Get current drum state
        const drum = await tx.drum_tracking.findUnique({
          where: { id: selectedDrumId },
          select: { id: true, current_quantity: true },
        });
        if (!drum) {
          throw new Error("Selected drum not found");
        }

        // Record usage
        await tx.drum_usage.create({
          data: {
            drum_id: selectedDrumId,
            line_details_id: createdLine.id,
            quantity_used: totalCable,
            usage_date: usageDate,
            cable_start_point: cableStart,
            cable_end_point: cableEnd,
            wastage_calculated: finalWastage,
          },
        });

        // Update drum quantity and status
        const currentQty = Number(drum.current_quantity || 0);
        const totalDeduction = totalCable + finalWastage;
        const newQty = Math.max(0, currentQty - totalDeduction);
        const newStatus =
          newQty <= 0 ? "empty" : newQty <= 10 ? "inactive" : "active";
        await tx.drum_tracking.update({
          where: { id: selectedDrumId },
          data: {
            current_quantity: newQty,
            status: newStatus,
            updated_at: new Date(),
          },
        });

        // Update Drop Wire Cable inventory if present
        const dropWire = await tx.inventory_items.findFirst({
          where: { name: { equals: "Drop Wire Cable", mode: "insensitive" } },
        });
        if (dropWire) {
          const currentStock = Number(dropWire.current_stock || 0);
          const newStock = Math.max(0, currentStock - totalDeduction);
          await tx.inventory_items.update({
            where: { id: dropWire.id },
            data: { current_stock: newStock, updated_at: new Date() },
          });
        }

        // Update previous line wastage if we detected additional wastage
        if (previousLineId && additionalWastage > 0) {
          await tx.line_details.update({
            where: { id: previousLineId },
            data: {
              wastage: additionalWastage,
              wastage_input: additionalWastage,
              updated_at: new Date(),
            },
          });
        }
      }

      return createdLine;
    });

    return NextResponse.json({ data: { line: result, wastage: finalWastage } });
  } catch (error) {
    console.error("Error creating line with usage:", error);
    return NextResponse.json(
      { error: "Failed to create line with usage" },
      { status: 500 }
    );
  }
}
