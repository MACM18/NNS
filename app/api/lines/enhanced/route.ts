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
        line_assignees: {
          include: {
            profile: {
              select: {
                id: true,
                full_name: true,
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
      const assignees = (line.line_assignees || [])
        .map((a: any) => a.profile)
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
        telephone_no: line.telephone_no,
        dp: line.dp,
        date: line.date,
        status: normalizedStatus,
        task_id: line.task_id,
        power_dp: line.power_dp || 0,
        power_inbox: line.power_inbox || 0,
        cable_start: line.cable_start || 0,
        cable_middle: line.cable_middle || 0,
        cable_end: line.cable_end || 0,
        total_cable: line.total_cable || 0,
        wastage: line.wastage || 0,
        internal_wire: line.internal_wire || 0,
        casing: line.casing || 0,
        conduit: line.conduit || 0,
        cat5: line.cat5 || 0,
        c_tie: line.c_tie || 0,
        c_clip: line.c_clip || 0,
        tag_tie: line.tag_tie || 0,
        flexible: line.flexible || 0,
        pole: line.pole || 0,
        pole_67: line.pole_67 || 0,
        top_bolt: line.top_bolt || 0,
        f1: line.f1 || 0,
        g1: line.g1 || 0,
        c_hook: line.c_hook || 0,
        l_hook: line.l_hook || 0,
        retainers: line.retainers || 0,
        nut_bolt: line.nut_bolt || 0,
        u_clip: line.u_clip || 0,
        concrete_nail: line.concrete_nail || 0,
        roll_plug: line.roll_plug || 0,
        screw_nail: line.screw_nail || 0,
        socket: line.socket || 0,
        bend: line.bend || 0,
        rj11: line.rj11 || 0,
        rj12: line.rj12 || 0,
        rj45: line.rj45 || 0,
        fiber_rosette: line.fiber_rosette || 0,
        s_rosette: line.s_rosette || 0,
        fac: line.fac || 0,
        assignees,
        created_at: line.created_at,
        completed: line.completed,
        drum_number: line.drum_number || "",
        ont_serial: line.ont_serial || "",
        voice_test_no: line.voice_test_no || "",
        stb_serial: line.stb_serial || "",
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
