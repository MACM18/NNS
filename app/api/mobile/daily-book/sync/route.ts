import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getMobilePrincipal } from "@/lib/mobile-auth";
import { queueLineWrite, processLineWrite } from "@/lib/google-sheet-line-sync";
import { prisma } from "@/lib/prisma";

const stringFields = ["name", "address", "dp", "ont", "voiceTestNo", "stb", "ontSerial", "voiceTestNoNew", "stbSerial", "phoneNumber"] as const;
const numberFields = ["powerDp", "powerInbox", "cableStart", "cableMiddle", "cableEnd"] as const;
const allowedFields = new Set<string>([...stringFields, ...numberFields, "status", "workerIds"]);

function normalizePhone(value: unknown) {
  if (typeof value !== "string") return null;
  const phone = value.trim();
  if (!phone || phone.length > 32) return null;
  return /^\d{5}$/.test(phone) ? `03422${phone}` : phone;
}

function parseDate(value: unknown) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value ? null : date;
}

function normalizePatch(source: unknown) {
  if (!source || typeof source !== "object" || Array.isArray(source)) throw new Error("Invalid entry changes");
  const body = source as Record<string, unknown>;
  const values: Record<string, unknown> = {};
  for (const key of Object.keys(body)) {
    if (!allowedFields.has(key)) throw new Error("Unsupported field");
    const value = body[key];
    if (key === "workerIds") {
      if (!Array.isArray(value) || value.length > 30 || value.some((id) => typeof id !== "string")) throw new Error("Invalid team selection");
      values[key] = [...new Set(value as string[])].sort();
    } else if (key === "status") {
      if (value !== "completed" && value !== "in_progress") throw new Error("Invalid entry status");
      values[key] = value;
    } else if ((stringFields as readonly string[]).includes(key)) {
      if (value == null || value === "") values[key] = null;
      else if (typeof value !== "string" || value.length > 1000) throw new Error(`Invalid ${key}`);
      else values[key] = value.trim() || null;
    } else if ((numberFields as readonly string[]).includes(key)) {
      if (value == null || value === "") values[key] = ["cableStart", "cableMiddle", "cableEnd"].includes(key) ? 0 : null;
      else {
        const number = typeof value === "number" ? value : Number(value);
        if (!Number.isFinite(number) || number < 0 || number > 100000000) throw new Error(`Invalid ${key}`);
        values[key] = number;
      }
    }
  }
  return values;
}

function normalizedCurrent(value: unknown) {
  return value instanceof Prisma.Decimal ? Number(value) : value;
}

function sameValue(left: unknown, right: unknown) {
  return JSON.stringify(normalizedCurrent(left)) === JSON.stringify(normalizedCurrent(right));
}

