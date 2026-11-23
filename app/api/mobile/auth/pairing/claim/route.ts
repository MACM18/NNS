import { NextRequest, NextResponse } from "next/server";
import { allowAuthAttempt } from "@/lib/auth-rate-limit";
import { hashMobilePairingDeviceKey, matchesMobilePairingToken } from "@/lib/mobile-pairing";
import { prisma } from "@/lib/prisma";

function readPairingInput(body: any) {
  return {
    requestId: typeof body?.requestId === "string" ? body.requestId : "",
    token: typeof body?.token === "string" ? body.token : "",
    deviceName: typeof body?.deviceName === "string" ? body.deviceName.trim().slice(0, 80) : "NNS Enterprise Android",
    deviceKey: typeof body?.deviceKey === "string" ? body.deviceKey : "",
  };
}

export async function POST(request: NextRequest) {
  try {
    if (!await allowAuthAttempt(request, "mobile-pairing-claim", 20)) return NextResponse.json({ error: "Too many QR attempts. Please wait a little and try again." }, { status: 429 });
    const input = readPairingInput(await request.json().catch(() => null));
    if (!/^[0-9a-f-]{36}$/i.test(input.requestId) || input.token.length > 64 || !/^[a-f0-9]{64}$/i.test(input.deviceKey)) return NextResponse.json({ error: "This QR code is invalid or has expired. Create a new one on the website." }, { status: 400 });
    const deviceKeyHash = hashMobilePairingDeviceKey(input.deviceKey);
    const pairing = await prisma.mobilePairingRequest.findUnique({
      where: { id: input.requestId },
      select: { id: true, userId: true, tokenHash: true, deviceKeyHash: true, expiresAt: true, claimedAt: true, confirmedAt: true, cancelledAt: true, user: { select: { profile: { select: { fullName: true, email: true } } } } },
    });
    const now = new Date();
    if (!pairing || !matchesMobilePairingToken(input.token, pairing.tokenHash) || pairing.expiresAt <= now || pairing.cancelledAt || pairing.confirmedAt || !pairing.user.profile) {
      return NextResponse.json({ error: "This QR code has expired or was already used. Create a fresh code on the website." }, { status: 410 });
    }
    if (pairing.deviceKeyHash && pairing.deviceKeyHash !== deviceKeyHash) return NextResponse.json({ error: "This QR code has already been claimed by another phone. Create a fresh code on the website." }, { status: 409, headers: { "Cache-Control": "no-store" } });
    // Android may lose the response even after the server records the scan.
    // Let this app installation retry, while preventing another device from
    // taking over the same pairing request.
    if (!pairing.claimedAt) {
      const claimed = await prisma.mobilePairingRequest.updateMany({
        where: { id: pairing.id, tokenHash: pairing.tokenHash, claimedAt: null, deviceKeyHash: null, confirmedAt: null, cancelledAt: null, expiresAt: { gt: now } },
        data: { claimedAt: now, deviceName: input.deviceName || "NNS Enterprise Android", deviceKeyHash },
      });
      if (!claimed.count) {
        const latest = await prisma.mobilePairingRequest.findUnique({
          where: { id: pairing.id },
          select: { claimedAt: true, deviceKeyHash: true, confirmedAt: true, cancelledAt: true, expiresAt: true },
        });
        if (!latest?.claimedAt || latest.deviceKeyHash !== deviceKeyHash || latest.confirmedAt || latest.cancelledAt || latest.expiresAt <= new Date()) {
          return NextResponse.json({ error: "This QR code is no longer active. Create a fresh code on the website." }, { status: 409 });
        }
      }
    }
    return NextResponse.json({ fullName: pairing.user.profile.fullName, email: pairing.user.profile.email }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Mobile QR claim failed", error);
    return NextResponse.json({ error: "Unable to verify this QR code right now. Please try again." }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}
