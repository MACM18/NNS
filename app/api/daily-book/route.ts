import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const editableFields = {
  name: "string",
  address: "string",
  dp: "string",
  powerDp: "number",
  powerInbox: "number",
  cableStart: "number",
  cableMiddle: "number",
  cableEnd: "number",
  ont: "string",
  voiceTestNo: "string",
  stb: "string",
  ontSerial: "string",
  voiceTestNoNew: "string",
  stbSerial: "string",
  phoneNumber: "string",
} as const;

type EditableField = keyof typeof editableFields;

async function getActor() {
  const session = await auth();
  if (!session?.user?.id) return null;
  const profile = await prisma.profile.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });
  return profile;
}

function parseDate(value: string | null) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value ? null : date;
}

function normalizePhone(value: unknown) {
  if (typeof value !== "string") return null;
  const phone = value.trim();
  if (!phone || phone.length > 32) return null;
  return /^\d{5}$/.test(phone) ? `03422${phone}` : phone;
}

function normalizeValues(body: Record<string, unknown>) {
  const values: Record<string, string | number | null> = {};
  for (const field of Object.keys(editableFields) as EditableField[]) {
    if (!(field in body)) continue;
    const value = body[field];
    if (value == null || value === "") {
      values[field] = null;
      continue;
    }
    if (editableFields[field] === "string") {
      if (typeof value !== "string" || value.length > 1000) throw new Error(`Invalid ${field}`);
      values[field] = value.trim() || null;
    } else {
      const numeric = typeof value === "number" ? value : Number(value);
      if (!Number.isFinite(numeric) || numeric < 0 || numeric > 100000000) throw new Error(`Invalid ${field}`);
      values[field] = numeric;
    }
  }
  return values;
}

function jsonValues(values: Record<string, unknown>, fields: string[]) {
  return Object.fromEntries(fields.map((field) => {
    const value = values[field];
    return [field, value instanceof Date ? value.toISOString().slice(0, 10) : value instanceof Prisma.Decimal ? Number(value) : value];
  }));
}

const lineSelect = {
  id: true, date: true, telephoneNo: true, dp: true, name: true, address: true,
  status: true, powerDp: true, powerInbox: true, cableStart: true, cableMiddle: true,
  cableEnd: true, ont: true, voiceTestNo: true, stb: true, ontSerial: true,
  voiceTestNoNew: true, stbSerial: true, phoneNumber: true, createdAt: true, updatedAt: true,
  workAssignments: { include: { worker: { select: { id: true, fullName: true } } }, orderBy: { createdAt: "asc" as const } },
} as const;

function serializeLine(line: any) {
  return {
    ...line,
    date: line.date.toISOString().slice(0, 10),
    powerDp: line.powerDp == null ? "" : Number(line.powerDp),
    powerInbox: line.powerInbox == null ? "" : Number(line.powerInbox),
    cableStart: Number(line.cableStart), cableMiddle: Number(line.cableMiddle), cableEnd: Number(line.cableEnd),
    workAssignments: line.workAssignments.map((assignment: any) => ({
      workerId: assignment.worker.id,
      workerName: assignment.worker.fullName,
    })),
  };
}

export async function GET(req: NextRequest) {
  const actor = await getActor();
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const dateString = req.nextUrl.searchParams.get("date");
  const startDateString = req.nextUrl.searchParams.get("startDate");
  const endDateString = req.nextUrl.searchParams.get("endDate");
  const date = parseDate(dateString);
  const startDate = startDateString ? parseDate(startDateString) : date;
  const endDate = endDateString ? parseDate(endDateString) : date;
  if (!startDate || !endDate || startDate > endDate) return NextResponse.json({ error: "A valid date or date range is required" }, { status: 400 });
  try {
    const [lines, workers] = await Promise.all([
      prisma.lineDetails.findMany({ where: { date: { gte: startDate, lte: endDate } }, orderBy: [{ date: "desc" }, { createdAt: "desc" }], select: lineSelect }),
      prisma.worker.findMany({ where: { status: "active" }, orderBy: { fullName: "asc" }, select: { id: true, fullName: true } }),
    ]);
    return NextResponse.json({ data: lines.map(serializeLine), workers });
  } catch (error) {
    console.error("Daily Book load failed", error);
    return NextResponse.json({ error: "Could not load the Daily Book" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const actor = await getActor();
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  let duplicateKey: { telephoneNo: string; date: Date } | null = null;
  try {
    const body = await req.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    const date = parseDate(typeof body.date === "string" ? body.date : null);
    const telephoneNo = normalizePhone(body.telephoneNo);
    if (!date || !telephoneNo) return NextResponse.json({ error: "Enter a valid date and phone number" }, { status: 400 });
    duplicateKey = { telephoneNo, date };
    const preexisting = await prisma.lineDetails.findFirst({ where: duplicateKey, select: { id: true } });
    if (preexisting) return NextResponse.json({ error: "An entry for this phone and date already exists. Open that entry to continue.", existingId: preexisting.id }, { status: 409 });
    const values = normalizeValues(body);
    const workerIds: string[] = Array.isArray(body.workerIds) ? [...new Set<string>(body.workerIds.filter((id: unknown): id is string => typeof id === "string"))] : [];
    const workers = workerIds.length ? await prisma.worker.findMany({ where: { id: { in: workerIds }, status: "active" }, select: { id: true } }) : [];
    if (workers.length !== workerIds.length) return NextResponse.json({ error: "One or more selected workers are unavailable" }, { status: 400 });
    if (body.status === "completed" && !values.dp) return NextResponse.json({ error: "DP is required before completing an entry" }, { status: 400 });
    const status = body.status === "completed" ? "completed" : "in_progress";
    const line = await prisma.$transaction(async (tx) => {
      const created = await tx.lineDetails.create({
        data: {
          telephoneNo, date, status, dp: typeof values.dp === "string" ? values.dp : null,
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
          ...(workerIds.length ? { workAssignments: { create: workerIds.map((workerId) => ({ worker: { connect: { id: workerId } }, assignedDate: date, createdBy: { connect: { id: actor.id } } })) } } : {}),
        },
        select: { id: true, telephoneNo: true, date: true, status: true, dp: true, name: true, address: true },
      });
      const initial = { ...values, telephoneNo, date: date.toISOString().slice(0, 10), status, workerIds };
      await tx.lineDetailsRevision.create({ data: {
        lineId: created.id, actorProfileId: actor.id,
        changedFields: Object.keys(initial), beforeValues: {},
        afterValues: initial as Prisma.InputJsonValue,
      } });
      return created;
    });
    return NextResponse.json({ data: { ...line, date: line.date.toISOString().slice(0, 10) } }, { status: 201 });
  } catch (error: any) {
    if (error?.code === "P2002") {
      const existing = duplicateKey ? await prisma.lineDetails.findFirst({ where: duplicateKey }) : null;
      return NextResponse.json({ error: "An entry for this phone and date already exists. Open that entry to continue.", existingId: existing?.id ?? null }, { status: 409 });
    }
    if (error instanceof Error && error.message.startsWith("Invalid ")) return NextResponse.json({ error: error.message }, { status: 400 });
    console.error("Daily Book create failed", error);
    return NextResponse.json({ error: "Could not create the Daily Book entry" }, { status: 500 });
  }
}
