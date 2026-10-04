import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { MONTHLY_SHEET_TIME_ZONE, provisionMonthlySheet } from "@/lib/google-sheet-monthly";
import { currentSheetPeriod } from "@/lib/google-sheet-auto-sync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id || !["admin", "superadmin"].includes(String(session.user.role || "").toLowerCase())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const clock = currentSheetPeriod(MONTHLY_SHEET_TIME_ZONE);
  const period = clock.period;
  const body = await request.json().catch(() => null);
  if (body?.confirmed !== true) {
    return NextResponse.json({ error: "Confirm the current month setup before continuing." }, { status: 400 });
  }

  const [existingConnection, existingRun] = await Promise.all([
    prisma.googleSheetConnection.findFirst({
      where: { year: clock.year, month: clock.month },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      select: { id: true, sheetName: true, sheetUrl: true, status: true, autoSyncEnabled: true, createdAt: true },
    }),
    prisma.googleSheetMonthlyRun.findUnique({ where: { period }, select: { id: true, status: true, fileUrl: true } }),
  ]);
  const expectedConnectionId = typeof body?.expectedConnectionId === "string" ? body.expectedConnectionId : null;
  const expectedRunId = typeof body?.expectedRunId === "string" ? body.expectedRunId : null;
  if (expectedConnectionId !== (existingConnection?.id || null) || expectedRunId !== (existingRun?.id || null)) {
    return NextResponse.json({
      error: "The current-month sheet connection changed while you were confirming. Review the updated connection details and confirm again.",
      refreshRequired: true,
      currentPeriod: period,
      currentConnection: existingConnection,
      currentRun: existingRun,
    }, { status: 409 });
  }

  try {
    const result = await provisionMonthlySheet(period, "", { manual: true });
    return NextResponse.json({ period, ...result });
  } catch (error) {
    const run = await prisma.googleSheetMonthlyRun.findUnique({ where: { period }, select: { id: true, status: true, fileUrl: true } }).catch(() => null);
    return NextResponse.json({ period, runId: run?.id, status: run?.status || "failed", fileUrl: run?.fileUrl || null, error: error instanceof Error ? error.message : "Could not create this month’s sheet." }, { status: 500 });
  }
}
