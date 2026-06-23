import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { recalculateDrumWithHistory } from "@/lib/drum-tracking-service";

// PUT /api/lines/[id]/update-with-usage
// Update a line's drum usage: restore prior usage (if any), then apply new usage
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const newDrumId: string | null = body.drum_id ?? null;
    const cableUsed: number = Number(body.cable_used || 0);

    let updated: any = null;
    const drumIdsToRecalculate = new Set<string>();

    await prisma.$transaction(async (tx: any) => {
      // Locate existing usage for this line
      const existingUsage = await tx.drumUsage.findFirst({
        where: { lineDetailsId: id },
        orderBy: { usageDate: "desc" },
      });

      // If there is existing usage, restore stock/quantity and remove the record
      if (existingUsage) {
        if (existingUsage.drumId) {
          drumIdsToRecalculate.add(existingUsage.drumId);
        }
        const originalDrum = await tx.drumTracking.findUnique({
          where: { id: existingUsage.drumId },
        });
        if (originalDrum) {
          const restoreAmount =
            Number(existingUsage.quantityUsed || 0) +
            Number(existingUsage.wastageCalculated || 0);

          const restoredQty =
            Number(originalDrum.currentQuantity || 0) + restoreAmount;
          await tx.drumTracking.update({
            where: { id: originalDrum.id },
            data: {
              currentQuantity: restoredQty,
              status:
                restoredQty <= 0
                  ? "empty"
                  : restoredQty < 100
                  ? "inactive"
                  : "active",
            },
          });

          const dropWire = await tx.inventoryItem.findFirst({
            where: { name: { equals: "Drop Wire Cable", mode: "insensitive" } },
          });
          if (dropWire) {
            const restoredStock =
              Number(dropWire.currentStock || 0) + restoreAmount;
            await tx.inventoryItem.update({
              where: { id: dropWire.id },
              data: { currentStock: restoredStock },
            });
          }
        }

        await tx.drumUsage.delete({ where: { id: existingUsage.id } });
      }

      // Apply new usage if a drum is provided and cableUsed > 0
      if (newDrumId && cableUsed > 0) {
        drumIdsToRecalculate.add(newDrumId);
        const targetDrum = await tx.drumTracking.findUnique({
          where: { id: newDrumId },
        });
        if (!targetDrum) throw new Error("Selected drum not found");

        // Fetch line's cable range if available
        const lineData = await tx.lineDetails.findUnique({
          where: { id },
          select: { cableStart: true, cableEnd: true }
        });
        const cableStart = lineData ? Number(lineData.cableStart) : 0;
        const cableEnd = lineData ? Number(lineData.cableEnd) : 0;

        // Simple wastage heuristic (5%) as the edit modal doesn't provide cable points
        const wastage = Math.round(cableUsed * 0.05);
        const deduction = cableUsed + wastage;

        const currentQty = Number(targetDrum.currentQuantity || 0);
        if (currentQty < deduction) {
          throw new Error(
            `Not enough cable available. Available: ${currentQty}m, Required: ${deduction}m`
          );
        }

        await tx.drumUsage.create({
          data: {
            drumId: newDrumId,
            lineDetailsId: id,
            quantityUsed: cableUsed,
            usageDate: new Date(),
            cableStartPoint: cableStart,
            cableEndPoint: cableEnd,
            wastageCalculated: wastage,
          },
        });

        const newQty = currentQty - deduction;
        await tx.drumTracking.update({
          where: { id: newDrumId },
          data: {
            currentQuantity: newQty,
            status:
              newQty <= 0 ? "empty" : newQty < 100 ? "inactive" : "active",
          },
        });

        const dropWire = await tx.inventoryItem.findFirst({
          where: { name: { equals: "Drop Wire Cable", mode: "insensitive" } },
        });
        if (dropWire) {
          const currentStock = Number(dropWire.currentStock || 0);
          await tx.inventoryItem.update({
            where: { id: dropWire.id },
            data: {
              currentStock: Math.max(0, currentStock - deduction),
            },
          });
        }

        // Update line's drum_number for reference
        await tx.lineDetails.update({
          where: { id },
          data: {
            drumNumber: targetDrum.drumNumber,
          },
        });
      } else {
        // If cleared drum selection or zero cable, ensure line has no drum_number
        await tx.lineDetails.update({
          where: { id },
          data: { drumNumber: null },
        });
      }

      updated = await tx.lineDetails.findUnique({ where: { id } });
    });

    // Run full recalculation on affected drums to update with smart wastage logic
    for (const drumId of drumIdsToRecalculate) {
      await recalculateDrumWithHistory(drumId);
    }

    return NextResponse.json({ data: updated });
  } catch (error: any) {
    console.error("Error updating line with usage:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to update line usage" },
      { status: 500 }
    );
  }
}
