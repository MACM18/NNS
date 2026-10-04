import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
export const runtime = "nodejs";
async function allowed() { const session = await auth(); return Boolean(session?.user?.id && ["admin", "superadmin"].includes(String(session.user.role || "").toLowerCase())); }
export async function GET() {
  if (!(await allowed())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const value = await prisma.googleSheetMonthlySettings.findUnique({ where: { id: "default" } });
  const recentRuns = await prisma.googleSheetMonthlyRun.findMany({ orderBy: { startedAt: "desc" }, take: 8 });
  return NextResponse.json({ connected: Boolean(value?.encryptedRefreshToken), accountEmail: value?.adminEmail || null, enabled: value?.enabled ?? false, templateFileId: value?.templateFileId || "", destinationFolderId: value?.destinationFolderId || "", namePattern: value?.namePattern || "NNS Telecom - {Month} {Year}", editors: value?.editors || [], lastRun: recentRuns[0] || null, recentRuns });
}
export async function PUT(req: NextRequest) {
  if (!(await allowed())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await req.json().catch(() => null);
  const emails = Array.isArray(body?.editors) ? body.editors.map((e: unknown) => String(e).trim().toLowerCase()).filter(Boolean) : null;
  const templateFileId = String(body?.templateFileId || "").trim(); const destinationFolderId = String(body?.destinationFolderId || "").trim();
  const namePattern = String(body?.namePattern || "").trim();
  if (typeof body?.enabled !== "boolean" || !templateFileId || !destinationFolderId || !namePattern.includes("{Month}") || !namePattern.includes("{Year}") || !emails) return NextResponse.json({ error: "Provide a valid template, destination folder, sheet name pattern, and editor emails." }, { status: 400 });
  if (emails.some((e: string) => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.replace(/^group:/i, "")))) return NextResponse.json({ error: "One or more editor email addresses are invalid." }, { status: 400 });
  const existing = await prisma.googleSheetMonthlySettings.findUnique({ where: { id: "default" } });
  if (!existing?.encryptedRefreshToken && body.enabled) return NextResponse.json({ error: "Connect the admin Google Drive account before enabling automation." }, { status: 400 });
  await prisma.googleSheetMonthlySettings.upsert({ where: { id: "default" }, update: { enabled: body.enabled, templateFileId, destinationFolderId, namePattern, clearRanges: [], monthCell: null, balanceMappings: [], editors: emails }, create: { id: "default", enabled: body.enabled, templateFileId, destinationFolderId, namePattern, clearRanges: [], monthCell: null, balanceMappings: [], editors: emails } });
  return NextResponse.json({ ok: true });
}
