import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function currentUserId() {
  const session = await auth();
  return session?.user?.id || null;
}

export async function GET() {
  const userId = await currentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const sessions = await prisma.mobileSession.findMany({
    where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { lastUsedAt: "desc" },
    select: { id: true, deviceName: true, createdAt: true, lastUsedAt: true, expiresAt: true },
  });
  return NextResponse.json({ sessions }, { headers: { "Cache-Control": "no-store" } });
}

export async function DELETE(request: NextRequest) {
  const userId = await currentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const sessionId = typeof body?.sessionId === "string" ? body.sessionId : "";
  if (!sessionId || sessionId.length > 64) return NextResponse.json({ error: "Select a mobile device to revoke." }, { status: 400 });
  const result = await prisma.mobileSession.updateMany({ where: { id: sessionId, userId, revokedAt: null }, data: { revokedAt: new Date() } });
  if (!result.count) return NextResponse.json({ error: "Mobile device not found or already revoked." }, { status: 404 });
  return NextResponse.json({ success: true }, { headers: { "Cache-Control": "no-store" } });
}
