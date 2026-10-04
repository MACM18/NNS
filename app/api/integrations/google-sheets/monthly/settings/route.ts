import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
export const runtime = "nodejs";
async function allowed() { const session = await auth(); return Boolean(session?.user?.id && ["admin", "superadmin"].includes(String(session.user.role || "").toLowerCase())); }
export async function GET() {
  if (!(await allowed())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const value = await prisma.googleSheetMonthlySettings.findUnique({ where: { id: "default" } });
  const lastRun = await prisma.googleSheetMonthlyRun.findFirst({ orderBy: { startedAt: "desc" } });
  return NextResponse.json({ connected: Boolean(value?.encryptedRefreshToken), accountEmail: value?.adminEmail || null, enabled: value?.enabled ?? false, templateFileId: value?.templateFileId || "", destinationFolderId: value?.destinationFolderId || "", namePattern: value?.namePattern || "NNS Telecom - {Month} {Year}", clearRanges: value?.clearRanges || [], monthCell: value?.monthCell || "", balanceMappings: value?.balanceMappings || [], editors: value?.editors || [], lastRun });
}
export async function PUT(req: NextRequest) {
  if (!(await allowed())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await req.json().catch(() => null);
  const emails = Array.isArray(body?.editors) ? body.editors.map((e: unknown) => String(e).trim().toLowerCase()).filter(Boolean) : null;
  const clearRanges = Array.isArray(body?.clearRanges) && body.clearRanges.every((e: unknown) => typeof e === "string" && /^[^!]+![A-Z]+[0-9]+(?::[A-Z]+[0-9]+)?$/i.test(e.trim())) ? body.clearRanges.map((e: string) => e.trim()) : null;
  const mappings = Array.isArray(body?.balanceMappings) && body.balanceMappings.every((e: any) => e && typeof e.sourceRange === "string" && typeof e.destinationRange === "string" && /^[^!]+![A-Z]+[0-9]+(?::[A-Z]+[0-9]+)?$/i.test(e.sourceRange) && /^[^!]+![A-Z]+[0-9]+(?::[A-Z]+[0-9]+)?$/i.test(e.destinationRange)) ? body.balanceMappings : null;
  const templateFileId = String(body?.templateFileId || "").trim(); const destinationFolderId = String(body?.destinationFolderId || "").trim();
  const namePattern = String(body?.namePattern || "").trim(); const monthCell = String(body?.monthCell || "").trim();
  if (typeof body?.enabled !== "boolean" || !templateFileId || !destinationFolderId || !namePattern.includes("{Month}") || !namePattern.includes("{Year}") || !clearRanges || !mappings || !emails || (monthCell && !/^[^!]+![A-Z]+[0-9]+$/i.test(monthCell))) return NextResponse.json({ error: "Provide valid template, folder, name pattern, clear ranges, month cell, mappings, and editor emails." }, { status: 400 });
  if (emails.some((e: string) => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.replace(/^group:/i, "")))) return NextResponse.json({ error: "One or more editor email addresses are invalid." }, { status: 400 });
  const existing = await prisma.googleSheetMonthlySettings.findUnique({ where: { id: "default" } });
  if (!existing?.encryptedRefreshToken && body.enabled) return NextResponse.json({ error: "Connect the admin Google Drive account before enabling automation." }, { status: 400 });
  await prisma.googleSheetMonthlySettings.upsert({ where: { id: "default" }, update: { enabled: body.enabled, templateFileId, destinationFolderId, namePattern, clearRanges, monthCell: monthCell || null, balanceMappings: mappings, editors: emails }, create: { id: "default", enabled: body.enabled, templateFileId, destinationFolderId, namePattern, clearRanges, monthCell: monthCell || null, balanceMappings: mappings, editors: emails } });
  return NextResponse.json({ ok: true });
}
