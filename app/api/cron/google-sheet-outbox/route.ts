import { NextRequest, NextResponse } from "next/server";
import { processPendingLineWrites } from "@/lib/google-sheet-line-sync";
import { processPendingIssuedWrites } from "@/lib/google-sheet-issued-sync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET || process.env.VERCEL_CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const [lines, issued] = await Promise.all([processPendingLineWrites(), processPendingIssuedWrites()]);
  return NextResponse.json({ ok: true, attempted: { lines, issued } });
}
