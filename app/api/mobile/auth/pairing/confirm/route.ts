import { NextRequest, NextResponse } from "next/server";
import { allowAuthAttempt } from "@/lib/auth-rate-limit";
import { createMobileSessionInTransaction } from "@/lib/mobile-auth";
import { matchesMobilePairingToken } from "@/lib/mobile-pairing";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    if (!await allowAuthAttempt(request, "mobile-pairing-confirm", 12)) return NextResponse.json({ error: "Too many QR confirmation attempts. Please wait and try again." }, { status: 429 });
    const body = await request.json().catch(() => null);
    const requestId = typeof body?.requestId === "string" ? body.requestId : "";
    const token = typeof body?.token === "string" ? body.token : "";
    if (!/^[0-9a-f-]{36}$/i.test(requestId) || token.length > 64) return NextResponse.json({ error: "This pairing request is invalid." }, { status: 400 });
    const result = await prisma.$transaction(async (tx) => {
      const pairing = await tx.mobilePairingRequest.findUnique({
        where: { id: requestId },
        select: { id: true, userId: true, tokenHash: true, deviceName: true, expiresAt: true, claimedAt: true, confirmedAt: true, cancelledAt: true, user: { select: { sessionVersion: true, profile: { select: { email: true, fullName: true, role: true } } } } },
      });
      const now = new Date();
      if (!pairing || !matchesMobilePairingToken(token, pairing.tokenHash) || pairing.expiresAt <= now || pairing.cancelledAt || pairing.confirmedAt || !pairing.claimedAt || !pairing.user.profile) return null;
      const consumed = await tx.mobilePairingRequest.updateMany({
        where: { id: pairing.id, tokenHash: pairing.tokenHash, claimedAt: { not: null }, confirmedAt: null, cancelledAt: null, expiresAt: { gt: now } },
        data: { confirmedAt: now },
      });
      if (!consumed.count) return null;
      const tokens = await createMobileSessionInTransaction(pairing.userId, pairing.user.sessionVersion, pairing.deviceName, tx);
      return {
        user: { id: pairing.userId, email: pairing.user.profile.email, fullName: pairing.user.profile.fullName, role: pairing.user.profile.role },
        ...tokens,
      };
    });
    if (!result) return NextResponse.json({ error: "This pairing request expired or was already completed. Create a new QR code on the website." }, { status: 410, headers: { "Cache-Control": "no-store" } });
    return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Mobile QR confirmation failed", error);
    return NextResponse.json({ error: "Unable to connect this device right now. Please create a new QR code and try again." }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}
