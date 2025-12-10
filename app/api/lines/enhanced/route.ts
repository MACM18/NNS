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
    const month = parseInt(
      searchParams.get("month") || String(new Date().getMonth() + 1)
    );
    const year = parseInt(
      searchParams.get("year") || String(new Date().getFullYear())
    );

    // Calculate date range
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);

    // Fetch line details with assignees
    const lines = await prisma.lineDetails.findMany({
      where: {
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        lineAssignees: {
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
                role: true,
              },
            },
          },
        },
      },
      orderBy: { date: "desc" },
    });

    // Process lines to include assignees in expected format
    const processedLines = lines.map((line: any) => {
      const assignees = (line.lineAssignees || [])
        .map((a: any) => a.user)
        .filter(Boolean);

      // Determine status
      let normalizedStatus = line.status;
      if (line.completed === true || line.status === "completed") {
        normalizedStatus = "completed";
      } else if (line.status === "in_progress") {
        normalizedStatus = "in_progress";
      } else if (!line.status || line.status === "pending") {
        normalizedStatus = "pending";
      }

      return {
        id: line.id,
        name: line.name,
        address: line.address,
        telephone_no: line.telephoneNo,
        dp: line.dp,
        date: line.date,
        status: normalizedStatus,
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
        wastage: line.wastage || 0,
        internal_wire: Number(line.internalWire || 0),
        casing: line.casing || 0,
        conduit: line.conduit || 0,
        cat5: line.cat5 || 0,
        c_tie: line.cTie || 0,
        c_clip: line.cClip || 0,
        tag_tie: line.tagTie || 0,
        flexible: line.flexible || 0,
        pole: line.pole || 0,
        pole_67: line.pole67 || 0,
        top_bolt: line.top_bolt || 0,
        f1: line.f1 || 0,
        g1: line.g1 || 0,
        c_hook: line.cHook || 0,
        l_hook: line.lHook || 0,
        retainers: line.retainers || 0,
        nut_bolt: line.nutBolt || 0,
        u_clip: line.u_clip || 0,
        concrete_nail: line.concreteNail || 0,
        roll_plug: line.rollPlug || 0,
        screw_nail: line.screwNail || 0,
        socket: line.socket || 0,
        bend: line.bend || 0,
        rj11: line.rj11 || 0,
        rj12: line.rj12 || 0,
        rj45: line.rj45 || 0,
        fiber_rosette: line.fiberRosette || 0,
        s_rosette: line.sRosette || 0,
        fac: line.fac || 0,
        assignees,
        created_at: line.createdAt,
        completed: line.completed,
        drum_number: line.drumNumber || "",
        ont_serial: line.ontSerial || "",
        voice_test_no: line.voiceTestNo || "",
        stb_serial: line.stbSerial || "",
      };
    });

    return NextResponse.json({ data: processedLines });
  } catch (error) {
    console.error("Error fetching enhanced line details:", error);
    return NextResponse.json(
      { error: "Failed to fetch line details" },
      { status: 500 }
    );
  }
}
