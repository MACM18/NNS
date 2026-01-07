import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { isRecord } from "@/lib/error-utils";

function toNumber(value: unknown): number | undefined {
  if (typeof value === "number")
    return Number.isFinite(value) ? value : undefined;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

function toInt(value: unknown): number | undefined {
  const num = toNumber(value);
  return num === undefined ? undefined : Math.trunc(num);
}

function toStringOrUndefined(value: unknown): string | undefined {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed ? trimmed : undefined;
  }
  return value == null ? undefined : String(value);
}

function toDateOrUndefined(value: unknown): Date | undefined {
  if (value instanceof Date) return value;
  if (typeof value === "string") {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? undefined : d;
  }
  return undefined;
}

function getField(body: Record<string, unknown>, snake: string, camel: string) {
  return body[snake] ?? body[camel];
}

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

    if (!isRecord(body)) {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      );
    }

    // Extract fields used for drum usage calculation
    const selectedDrumId: string | undefined =
      (getField(body, "selected_drum_id", "selectedDrumId") as
        | string
        | undefined) ||
      (getField(body, "drum_id", "drumId") as string | undefined) ||
      undefined;
    const usageDateStr = toStringOrUndefined(getField(body, "date", "date"));
    const usageDate = usageDateStr ? new Date(usageDateStr) : new Date();
    const cableStart =
      toNumber(getField(body, "cable_start", "cableStart")) ?? 0;
    const cableEnd = toNumber(getField(body, "cable_end", "cableEnd")) ?? 0;
    const totalCable =
      toNumber(getField(body, "total_cable", "totalCable")) ?? 0;
    const wastageInput =
      toNumber(getField(body, "wastage_input", "wastageInput")) ?? 0;

    let createdLine: { id: string } | null = null;
    let finalWastage = wastageInput;

    const telephoneNoRaw = getField(body, "telephone_no", "telephoneNo");
    const dpRaw = getField(body, "dp", "dp");
    const telephoneNo = toStringOrUndefined(telephoneNoRaw);
    const dp = toStringOrUndefined(dpRaw);

    if (!telephoneNo || !dp) {
      return NextResponse.json(
        { error: "Missing required fields (telephone_no, dp)" },
        { status: 400 }
      );
    }

    const taskId = toStringOrUndefined(getField(body, "task_id", "taskId"));

    const lineCreateData: Prisma.LineDetailsCreateInput = {
      telephoneNo,
      dp,
      date: usageDate,
      ...(taskId ? { task: { connect: { id: taskId } } } : {}),
      powerDp: toNumber(getField(body, "power_dp", "powerDp")),
      powerInbox: toNumber(getField(body, "power_inbox", "powerInbox")),
      name: toStringOrUndefined(getField(body, "name", "name")),
      address: toStringOrUndefined(getField(body, "address", "address")),
      cableStart: toNumber(getField(body, "cable_start", "cableStart")),
      cableMiddle: toNumber(getField(body, "cable_middle", "cableMiddle")),
      cableEnd: toNumber(getField(body, "cable_end", "cableEnd")),
      wastage: toNumber(getField(body, "wastage", "wastage")),
      wastageInput: toNumber(getField(body, "wastage_input", "wastageInput")),
      retainers: toInt(getField(body, "retainers", "retainers")),
      lHook: toInt(getField(body, "l_hook", "lHook")),
      cHook: toInt(getField(body, "c_hook", "cHook")),
      topBolt: toInt(getField(body, "top_bolt", "topBolt")),
      fiberRosette: toInt(getField(body, "fiber_rosette", "fiberRosette")),
      internalWire: toNumber(getField(body, "internal_wire", "internalWire")),
      sRosette: toInt(getField(body, "s_rosette", "sRosette")),
      fac: toInt(getField(body, "fac", "fac")),
      casing: toNumber(getField(body, "casing", "casing")),
      cTie: toInt(getField(body, "c_tie", "cTie")),
      cClip: toInt(getField(body, "c_clip", "cClip")),
      conduit: toNumber(getField(body, "conduit", "conduit")),
      tagTie: toInt(getField(body, "tag_tie", "tagTie")),
      ont: toStringOrUndefined(getField(body, "ont", "ont")),
      voiceTestNo: toStringOrUndefined(
        getField(body, "voice_test_no", "voiceTestNo")
      ),
      stb: toStringOrUndefined(getField(body, "stb", "stb")),
      flexible: toInt(getField(body, "flexible", "flexible")),
      rj45: toInt(getField(body, "rj45", "rj45")),
      cat5: toNumber(getField(body, "cat5", "cat5")),
      pole67: toInt(getField(body, "pole_67", "pole67")),
      pole: toInt(getField(body, "pole", "pole")),
      concreteNail: toInt(getField(body, "concrete_nail", "concreteNail")),
      rollPlug: toInt(getField(body, "roll_plug", "rollPlug")),
      uClip: toInt(getField(body, "u_clip", "uClip")),
      socket: toInt(getField(body, "socket", "socket")),
      bend: toInt(getField(body, "bend", "bend")),
      rj11: toInt(getField(body, "rj11", "rj11")),
      rj12: toInt(getField(body, "rj12", "rj12")),
      drumNumber: toStringOrUndefined(
        getField(body, "drum_number", "drumNumber")
      ),
      phoneNumber: toStringOrUndefined(
        getField(body, "phone_number", "phoneNumber")
      ),
      ontSerial: toStringOrUndefined(getField(body, "ont_serial", "ontSerial")),
      voiceTestNoNew: toStringOrUndefined(
        getField(body, "voice_test_no_new", "voiceTestNoNew")
      ),
      stbSerial: toStringOrUndefined(getField(body, "stb_serial", "stbSerial")),
      drumNumberNew: toStringOrUndefined(
        getField(body, "drum_number_new", "drumNumberNew")
      ),
      completedDate: toDateOrUndefined(
        getField(body, "completed_date", "completedDate")
      ),
      status: toStringOrUndefined(getField(body, "status", "status")),
      nutBolt: toInt(getField(body, "nut_bolt", "nutBolt")),
      screwNail: toInt(getField(body, "screw_nail", "screwNail")),
    };

    const result = await prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        // 1) Create the line
        createdLine = await tx.lineDetails.create({ data: lineCreateData });

        if (!createdLine) {
          throw new Error("Failed to create line");
        }

        // 2) Handle drum usage + inventory updates if a drum was selected
        if (selectedDrumId && totalCable > 0) {
          // Find last usage record to compute potential additional wastage from gap
          const lastUsage = await tx.drumUsage.findFirst({
            where: { drumId: selectedDrumId },
            orderBy: { usageDate: "desc" },
            include: { lineDetails: { select: { id: true, cableEnd: true } } },
          });

          let additionalWastage = 0;
          let previousLineId: string | null = null;
          if (lastUsage) {
            const lastUsageUnknown: unknown = lastUsage;
            const previousEndPointRaw = (() => {
              if (isRecord(lastUsageUnknown)) {
                const direct =
                  lastUsageUnknown["cableEndPoint"] ??
                  lastUsageUnknown["cableEnd"];
                if (typeof direct === "number" || typeof direct === "string") {
                  return direct;
                }
                const lineDetails = lastUsageUnknown["lineDetails"];
                if (isRecord(lineDetails)) {
                  const fromLine = lineDetails["cableEnd"];
                  if (
                    typeof fromLine === "number" ||
                    typeof fromLine === "string"
                  ) {
                    return fromLine;
                  }
                }
              }
              return 0;
            })();
            const previousEndPoint = Number(previousEndPointRaw) || 0;
            if (cableStart < (Number(previousEndPoint) || 0)) {
              additionalWastage = (Number(previousEndPoint) || 0) - cableStart;
              finalWastage += additionalWastage;
              previousLineId = lastUsage.lineDetails?.id || null;
            }
          }

          // Get current drum state
          const drum = await tx.drumTracking.findUnique({
            where: { id: selectedDrumId },
            select: { id: true, currentQuantity: true },
          });
          if (!drum) {
            throw new Error("Selected drum not found");
          }

          // Record usage
          await tx.drumUsage.create({
            data: {
              drumId: selectedDrumId,
              lineDetailsId: createdLine.id,
              quantityUsed: totalCable,
              usageDate: usageDate,
              cableStartPoint: cableStart,
              cableEndPoint: cableEnd,
              wastageCalculated: finalWastage,
            },
          });

          // Update drum quantity and status
          const currentQty = Number(drum.currentQuantity || 0);
          const totalDeduction = totalCable + finalWastage;
          const newQty = Math.max(0, currentQty - totalDeduction);
          const newStatus =
            newQty <= 0 ? "empty" : newQty <= 10 ? "inactive" : "active";
          await tx.drumTracking.update({
            where: { id: selectedDrumId },
            data: {
              currentQuantity: newQty,
              status: newStatus,
            },
          });

          // Update Drop Wire Cable inventory if present
          const dropWire = await tx.inventoryItem.findFirst({
            where: { name: { equals: "Drop Wire Cable", mode: "insensitive" } },
          });
          if (dropWire) {
            const currentStock = Number(dropWire.currentStock || 0);
            const newStock = Math.max(0, currentStock - totalDeduction);
            await tx.inventoryItem.update({
              where: { id: dropWire.id },
              data: { currentStock: newStock },
            });
          }

          // Update previous line wastage if we detected additional wastage
          if (previousLineId && additionalWastage > 0) {
            await tx.lineDetails.update({
              where: { id: previousLineId },
              data: {
                wastage: additionalWastage,
                wastageInput: additionalWastage,
              },
            });
          }
        }

        return createdLine;
      }
    );

    return NextResponse.json({ data: { line: result, wastage: finalWastage } });
  } catch (error) {
    console.error("Error creating line with usage:", error);
    return NextResponse.json(
      { error: "Failed to create line with usage" },
      { status: 500 }
    );
  }
}
