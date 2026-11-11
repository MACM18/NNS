import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createMobilePairingToken, hashMobilePairingToken, MOBILE_PAIRING_TTL_MS } from "@/lib/mobile-pairing";
import { allowAuthAttempt } from "@/lib/auth-rate-limit";

export async function POST(request: NextRequest) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Sign in to connect a mobile device." }, { status: 401, headers: { "Cache-Control": "no-store" } });
  if (!await allowAuthAttempt(request, "web-mobile-pairing-create", 20)) {
    return NextResponse.json({ error: "Too many mobile connection requests. Please try again later." }, { status: 429, headers: { "Cache-Control": "no-store" } });
  }

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { profile: { select: { id: true } } } });
  if (!user?.profile) return NextResponse.json({ error: "Your NNS profile could not be found." }, { status: 404 });

  const now = new Date();
  const requestId = randomUUID();
  const token = createMobilePairingToken();
  const expiresAt = new Date(now.getTime() + MOBILE_PAIRING_TTL_MS);
  await prisma.$transaction(async (tx) => {
    await tx.mobilePairingRequest.updateMany({
      where: { userId, confirmedAt: null, cancelledAt: null, expiresAt: { gt: now } },
      data: { cancelledAt: now },
    });
    await tx.mobilePairingRequest.deleteMany({ where: { createdAt: { lt: new Date(now.getTime() - 24 * 60 * 60 * 1000) } } });
    await tx.mobilePairingRequest.create({ data: { id: requestId, userId, tokenHash: hashMobilePairingToken(token), expiresAt } });
  }, { isolationLevel: "Serializable" });

  const pairingUrl = new URL("nnsenterprise://pair");
  pairingUrl.searchParams.set("requestId", requestId);
  pairingUrl.searchParams.set("token", token);
  return NextResponse.json({ requestId, expiresAt: expiresAt.toISOString(), pairingUrl: pairingUrl.toString() }, { headers: { "Cache-Control": "no-store" } });
}
