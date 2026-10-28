import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const RETENTION_DAYS = 90;

export async function GET(req: NextRequest) {
  try {
    const expectedSecret =
      process.env.CRON_SECRET || process.env.VERCEL_CRON_SECRET;

    const authorization = req.headers.get("authorization");
    const provided =
      (authorization?.startsWith("Bearer ") ? authorization.slice(7) : null) ||
      req.headers.get("x-cron-secret") || req.headers.get("x-vercel-cron-secret");
    if (!expectedSecret) {
      console.error("[cron/delete-old-notifications] CRON_SECRET is not configured; refusing unauthenticated cleanup.");
      return NextResponse.json({ error: "Cleanup is not configured" }, { status: 503 });
    }
    if (!provided || provided !== expectedSecret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const threshold = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000);
    const result = await prisma.notification.deleteMany({
      where: { createdAt: { lt: threshold }, isRead: true },
    });
    const unreadPreserved = await prisma.notification.count({
      where: { createdAt: { lt: threshold }, isRead: false },
    });

    return NextResponse.json({
      ok: true,
      deletedCount: result.count,
      retentionDays: RETENTION_DAYS,
      unreadPreserved,
      threshold,
    });
  } catch (error) {
    console.error("[cron/delete-old-notifications] Error:", error);
    return NextResponse.json({ error: "Cleanup failed" }, { status: 500 });
  }
}

// Prisma requires Node.js runtime; avoid Edge here
export const runtime = "nodejs";
