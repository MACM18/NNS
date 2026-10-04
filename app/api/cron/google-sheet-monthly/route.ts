import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { monthlyProvisioningDue, provisionMonthlySheet } from "@/lib/google-sheet-monthly";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET || process.env.VERCEL_CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const settings = await prisma.googleSheetMonthlySettings.findUnique({ where: { id: "default" } });
    const due = monthlyProvisioningDue();
    if (!settings?.enabled || !due.due) return NextResponse.json({ ok: true, skipped: "Not due or monthly setup disabled" });
    const result = await provisionMonthlySheet(due.period, secret);
    return NextResponse.json({ ok: true, period: due.period, ...result });
  } catch (error) {
    console.error("[cron/google-sheet-monthly] Provisioning failed", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Monthly sheet provisioning failed" }, { status: 500 });
  }
}
