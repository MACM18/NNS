import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id || !["admin", "superadmin"].includes(String(session.user.role || "").toLowerCase())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const runs = await prisma.googleSheetMonthlyRun.findMany({
    orderBy: { startedAt: "desc" }, take: 12,
    select: { id: true, period: true, status: true, fileUrl: true, error: true, events: true, startedAt: true, finishedAt: true },
  });
  return NextResponse.json({ runs });
}
