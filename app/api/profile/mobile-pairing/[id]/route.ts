import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ id: string }> };

async function ownedRequest(requestId: string) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return { response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }), record: null };
  const record = await prisma.mobilePairingRequest.findFirst({ where: { id: requestId, userId } });
  if (!record) return { response: NextResponse.json({ error: "Pairing request not found." }, { status: 404 }), record: null };
  return { response: null, record };
}

export async function GET(_request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const { response, record } = await ownedRequest(id);
  if (response || !record) return response;
  const now = new Date();
  const status = record.cancelledAt ? "cancelled" : record.confirmedAt ? "connected" : record.expiresAt <= now ? "expired" : record.claimedAt ? "scanned" : "waiting";
  return NextResponse.json({ status, expiresAt: record.expiresAt.toISOString(), deviceName: status === "scanned" || status === "connected" ? record.deviceName : null }, { headers: { "Cache-Control": "no-store" } });
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const { response, record } = await ownedRequest(id);
  if (response || !record) return response;
  if (!record.confirmedAt && !record.cancelledAt) {
    await prisma.mobilePairingRequest.updateMany({ where: { id, userId: record.userId, confirmedAt: null, cancelledAt: null }, data: { cancelledAt: new Date() } });
  }
  return NextResponse.json({ success: true }, { headers: { "Cache-Control": "no-store" } });
}
