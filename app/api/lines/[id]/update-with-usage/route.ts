import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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

    await prisma.$transaction(async (tx: any) => {
      // Locate existing usage for this line
      const existingUsage = await tx.drum_usage.findFirst({
        where: { line_details_id: id },
        orderBy: { usage_date: "desc" },
      });

      // If there is existing usage, restore stock/quantity and remove the record
      if (existingUsage) {
        const originalDrum = await tx.drum_tracking.findUnique({
          where: { id: existingUsage.drum_id },
        });
        if (originalDrum) {
          const restoreAmount =
            Number(existingUsage.quantity_used || 0) +
            Number(existingUsage.wastage_calculated || 0);

          const restoredQty =
            Number(originalDrum.current_quantity || 0) + restoreAmount;
          await tx.drum_tracking.update({
            where: { id: originalDrum.id },
            data: {
              current_quantity: restoredQty,
              status:
                restoredQty <= 0
                  ? "empty"
                  : restoredQty <= 10
                  ? "inactive"
                  : "active",
              updated_at: new Date(),
            },
          });

          const dropWire = await tx.inventory_items.findFirst({
            where: { name: { equals: "Drop Wire Cable", mode: "insensitive" } },
          });
          if (dropWire) {
            const restoredStock =
              Number(dropWire.current_stock || 0) + restoreAmount;
            await tx.inventory_items.update({
              where: { id: dropWire.id },
              data: { current_stock: restoredStock, updated_at: new Date() },
            });
          }
        }

        await tx.drum_usage.delete({ where: { id: existingUsage.id } });
      }

      // Apply new usage if a drum is provided and cableUsed > 0
      if (newDrumId && cableUsed > 0) {
        const targetDrum = await tx.drum_tracking.findUnique({
          where: { id: newDrumId },
        });
        if (!targetDrum) throw new Error("Selected drum not found");

        // Simple wastage heuristic (5%) as the edit modal doesn't provide cable points
        const wastage = Math.round(cableUsed * 0.05);
        const deduction = cableUsed + wastage;

        const currentQty = Number(targetDrum.current_quantity || 0);
        if (currentQty < deduction) {
          throw new Error(
            `Not enough cable available. Available: ${currentQty}m, Required: ${deduction}m`
          );
        }

        await tx.drum_usage.create({
          data: {
            drum_id: newDrumId,
            line_details_id: id,
            quantity_used: cableUsed,
            usage_date: new Date(),
            cable_start_point: null,
            cable_end_point: null,
            wastage_calculated: wastage,
          },
        });

        const newQty = currentQty - deduction;
        await tx.drum_tracking.update({
          where: { id: newDrumId },
          data: {
            current_quantity: newQty,
            status:
              newQty <= 0 ? "empty" : newQty <= 10 ? "inactive" : "active",
            updated_at: new Date(),
          },
        });

        const dropWire = await tx.inventory_items.findFirst({
          where: { name: { equals: "Drop Wire Cable", mode: "insensitive" } },
        });
        if (dropWire) {
          const currentStock = Number(dropWire.current_stock || 0);
          await tx.inventory_items.update({
            where: { id: dropWire.id },
            data: {
              current_stock: Math.max(0, currentStock - deduction),
              updated_at: new Date(),
            },
          });
        }

        // Update line's drum_number for reference
        await tx.line_details.update({
          where: { id },
          data: {
            drum_number: targetDrum.drum_number,
            updated_at: new Date(),
          },
        });
      } else {
        // If cleared drum selection or zero cable, ensure line has no drum_number
        await tx.line_details.update({
          where: { id },
          data: { drum_number: null, updated_at: new Date() },
        });
      }

      updated = await tx.line_details.findUnique({ where: { id } });
    });

    return NextResponse.json({ data: updated });
  } catch (error: any) {
    console.error("Error updating line with usage:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to update line usage" },
      { status: 500 }
    );
  }
}
