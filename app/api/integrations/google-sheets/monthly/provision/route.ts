import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { MONTHLY_SHEET_TIME_ZONE, provisionMonthlySheet } from "@/lib/google-sheet-monthly";
import { currentSheetPeriod } from "@/lib/google-sheet-auto-sync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id || !["admin", "superadmin"].includes(String(session.user.role || "").toLowerCase())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const clock = currentSheetPeriod(MONTHLY_SHEET_TIME_ZONE);
  const period = clock.period;

  try {
    const result = await provisionMonthlySheet(period, "", { manual: true });
    return NextResponse.json({ period, ...result });
  } catch (error) {
    return NextResponse.json({ period, error: error instanceof Error ? error.message : "Could not create this month’s sheet." }, { status: 500 });
  }
}
