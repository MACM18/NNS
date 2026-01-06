import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Server-side cron endpoint to purge old notifications using Prisma.
// Protect with a shared secret header: `x-cron-secret` or `x-vercel-cron-secret`.
// Query params:
// - days: number of days to retain (default 90)
// - onlyRead: if 'true', only delete notifications already marked as read (default true)

export async function GET(req: NextRequest) {
  try {
    const expectedSecret =
      process.env.VERCEL_CRON_SECRET || process.env.CRON_SECRET;

    if (expectedSecret) {
      const provided =
        req.headers.get("x-cron-secret") ||
        req.headers.get("x-vercel-cron-secret");
      if (!provided || provided !== expectedSecret) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    const { searchParams } = new URL(req.url);
    const daysParam = searchParams.get("days");
    const onlyReadParam = searchParams.get("onlyRead");

    const days = Math.max(1, Number(daysParam || 90));
    const onlyRead =
      (onlyReadParam ?? "true").toString().toLowerCase() === "true";

    const threshold = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const where: Record<string, unknown> = {
      created_at: { lt: threshold },
    };
    if (onlyRead) where.is_read = true;

    const result = await prisma.notification.deleteMany({ where });

    return NextResponse.json({
      ok: true,
      deletedCount: result.count,
      days,
      onlyRead,
      threshold,
    });
  } catch (error) {
    console.error("[cron/delete-old-notifications] Error:", error);
    return NextResponse.json({ error: "Cleanup failed" }, { status: 500 });
  }
}

// Prisma requires Node.js runtime; avoid Edge here
export const runtime = "nodejs";
