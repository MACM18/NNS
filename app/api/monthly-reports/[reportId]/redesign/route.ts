import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canManageMonthlyReports } from "@/lib/monthly-report-sharing";
import { regenerateMonthlyReportDesign } from "@/lib/monthly-report-service";

export async function POST(_request: Request, context: { params: Promise<{ reportId: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const profile = await prisma.profile.findUnique({ where: { userId: session.user.id }, select: { id: true, role: true } });
  if (!canManageMonthlyReports(profile?.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { reportId } = await context.params;
  try {
    return NextResponse.json({ data: await regenerateMonthlyReportDesign(reportId, profile!.id) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to redesign this month’s reports." }, { status: 400 });
  }
}
