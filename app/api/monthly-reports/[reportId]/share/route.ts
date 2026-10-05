import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createOrGetMonthlyVersionShare, revokeMonthlyVersionShare } from "@/lib/monthly-report-service";
import { canManageMonthlyReports } from "@/lib/monthly-report-sharing";

async function permitted(userId: string) {
  const profile = await prisma.profile.findUnique({ where: { userId }, select: { role: true } });
  return canManageMonthlyReports(profile?.role);
}
async function requestedVersionId(request: Request) {
  const body = await request.json().catch(() => null);
  return typeof body?.versionId === "string" && body.versionId.length > 0 ? body.versionId : null;
}
export async function POST(request: Request, context: { params: Promise<{ reportId: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!await permitted(session.user.id)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const versionId = await requestedVersionId(request);
  if (!versionId) return NextResponse.json({ error: "Choose a report version to share." }, { status: 400 });
  const { reportId } = await context.params;
  try {
    const result = await createOrGetMonthlyVersionShare(reportId, versionId);
    return NextResponse.json({ data: { token: result.token, versionId, shareActive: true } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to create the share link." }, { status: 400 });
  }
}
export async function DELETE(request: Request, context: { params: Promise<{ reportId: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!await permitted(session.user.id)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const versionId = await requestedVersionId(request);
  if (!versionId) return NextResponse.json({ error: "Choose a report version to stop sharing." }, { status: 400 });
  const { reportId } = await context.params;
  try {
    const result = await revokeMonthlyVersionShare(reportId, versionId);
    return NextResponse.json({ data: { versionId, shareActive: false, shareRevokedAt: result.shareRevokedAt } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to stop sharing." }, { status: 400 });
  }
}
