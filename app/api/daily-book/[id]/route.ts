import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const kinds: Record<string, "string" | "number"> = {
  name: "string", address: "string", dp: "string", powerDp: "number", powerInbox: "number",
  cableStart: "number", cableMiddle: "number", cableEnd: "number", ont: "string",
  voiceTestNo: "string", stb: "string", ontSerial: "string", voiceTestNoNew: "string",
  stbSerial: "string", phoneNumber: "string",
};

async function actorProfile() {
  const session = await auth();
  if (!session?.user?.id) return null;
  return prisma.profile.findUnique({ where: { userId: session.user.id }, select: { id: true } });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const actor = await actorProfile();
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  try {
    const body = await req.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    const input: Record<string, unknown> = {};
    for (const [field, kind] of Object.entries(kinds)) {
      if (!(field in body)) continue;
      const value = body[field];
      if (value == null || value === "") input[field] = null;
      else if (kind === "string" && typeof value === "string" && value.length <= 1000) input[field] = value.trim() || null;
      else if (kind === "number") {
        const number = typeof value === "number" ? value : Number(value);
        if (!Number.isFinite(number) || number < 0 || number > 100000000) return NextResponse.json({ error: `Invalid ${field}` }, { status: 400 });
        input[field] = number;
      } else return NextResponse.json({ error: `Invalid ${field}` }, { status: 400 });
    }
    if (body.status !== undefined) {
      if (body.status !== "in_progress" && body.status !== "completed") return NextResponse.json({ error: "Invalid status" }, { status: 400 });
      input.status = body.status;
    }
    const workerIds: string[] | undefined | null = body.workerIds === undefined ? undefined : Array.isArray(body.workerIds)
      ? [...new Set<string>(body.workerIds.filter((workerId: unknown): workerId is string => typeof workerId === "string"))]
      : null;
    if (workerIds === null) return NextResponse.json({ error: "Invalid worker selection" }, { status: 400 });

    const result = await prisma.$transaction(async (tx) => {
      const previous = await tx.lineDetails.findUnique({ where: { id }, include: { workAssignments: { select: { workerId: true } } } });
      if (!previous) throw new Error("NOT_FOUND");
      const nextDp = Object.prototype.hasOwnProperty.call(input, "dp") ? input.dp : previous.dp;
      if (input.status === "completed" && (typeof nextDp !== "string" || !nextDp.trim())) throw new Error("DP_REQUIRED");

      const beforeValues: Record<string, unknown> = {};
      const afterValues: Record<string, unknown> = {};
      const data: Record<string, unknown> = {};
      for (const [field, value] of Object.entries(input)) {
        const previousValue = (previous as any)[field];
        const normalizedPrevious = previousValue instanceof Prisma.Decimal ? Number(previousValue) : previousValue;
        if (normalizedPrevious === value) continue;
        if (field === "status") {
          beforeValues[field] = normalizedPrevious;
          afterValues[field] = value;
          data[field] = value;
          if (value === "completed" && !previous.completedDate) data.completedDate = previous.date;
          if (value === "in_progress") data.completedDate = null;
          continue;
        }
        beforeValues[field] = normalizedPrevious;
        afterValues[field] = value;
        data[field] = value;
      }

      const assignmentBefore = previous.workAssignments.map((assignment) => assignment.workerId).sort();
      let validWorkerIds = assignmentBefore;
      if (workerIds) {
        const workers = workerIds.length ? await tx.worker.findMany({ where: { id: { in: workerIds }, status: "active" }, select: { id: true } }) : [];
        if (workers.length !== workerIds.length) throw new Error("WORKER_UNAVAILABLE");
        validWorkerIds = workerIds.slice().sort();
        if (JSON.stringify(assignmentBefore.slice().sort()) !== JSON.stringify(validWorkerIds)) {
          beforeValues.workerIds = assignmentBefore;
          afterValues.workerIds = validWorkerIds;
          await tx.workAssignment.deleteMany({ where: { lineId: id } });
          if (workerIds.length) await tx.workAssignment.createMany({ data: workerIds.map((workerId) => ({ lineId: id, workerId, assignedDate: previous.date, createdById: actor.id })) });
        }
      }

      const changedFields = Object.keys(afterValues);
      const updated = Object.keys(data).length ? await tx.lineDetails.update({ where: { id }, data: data as any }) : previous;
      if (changedFields.length) await tx.lineDetailsRevision.create({ data: {
        lineId: id, actorProfileId: actor.id, changedFields,
        beforeValues: beforeValues as Prisma.InputJsonValue,
        afterValues: afterValues as Prisma.InputJsonValue,
      } });
      return { updated, changedFields };
    });
    return NextResponse.json({ success: true, changedFields: result.changedFields, updatedAt: result.updated.updatedAt });
  } catch (error: any) {
    if (error?.message === "NOT_FOUND") return NextResponse.json({ error: "Daily Book entry not found" }, { status: 404 });
    if (error?.message === "DP_REQUIRED") return NextResponse.json({ error: "DP is required before completing an entry" }, { status: 400 });
    if (error?.message === "WORKER_UNAVAILABLE") return NextResponse.json({ error: "One or more selected workers are unavailable" }, { status: 400 });
    if (error?.code === "P2002") return NextResponse.json({ error: "An entry for this phone and date already exists" }, { status: 409 });
    console.error("Daily Book update failed", error);
    return NextResponse.json({ error: "Could not save this Daily Book change" }, { status: 500 });
  }
}
