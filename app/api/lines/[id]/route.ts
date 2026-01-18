import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const line = await prisma.lineDetails.findUnique({
      where: { id },
      include: {
        lineAssignees: {
          include: {
            user: { select: { id: true, fullName: true, role: true } },
          },
        },
      },
    });

    if (!line) {
      return NextResponse.json({ error: "Line not found" }, { status: 404 });
    }

    const assignees = (line.lineAssignees || [])
      .map((a: any) => a.user)
      .filter(Boolean);

    const formatted = {
      id: line.id,
      name: line.name,
      address: line.address,
      telephone_no: line.telephoneNo,
      dp: line.dp,
      date: line.date,
      status: line.status,
      task_id: line.taskId,
      power_dp: Number(line.powerDp || 0),
      power_inbox: Number(line.powerInbox || 0),
      cable_start: Number(line.cableStart || 0),
      cable_middle: Number(line.cableMiddle || 0),
      cable_end: Number(line.cableEnd || 0),
      total_cable:
        Number(line.cableStart || 0) +
        Number(line.cableMiddle || 0) +
        Number(line.cableEnd || 0),
      wastage: Number(line.wastage || 0),
      internal_wire: Number(line.internalWire || 0),
      casing: Number(line.casing || 0),
      conduit: Number(line.conduit || 0),
      cat5: Number(line.cat5 || 0),
      c_tie: Number(line.cTie || 0),
      c_clip: Number(line.cClip || 0),
      tag_tie: Number(line.tagTie || 0),
      flexible: Number(line.flexible || 0),
      pole: Number(line.pole || 0),
      pole_67: Number(line.pole67 || 0),
      top_bolt: Number(line.topBolt || 0),
      // Compute segment lengths and totals
      f1: Number(line.cableStart || 0),
      g1: Number(line.cableMiddle || 0),
      c_hook: Number(line.cHook || 0),
      l_hook: Number(line.lHook || 0),
      retainers: Number(line.retainers || 0),
      nut_bolt: Number(line.nutBolt || 0),
      u_clip: Number(line.uClip || 0),
      concrete_nail: Number(line.concreteNail || 0),
      roll_plug: Number(line.rollPlug || 0),
      screw_nail: Number(line.screwNail || 0),
      socket: Number(line.socket || 0),
      bend: Number(line.bend || 0),
      rj11: Number(line.rj11 || 0),
      rj12: Number(line.rj12 || 0),
      rj45: Number(line.rj45 || 0),
      fiber_rosette: Number(line.fiberRosette || 0),
      s_rosette: Number(line.sRosette || 0),
      fac: Number(line.fac || 0),
      assignees,
      created_at: line.createdAt,
      completed: Boolean(line.completedDate || line.status === "completed"),
      drum_number: line.drumNumber || null,
      ont_serial: line.ontSerial || null,
      voice_test_no: line.voiceTestNo || null,
      stb_serial: line.stbSerial || null,
    };

    return NextResponse.json({ data: formatted });
  } catch (error) {
    console.error("Error fetching line:", error);
    return NextResponse.json(
      { error: "Failed to fetch line" },
      { status: 500 }
    );
  }
}

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

    // Whitelist allowed fields (accept snake_case or camelCase)
    const updateData: Record<string, unknown> = {};
    const fields = [
      "status", "name", "address", "dp", "telephone_no",
      "power_dp", "power_inbox", "cable_start", "cable_middle", "cable_end",
      "wastage", "retainers", "l_hook", "top_bolt", "c_hook", "fiber_rosette",
      "internal_wire", "s_rosette", "fac", "casing", "c_tie", "c_clip",
      "conduit", "tag_tie", "ont_serial", "voice_test_no", "stb_serial",
      "flexible", "rj45", "cat5", "pole_67", "pole", "concrete_nail",
      "roll_plug", "u_clip", "socket", "bend", "rj11", "rj12", "nut_bolt",
      "screw_nail", "completed_date", "drum_number"
    ];

    const prismaMapping: Record<string, string> = {
      telephone_no: "telephoneNo",
      power_dp: "powerDp",
      power_inbox: "powerInbox",
      cable_start: "cableStart",
      cable_middle: "cableMiddle",
      cable_end: "cableEnd",
      l_hook: "lHook",
      top_bolt: "topBolt",
      c_hook: "cHook",
      fiber_rosette: "fiberRosette",
      internal_wire: "internalWire",
      s_rosette: "sRosette",
      c_tie: "cTie",
      c_clip: "cClip",
      tag_tie: "tagTie",
      ont_serial: "ontSerial",
      voice_test_no: "voiceTestNo",
      stb_serial: "stbSerial",
      pole_67: "pole67",
      concrete_nail: "concreteNail",
      roll_plug: "rollPlug",
      u_clip: "uClip",
      nut_bolt: "nutBolt",
      screw_nail: "screwNail",
      completed_date: "completedDate",
      drum_number: "drumNumber",
    };

    for (const field of fields) {
      if (body[field] !== undefined) {
        const prismaKey = prismaMapping[field] || field;
        updateData[prismaKey] = body[field];
      }
    }

    const line = await prisma.lineDetails.update({
      where: { id },
      data: updateData,
    });

    // Return formatted snake_case response to match front-end expectations
    // We can reuse the same formatting logic as GET if we want, or just return basic info
    // For now, let's keep the return simple or expand it if the UI needs immediate update
    const formatted = {
      id: line.id,
      name: line.name,
      address: line.address,
      telephone_no: line.telephoneNo,
      dp: line.dp,
      date: line.date,
      status: line.status,
      task_id: line.taskId,
      created_at: line.createdAt,
      completed: Boolean(line.completedDate || line.status === "completed"),
      drum_number: line.drumNumber || null,
    };

    return NextResponse.json({ data: formatted });
  } catch (error) {
    console.error("Error updating line:", error);
    return NextResponse.json(
      { error: "Failed to update line" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Use a transaction to handle cascading deletes
    await prisma.$transaction(async (tx: any) => {
      // Remove dependent drum usage records (use Prisma field names)
      await tx.drumUsage.deleteMany({
        where: { lineDetailsId: id },
      });

      // Remove any line assignees
      await tx.lineAssignee.deleteMany({
        where: { lineId: id },
      });

      // Null out any tasks that reference this line
      await tx.task.updateMany({
        where: { lineDetailsId: id },
        data: { lineDetailsId: null },
      });

      // Finally delete the line
      await tx.lineDetails.delete({
        where: { id },
      });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting line:", error);
    return NextResponse.json(
      { error: "Failed to delete line" },
      { status: 500 }
    );
  }
}