async function applyCreate(principal: NonNullable<Awaited<ReturnType<typeof getMobilePrincipal>>>, mutationId: string, source: unknown) {
  if (!source || typeof source !== "object" || Array.isArray(source)) throw new Error("Invalid new entry");
  const body = source as Record<string, unknown>;
  const telephoneNo = normalizePhone(body.telephoneNo);
  const date = parseDate(body.date);
  if (!telephoneNo || !date) throw new Error("A valid phone number and date are required");
  const values = normalizePatch(Object.fromEntries(Object.entries(body).filter(([key]) => allowedFields.has(key))));
  if (values.status === "completed" && !values.dp) throw new Error("DP is required before completing an entry");
  const workerIds = Array.isArray(values.workerIds) ? values.workerIds as string[] : [];
  const lineId = await prisma.$transaction(async (tx) => {
    const existing = await tx.lineDetails.findFirst({ where: { telephoneNo, date }, select: { id: true } });
    if (existing) throw Object.assign(new Error("DUPLICATE_ENTRY"), { existingId: existing.id });
    const workers = workerIds.length ? await tx.worker.findMany({ where: { id: { in: workerIds }, status: "active" }, select: { id: true } }) : [];
    if (workers.length !== workerIds.length) throw new Error("One or more selected workers are unavailable");
    const created = await tx.lineDetails.create({
      data: {
        telephoneNo, date,
        status: values.status === "completed" ? "completed" : "in_progress",
        ...(values.status === "completed" ? { completedDate: date } : {}),
        dp: typeof values.dp === "string" ? values.dp : null,
        name: typeof values.name === "string" ? values.name : null,
        address: typeof values.address === "string" ? values.address : null,
        powerDp: typeof values.powerDp === "number" ? values.powerDp : null,
        powerInbox: typeof values.powerInbox === "number" ? values.powerInbox : null,
        cableStart: typeof values.cableStart === "number" ? values.cableStart : 0,
        cableMiddle: typeof values.cableMiddle === "number" ? values.cableMiddle : 0,
        cableEnd: typeof values.cableEnd === "number" ? values.cableEnd : 0,
        ont: typeof values.ont === "string" ? values.ont : null,
        voiceTestNo: typeof values.voiceTestNo === "string" ? values.voiceTestNo : null,
        stb: typeof values.stb === "string" ? values.stb : null,
        ontSerial: typeof values.ontSerial === "string" ? values.ontSerial : null,
        voiceTestNoNew: typeof values.voiceTestNoNew === "string" ? values.voiceTestNoNew : null,
        stbSerial: typeof values.stbSerial === "string" ? values.stbSerial : null,
        phoneNumber: typeof values.phoneNumber === "string" ? values.phoneNumber : null,
        ...(workerIds.length ? { workAssignments: { create: workerIds.map((workerId) => ({ workerId, assignedDate: date, createdById: principal.profile.id })) } } : {}),
      },
      select: { id: true },
    });
    const afterValues = { ...values, telephoneNo, date: date.toISOString().slice(0, 10), status: values.status === "completed" ? "completed" : "in_progress", workerIds };
    await tx.lineDetailsRevision.create({ data: { lineId: created.id, actorProfileId: principal.profile.id, changedFields: Object.keys(afterValues), beforeValues: {}, afterValues: afterValues as Prisma.InputJsonValue } });
    await tx.mobileSyncMutation.create({ data: { sessionId: principal.sessionId!, mutationId, lineId: created.id } });
    await queueLineWrite(created.id, undefined, tx);
    return created.id;
  });
  await processLineWrite(lineId);
  return { status: "synced", lineId };
}

async function applyPatch(principal: NonNullable<Awaited<ReturnType<typeof getMobilePrincipal>>>, mutationId: string, lineId: string, source: unknown, baseSource: unknown) {
  const values = normalizePatch(source);
  if (!values || !Object.keys(values).length) throw new Error("No changes to save");
  if (!baseSource || typeof baseSource !== "object" || Array.isArray(baseSource)) throw new Error("Missing conflict-check values");
  const base = baseSource as Record<string, unknown>;
  for (const key of Object.keys(values)) if (!(key in base)) throw new Error("Missing conflict-check values");
  const result = await prisma.$transaction(async (tx) => {
    const previous = await tx.lineDetails.findUnique({ where: { id: lineId }, include: { workAssignments: { select: { workerId: true } } } });
    if (!previous) throw new Error("ENTRY_NOT_FOUND");
    const current: Record<string, unknown> = {};
    for (const field of Object.keys(values)) {
      if (field === "workerIds") current[field] = previous.workAssignments.map((item) => item.workerId).sort();
      else current[field] = normalizedCurrent((previous as any)[field]);
    }
    const conflicts = Object.keys(values).filter((field) => !sameValue(current[field], base[field]) && !sameValue(current[field], values[field]));
    if (conflicts.length) return { conflict: true, conflictingFields: conflicts, fields: current };
    if (values.status === "completed" && !(values.dp ?? previous.dp)) throw new Error("DP is required before completing an entry");
    const before: Record<string, unknown> = {};
    const after: Record<string, unknown> = {};
    const data: Record<string, unknown> = {};
    const changed: string[] = [];
    for (const [field, value] of Object.entries(values)) {
      if (sameValue(current[field], value)) continue;
      before[field] = current[field]; after[field] = value; changed.push(field);
      if (field !== "workerIds") data[field] = value;
    }
    const workerIds = values.workerIds as string[] | undefined;
    if (workerIds && !sameValue(current.workerIds, workerIds)) {
      const workers = workerIds.length ? await tx.worker.findMany({ where: { id: { in: workerIds }, status: "active" }, select: { id: true } }) : [];
      if (workers.length !== workerIds.length) throw new Error("One or more selected workers are unavailable");
      await tx.workAssignment.deleteMany({ where: { lineId } });
      if (workerIds.length) await tx.workAssignment.createMany({ data: workerIds.map((workerId) => ({ lineId, workerId, assignedDate: previous.date, createdById: principal.profile.id })) });
    }
    if (values.status === "completed" && previous.status !== "completed") data.completedDate = previous.date;
    if (values.status === "in_progress" && previous.status === "completed") data.completedDate = null;
    if (changed.length) {
      await tx.lineDetails.update({ where: { id: lineId }, data: data as any });
      await tx.lineDetailsRevision.create({ data: { lineId, actorProfileId: principal.profile.id, changedFields: changed, beforeValues: before as Prisma.InputJsonValue, afterValues: after as Prisma.InputJsonValue } });
      await queueLineWrite(lineId, changed, tx);
    }
    await tx.mobileSyncMutation.create({ data: { sessionId: principal.sessionId!, mutationId, lineId } });
    return { conflict: false, changed };
  });
  if (result.conflict) return { status: "conflict", fields: result.fields, conflictingFields: result.conflictingFields };
  if (result.changed?.length) await processLineWrite(lineId);
  return { status: "synced", lineId };
}

