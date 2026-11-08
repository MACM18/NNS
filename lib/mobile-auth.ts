import { createHmac, createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const ACCESS_TTL_SECONDS = 15 * 60;
const REFRESH_TTL_DAYS = 30;

function signingSecret() {
  const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
  if (!secret || secret.length < 32) throw new Error("AUTH_SECRET must be set to issue mobile sessions");
  return secret;
}

function encode(value: unknown) {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

function sign(payload: { sub: string; sid: string; sv: number; iat: number; exp: number }) {
  const input = encode(payload);
  const signature = createHmac("sha256", signingSecret()).update(`nns-mobile-v1.${input}`).digest("base64url");
  return `${input}.${signature}`;
}

export function hashMobileRefreshToken(token: string) {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export async function createMobileSession(userId: string, sessionVersion: number, deviceName?: string | null) {
  const refreshToken = randomBytes(48).toString("base64url");
  const now = new Date();
  const expiresAt = new Date(now.getTime() + REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000);
  const session = await prisma.mobileSession.create({
    data: {
      userId,
      sessionVersion,
      refreshTokenHash: hashMobileRefreshToken(refreshToken),
      deviceName: deviceName?.trim().slice(0, 80) || "Android device",
      expiresAt,
    },
    select: { id: true },
  });
  const iat = Math.floor(now.getTime() / 1000);
  return {
    accessToken: sign({ sub: userId, sid: session.id, sv: sessionVersion, iat, exp: iat + ACCESS_TTL_SECONDS }),
    refreshToken,
    accessTokenExpiresAt: new Date((iat + ACCESS_TTL_SECONDS) * 1000).toISOString(),
    refreshTokenExpiresAt: expiresAt.toISOString(),
  };
}

type AccessClaims = { sub: string; sid: string; sv: number; iat: number; exp: number };

function readAccessToken(token: string): AccessClaims | null {
  if (token.length > 4096) return null;
  const [input, signature, extra] = token.split(".");
  if (!input || !signature || extra) return null;
  const expected = createHmac("sha256", signingSecret()).update(`nns-mobile-v1.${input}`).digest();
  let actual: Buffer;
  try { actual = Buffer.from(signature, "base64url"); } catch { return null; }
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;
  try {
    const claims = JSON.parse(Buffer.from(input, "base64url").toString("utf8")) as AccessClaims;
    const now = Math.floor(Date.now() / 1000);
    if (!claims.sub || !claims.sid || !Number.isInteger(claims.sv) || !Number.isInteger(claims.exp) || claims.exp <= now || claims.iat > now + 60) return null;
    return claims;
  } catch { return null; }
}

export async function getMobilePrincipal(request: Request) {
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) return null;
  const claims = readAccessToken(authorization.slice(7));
  if (!claims) return null;
  const session = await prisma.mobileSession.findUnique({
    where: { id: claims.sid },
    select: {
      id: true, userId: true, expiresAt: true, revokedAt: true,
      user: { select: { sessionVersion: true, profile: { select: { id: true, role: true, fullName: true, email: true } } } },
    },
  });
  if (!session || session.revokedAt || session.expiresAt <= new Date() || session.userId !== claims.sub || session.user.sessionVersion !== claims.sv || !session.user.profile) return null;
  return { userId: session.userId, sessionId: session.id, sessionVersion: claims.sv, profile: session.user.profile };
}

/** Existing browser sessions continue to work; this adds native bearer sessions only for opted-in APIs. */
export async function getApiPrincipal(request: Request) {
  if (request.headers.get("authorization")?.startsWith("Bearer ")) return getMobilePrincipal(request);
  const session = await auth();
  if (!session?.user?.id) return null;
  const profile = await prisma.profile.findUnique({ where: { userId: session.user.id }, select: { id: true, role: true, fullName: true, email: true } });
  return profile ? { userId: session.user.id, sessionId: null, sessionVersion: null, profile } : null;
}

export async function refreshMobileSession(refreshToken: string) {
  if (!refreshToken || refreshToken.length > 256) return null;
  const oldHash = hashMobileRefreshToken(refreshToken);
  const refreshNext = randomBytes(48).toString("base64url");
  const now = new Date();
  const session = await prisma.mobileSession.findUnique({
    where: { refreshTokenHash: oldHash },
    select: { id: true, userId: true, sessionVersion: true, expiresAt: true, revokedAt: true, user: { select: { sessionVersion: true, profile: { select: { id: true, role: true, fullName: true, email: true } } } } },
  });
  if (!session || session.revokedAt || session.expiresAt <= now || !session.user.profile) return null;
  if (session.sessionVersion !== session.user.sessionVersion) {
    await prisma.mobileSession.updateMany({ where: { id: session.id, revokedAt: null }, data: { revokedAt: now } });
    return null;
  }
  const updated = await prisma.mobileSession.updateMany({
    where: { id: session.id, refreshTokenHash: oldHash, revokedAt: null, expiresAt: { gt: now } },
    data: { refreshTokenHash: hashMobileRefreshToken(refreshNext), lastUsedAt: now },
  });
  if (updated.count !== 1) return null;
  const iat = Math.floor(now.getTime() / 1000);
  return {
    sessionId: session.id,
    user: { id: session.userId, email: session.user.profile.email, fullName: session.user.profile.fullName, role: session.user.profile.role },
    accessToken: sign({ sub: session.userId, sid: session.id, sv: session.user.sessionVersion, iat, exp: iat + ACCESS_TTL_SECONDS }),
    refreshToken: refreshNext,
    accessTokenExpiresAt: new Date((iat + ACCESS_TTL_SECONDS) * 1000).toISOString(),
    refreshTokenExpiresAt: session.expiresAt.toISOString(),
  };
}
