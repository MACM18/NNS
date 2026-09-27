import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import {
  reconcileSheetAutoSync,
  SHEET_SYNC_TIME_ZONES,
} from "@/lib/google-sheet-auto-sync";

export const runtime = "nodejs";
const ALLOWED_ROLES = ["admin", "moderator", "superadmin"];

async function authorized() {
  const session = await auth();
  if (!session?.user?.id) return false;
  return ALLOWED_ROLES.includes(String(session.user.role || "").toLowerCase());
}

export async function GET() {
  if (!(await authorized())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { settings, clock, newestConnection } = await reconcileSheetAutoSync();
  const lastRun = await prisma.googleSheetAutoSyncRun.findFirst({ orderBy: { startedAt: "desc" } });
  return NextResponse.json({
    enabled: settings.enabled,
    schedulerConfigured: Boolean(process.env.CRON_SECRET || process.env.VERCEL_CRON_SECRET),
    dailyTime: settings.dailyTime,
    timeZone: settings.timeZone,
    localDate: clock.localDate,
    newestConnection,
    lastRun,
  });
}

export async function PUT(req: NextRequest) {
  if (!(await authorized())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await req.json().catch(() => null);
  const dailyTime = String(body?.dailyTime || "");
  const timeZone = String(body?.timeZone || "");
  if (typeof body?.enabled !== "boolean" || !/^([01]\d|2[0-3]):[0-5]\d$/.test(dailyTime) ||
      !SHEET_SYNC_TIME_ZONES.includes(timeZone as (typeof SHEET_SYNC_TIME_ZONES)[number])) {
    return NextResponse.json({ error: "Select a valid time and time zone." }, { status: 400 });
  }
  const existing = await prisma.googleSheetSyncSettings.findUnique({ where: { id: "default" } });
  await prisma.googleSheetSyncSettings.upsert({
    where: { id: "default" },
    update: {
      enabled: body.enabled,
      dailyTime,
      timeZone,
      ...(existing?.timeZone !== timeZone ? { activePeriod: null } : {}),
    },
    create: { id: "default", enabled: body.enabled, dailyTime, timeZone },
  });
  await reconcileSheetAutoSync();
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: NextRequest) {
  if (!(await authorized())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await req.json().catch(() => null);
  const connectionId = String(body?.connectionId || "");
  if (!connectionId || typeof body?.enabled !== "boolean") {
    return NextResponse.json({ error: "Invalid auto-sync selection." }, { status: 400 });
  }
  const { newestConnection } = await reconcileSheetAutoSync();
  if (newestConnection?.id !== connectionId) {
    return NextResponse.json({ error: "Only the newest sheet for the current month can auto-sync." }, { status: 400 });
  }
  await prisma.googleSheetConnection.update({
    where: { id: connectionId },
    data: { autoSyncEnabled: body.enabled },
  });
  return NextResponse.json({ ok: true });
}
