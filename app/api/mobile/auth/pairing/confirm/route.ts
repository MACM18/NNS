import { NextRequest, NextResponse } from "next/server";
import { allowAuthAttempt } from "@/lib/auth-rate-limit";
import { createMobileSessionInTransaction, rotateMobileSessionInTransaction } from "@/lib/mobile-auth";
import { hashMobilePairingDeviceKey, matchesMobilePairingToken } from "@/lib/mobile-pairing";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    if (!await allowAuthAttempt(request, "mobile-pairing-confirm", 12)) return NextResponse.json({ error: "Too many QR confirmation attempts. Please wait and try again." }, { status: 429 });
    const body = await request.json().catch(() => null);
    const requestId = typeof body?.requestId === "string" ? body.requestId : "";
    const token = typeof body?.token === "string" ? body.token : "";
    const deviceKey = typeof body?.deviceKey === "string" ? body.deviceKey : "";
    if (!/^[0-9a-f-]{36}$/i.test(requestId) || token.length > 64 || !/^[a-f0-9]{64}$/i.test(deviceKey)) return NextResponse.json({ error: "This pairing request is invalid." }, { status: 400 });
    const deviceKeyHash = hashMobilePairingDeviceKey(deviceKey);
    const result = await prisma.$transaction(async (tx) => {
      const pairing = await tx.mobilePairingRequest.findUnique({
        where: { id: requestId },
        select: { id: true, userId: true, tokenHash: true, deviceKeyHash: true, deviceName: true, expiresAt: true, claimedAt: true, confirmedAt: true, cancelledAt: true, user: { select: { sessionVersion: true, profile: { select: { email: true, fullName: true, role: true } } } } },
      });
      const now = new Date();
      if (!pairing || !matchesMobilePairingToken(token, pairing.tokenHash) || pairing.cancelledAt || !pairing.claimedAt || pairing.deviceKeyHash !== deviceKeyHash || !pairing.user.profile) return null;

      // If the server committed the pairing but the phone lost the response,
      // rotate the same device's refresh token and return a usable session.
      if (pairing.confirmedAt) {
        const existing = await tx.mobileSession.findUnique({
          where: { pairingRequestId: pairing.id },
          select: { id: true, userId: true, sessionVersion: true, refreshTokenHash: true, expiresAt: true, revokedAt: true },
        });
        if (!existing || existing.revokedAt || existing.expiresAt <= now || existing.sessionVersion !== pairing.user.sessionVersion) return null;
        const tokens = await rotateMobileSessionInTransaction(existing, tx);
        if (!tokens) return null;
        return {
          user: { id: pairing.userId, email: pairing.user.profile.email, fullName: pairing.user.profile.fullName, role: pairing.user.profile.role },
          ...tokens,
        };
      }
      if (pairing.expiresAt <= now) return null;
      const consumed = await tx.mobilePairingRequest.updateMany({
        where: { id: pairing.id, tokenHash: pairing.tokenHash, claimedAt: { not: null }, confirmedAt: null, cancelledAt: null, expiresAt: { gt: now } },
        data: { confirmedAt: now },
      });
      if (!consumed.count) return null;
      const tokens = await createMobileSessionInTransaction(pairing.userId, pairing.user.sessionVersion, pairing.deviceName, tx, pairing.id);
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
