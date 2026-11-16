import { NextRequest, NextResponse } from "next/server";
import { getMobilePrincipal } from "@/lib/mobile-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const principal = await getMobilePrincipal(request);
  if (!principal) return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: { "Cache-Control": "no-store" } });
  const { id } = await context.params;
  if (!/^[\w-]{1,80}$/.test(id)) return NextResponse.json({ error: "Line not found" }, { status: 404, headers: { "Cache-Control": "no-store" } });

  try {
    const line = await prisma.lineDetails.findUnique({
      where: { id },
      select: {
        id: true, date: true, telephoneNo: true, name: true, address: true, dp: true,
        status: true, powerDp: true, powerInbox: true, cableStart: true, cableMiddle: true,
        cableEnd: true, ont: true, ontSerial: true, voiceTestNo: true, voiceTestNoNew: true,
        stb: true, stbSerial: true, phoneNumber: true, updatedAt: true,
        workAssignments: { select: { worker: { select: { id: true, fullName: true } } }, orderBy: { createdAt: "asc" } },
      },
    });
    if (!line) return NextResponse.json({ error: "Line not found" }, { status: 404, headers: { "Cache-Control": "no-store" } });
    const sync = await prisma.googleSheetLineSync.findUnique({ where: { lineId: id }, select: { status: true } });
    return NextResponse.json({
      data: {
        ...line,
        date: line.date.toISOString().slice(0, 10),
        powerDp: line.powerDp == null ? null : Number(line.powerDp),
        powerInbox: line.powerInbox == null ? null : Number(line.powerInbox),
        cableStart: Number(line.cableStart), cableMiddle: Number(line.cableMiddle), cableEnd: Number(line.cableEnd),
        workAssignments: line.workAssignments.map((assignment) => ({ workerId: assignment.worker.id, workerName: assignment.worker.fullName })),
        sheetSyncStatus: sync?.status ?? null,
        updatedAt: line.updatedAt.toISOString(),
      },
    }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Could not load this line" }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}
