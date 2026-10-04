import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createOrGetMonthlyShare, revokeMonthlyShare } from "@/lib/monthly-report-service";
import { canManageMonthlyReports } from "@/lib/monthly-report-sharing";

async function permitted(userId: string) {
  const profile = await prisma.profile.findUnique({ where: { userId }, select: { role: true } });
  return canManageMonthlyReports(profile?.role);
}
export async function POST(_request: Request, context: { params: Promise<{ reportId: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!await permitted(session.user.id)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { reportId } = await context.params;
  try { const result = await createOrGetMonthlyShare(reportId); return NextResponse.json({ data: { token: result.token } }); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to create the share link." }, { status: 400 }); }
}
export async function DELETE(_request: Request, context: { params: Promise<{ reportId: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!await permitted(session.user.id)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { reportId } = await context.params;
  try { await revokeMonthlyShare(reportId); return NextResponse.json({ success: true }); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to stop sharing." }, { status: 400 }); }
}
