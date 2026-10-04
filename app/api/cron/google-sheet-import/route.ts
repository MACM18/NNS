import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { reconcileSheetAutoSync } from "@/lib/google-sheet-auto-sync";
import { syncConnectionForCron } from "@/app/dashboard/integrations/google-sheets/actions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET || process.env.VERCEL_CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { settings, clock, newestConnection } = await reconcileSheetAutoSync();
    if (!settings.enabled || clock.localTime < settings.dailyTime || !newestConnection?.autoSyncEnabled) {
      return NextResponse.json({ ok: true, skipped: "Not due or no current-month sheet selected" });
    }

    // Multiple scheduler instances can hit this endpoint at once. Claim the
    // unique local date without provoking a noisy P2002 Prisma error.
    const claim = await prisma.googleSheetAutoSyncRun.createMany({
      data: [{ localDate: clock.localDate, connectionId: newestConnection.id }],
      skipDuplicates: true,
    });
    if (claim.count === 0) {
      return NextResponse.json({ ok: true, skipped: "Already started today" });
    }
    const run = await prisma.googleSheetAutoSyncRun.findUnique({ where: { localDate: clock.localDate } });
    if (!run) throw new Error("The scheduled import run could not be loaded after claiming today’s run.");

    try {
      const result = await syncConnectionForCron(newestConnection.id, secret);
      await prisma.googleSheetAutoSyncRun.update({
        where: { id: run.id },
        data: { status: "success", finishedAt: new Date() },
      });
      return NextResponse.json({ ok: true, connectionId: newestConnection.id, total: result.total });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await prisma.googleSheetAutoSyncRun.update({
        where: { id: run.id },
        data: { status: "failed", error: message, finishedAt: new Date() },
      });
      console.error("[cron/google-sheet-import] Sync failed:", error);
      return NextResponse.json({ error: "Scheduled import failed" }, { status: 500 });
    }
  } catch (error) {
    console.error("[cron/google-sheet-import] Error:", error);
    return NextResponse.json({ error: "Scheduled import failed" }, { status: 500 });
  }
}