export async function POST(request: NextRequest) {
  const principal = await getMobilePrincipal(request);
  if (!principal?.sessionId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await request.json();
    if (!Array.isArray(body?.mutations) || body.mutations.length > 25) return NextResponse.json({ error: "Send between 1 and 25 pending changes" }, { status: 400 });
    const results = [];
    const blockedRecords = new Set<string>();
    for (const item of body.mutations) {
      if (!item || typeof item !== "object" || typeof item.mutationId !== "string" || !/^[A-Za-z0-9-]{16,80}$/.test(item.mutationId)) {
        results.push({ mutationId: item?.mutationId ?? null, status: "invalid", error: "Invalid change identifier" });
        continue;
      }
      const recordKey = item.kind === "create" ? item.clientEntryId : item.lineId;
      if (typeof recordKey === "string" && blockedRecords.has(recordKey)) {
        results.push({ mutationId: item.mutationId, status: "held", error: "An earlier change for this entry needs review" });
        continue;
      }
      try {
        const previous = await prisma.mobileSyncMutation.findUnique({ where: { sessionId_mutationId: { sessionId: principal.sessionId, mutationId: item.mutationId } }, select: { lineId: true } });
        if (previous) { results.push({ mutationId: item.mutationId, status: "synced", lineId: previous.lineId, replayed: true }); continue; }
        const result = item.kind === "create"
          ? await applyCreate(principal, item.mutationId, item.data)
          : item.kind === "patch" && typeof item.lineId === "string"
            ? await applyPatch(principal, item.mutationId, item.lineId, item.data, item.baseValues)
            : (() => { throw new Error("Invalid change type"); })();
        results.push({ mutationId: item.mutationId, ...result });
        if ((result.status === "conflict" || result.status === "duplicate") && typeof recordKey === "string") blockedRecords.add(recordKey);
      } catch (error: any) {
        if (error?.message === "DUPLICATE_ENTRY") {
          results.push({ mutationId: item.mutationId, status: "duplicate", existingId: error.existingId });
          if (typeof recordKey === "string") blockedRecords.add(recordKey);
        }
        else if (error?.code === "P2002" && item.kind === "create" && typeof item.data?.telephoneNo === "string") {
          const telephoneNo = normalizePhone(item.data.telephoneNo);
          const date = parseDate(item.data.date);
          const existing = telephoneNo && date ? await prisma.lineDetails.findFirst({ where: { telephoneNo, date }, select: { id: true } }) : null;
          results.push({ mutationId: item.mutationId, status: "duplicate", existingId: existing?.id ?? null });
          if (typeof recordKey === "string") blockedRecords.add(recordKey);
        }
        else if (error?.message === "ENTRY_NOT_FOUND") results.push({ mutationId: item.mutationId, status: "conflict", error: "This entry no longer exists" });
        else results.push({ mutationId: item.mutationId, status: "failed", error: error instanceof Error ? error.message : "Could not sync this change" });
      }
    }
    return NextResponse.json({ results }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Invalid sync request" }, { status: 400 });
  }
}
