import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateMonthlyReportVersion } from "@/lib/monthly-report-service";
import { canManageMonthlyReports } from "@/lib/monthly-report-sharing";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const reports = await prisma.monthlyReport.findMany({
    orderBy: [{ year: "desc" }, { month: "desc" }],
    include: { versions: { orderBy: { version: "desc" }, include: { documents: { select: { id: true, reportType: true, title: true, fileName: true } } } } },
  });
  return NextResponse.json({ data: reports.map(report => ({
    id: report.id, year: report.year, month: report.month, shareActive: report.shareActive, shareRevokedAt: report.shareRevokedAt,
    currentVersionId: report.currentVersionId,
    versions: report.versions.map(version => ({ id: version.id, version: version.version, status: version.status, createdAt: version.createdAt, publishedAt: version.publishedAt, documents: version.documents })),
  })) });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const profile = await prisma.profile.findUnique({ where: { userId: session.user.id }, select: { id: true, role: true } });
  if (!canManageMonthlyReports(profile?.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
    const body = await request.json();
    const year = Number(body.year), month = Number(body.month);
    const result = await generateMonthlyReportVersion({ year, month, createdById: profile!.id });
    if (result.requiresInvoiceGeneration) return NextResponse.json({ code: "INVOICES_REQUIRED", error: "Generate the monthly invoices first, then prepare this report set." }, { status: 409 });
    return NextResponse.json({ data: result }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to prepare reports." }, { status: 400 });
  }
}
