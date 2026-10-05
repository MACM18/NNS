import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { unpublishMonthlyReportVersion } from "@/lib/monthly-report-service";
import { canManageMonthlyReports } from "@/lib/monthly-report-sharing";

export async function POST(request: NextRequest, context: { params: Promise<{ reportId: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const profile = await prisma.profile.findUnique({ where: { userId: session.user.id }, select: { role: true } });
  if (!canManageMonthlyReports(profile?.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { reportId } = await context.params;
  const body = await request.json().catch(() => null);
  if (typeof body?.versionId !== "string" || !body.versionId.trim()) {
    return NextResponse.json({ error: "A report version is required." }, { status: 400 });
  }
  try {
    return NextResponse.json({ data: await unpublishMonthlyReportVersion(reportId, body.versionId) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to unpublish this report." }, { status: 400 });
  }
}
