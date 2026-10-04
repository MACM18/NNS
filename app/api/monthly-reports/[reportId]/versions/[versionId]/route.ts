import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canManageMonthlyReports } from "@/lib/monthly-report-sharing";
import { deleteMonthlyReportVersion } from "@/lib/monthly-report-service";

export async function DELETE(_request: Request, context: { params: Promise<{ reportId: string; versionId: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const profile = await prisma.profile.findUnique({ where: { userId: session.user.id }, select: { id: true, role: true } });
  if (!canManageMonthlyReports(profile?.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { reportId, versionId } = await context.params;
  try {
    return NextResponse.json({ data: await deleteMonthlyReportVersion(reportId, versionId) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to delete this report version." }, { status: 400 });
  }
}
