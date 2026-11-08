import { NextRequest, NextResponse } from "next/server";
import { getMobilePrincipal } from "@/lib/mobile-auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const principal = await getMobilePrincipal(request);
  if (!principal) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const sessions = await prisma.mobileSession.findMany({
    where: { userId: principal.userId, revokedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { lastUsedAt: "desc" },
    select: { id: true, deviceName: true, createdAt: true, lastUsedAt: true, expiresAt: true },
  });
  return NextResponse.json({ currentSessionId: principal.sessionId, sessions }, { headers: { "Cache-Control": "no-store" } });
}

export async function DELETE(request: NextRequest) {
  const principal = await getMobilePrincipal(request);
  if (!principal) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const sessionId = typeof body?.sessionId === "string" ? body.sessionId : principal.sessionId;
  const revoked = await prisma.mobileSession.updateMany({ where: { id: sessionId, userId: principal.userId, revokedAt: null }, data: { revokedAt: new Date() } });
  if (!revoked.count) return NextResponse.json({ error: "Session not found or already revoked" }, { status: 404 });
  return NextResponse.json({ success: true, currentSessionRevoked: sessionId === principal.sessionId });
}
