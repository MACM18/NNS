import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canManageMonthlyReports } from "@/lib/monthly-report-sharing";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const profile = await prisma.profile.findUnique({ where: { userId: session.user.id }, select: { role: true } });
  if (!canManageMonthlyReports(profile?.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const recipients = await prisma.monthlyReportEmailRecipient.findMany({
      orderBy: { lastSentAt: "desc" },
      take: 50,
      select: { email: true, lastSentAt: true },
    });
    return NextResponse.json({ data: recipients }, { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return NextResponse.json({ error: "Unable to load saved report recipients." }, { status: 500 });
  }
}
