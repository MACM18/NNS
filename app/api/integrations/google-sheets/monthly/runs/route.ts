import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { MONTHLY_SHEET_TIME_ZONE } from "@/lib/google-sheet-monthly";
import { currentSheetPeriod } from "@/lib/google-sheet-auto-sync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id || !["admin", "superadmin"].includes(String(session.user.role || "").toLowerCase())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const current = currentSheetPeriod(MONTHLY_SHEET_TIME_ZONE);
  const [runs, currentConnection] = await Promise.all([
    prisma.googleSheetMonthlyRun.findMany({
      orderBy: { startedAt: "desc" }, take: 12,
      select: { id: true, period: true, status: true, fileUrl: true, error: true, events: true, startedAt: true, finishedAt: true },
    }),
    prisma.googleSheetConnection.findFirst({
      where: { year: current.year, month: current.month },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      select: { id: true, sheetName: true, sheetUrl: true, status: true, autoSyncEnabled: true, createdAt: true },
    }),
  ]);
  return NextResponse.json({ runs, currentPeriod: current.period, currentConnection });
}
