import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { authenticator } from "otplib";
import { allowAuthAttempt } from "@/lib/auth-rate-limit";
import { createMobileSession } from "@/lib/mobile-auth";
import { decrypt, verifyBackupCode } from "@/lib/encryption";
import { prisma } from "@/lib/prisma";

authenticator.options = { window: 1 };

async function googleUser(idToken: string) {
  const audiences = [process.env.GOOGLE_OAUTH_CLIENT_ID, process.env.GOOGLE_OAUTH_ANDROID_CLIENT_ID]
    .filter((value): value is string => Boolean(value));
  if (!audiences.length || !idToken || idToken.length > 8192) return null;
  const url = new URL("https://oauth2.googleapis.com/tokeninfo");
  url.searchParams.set("id_token", idToken);
  const response = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(8000) });
  if (!response.ok) return null;
  const claims = await response.json() as { aud?: string; sub?: string; email?: string; email_verified?: string; iss?: string; exp?: string };
  if (!audiences.includes(claims.aud || "") || !claims.sub || !claims.email || claims.email_verified !== "true" || !["accounts.google.com", "https://accounts.google.com"].includes(claims.iss || "") || Number(claims.exp) * 1000 <= Date.now()) return null;

  let account = await prisma.account.findUnique({ where: { provider_providerAccountId: { provider: "google", providerAccountId: claims.sub } }, include: { user: { include: { profile: true } } } });
  if (!account) {
    const user = await prisma.user.findUnique({ where: { email: claims.email.toLowerCase() }, include: { profile: true } });
    if (!user?.profile) return null;
    try {
      account = await prisma.account.create({
        data: { type: "oauth", provider: "google", providerAccountId: claims.sub, userId: user.id },
        include: { user: { include: { profile: true } } },
      });
    } catch {
      account = await prisma.account.findUnique({ where: { provider_providerAccountId: { provider: "google", providerAccountId: claims.sub } }, include: { user: { include: { profile: true } } } });
    }
  }
  return account?.user?.profile ? account.user : null;
}

async function consumeBackupCode(userId: string, rawCode: string) {
  const code = rawCode.replace(/[\s-]/g, "").toUpperCase();
  if (code.length !== 8) return false;
  return prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<Array<{ two_factor_backup_codes: unknown }>>`SELECT two_factor_backup_codes FROM users WHERE id = ${userId} FOR UPDATE`;
    const stored = Array.isArray(rows[0]?.two_factor_backup_codes) ? rows[0].two_factor_backup_codes as string[] : [];
    const formatted = `${code.slice(0, 4)}-${code.slice(4)}`;
    const index = stored.findIndex((hash) => verifyBackupCode(formatted, hash));
    if (index < 0) return false;
    stored.splice(index, 1);
    await tx.user.update({ where: { id: userId }, data: { twoFactorBackupCodes: stored } });
    return true;
  });
}

export async function POST(request: NextRequest) {
  try {
    if (!await allowAuthAttempt(request, "mobile-login", 12)) return NextResponse.json({ error: "Too many sign-in attempts. Try again later." }, { status: 429 });
    const body = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) return NextResponse.json({ error: "Invalid sign-in request" }, { status: 400 });
    const provider = body.provider === "google" ? "google" : "credentials";
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";
    const idToken = typeof body.idToken === "string" ? body.idToken : "";
    const secondFactor = typeof body.twoFactorCode === "string" ? body.twoFactorCode.trim() : "";
    let user = provider === "google"
      ? await googleUser(idToken)
      : email && password
        ? await prisma.user.findUnique({ where: { email }, include: { profile: true } })
        : null;

    if (provider === "credentials") {
      if (user?.accountLockedUntil && user.accountLockedUntil > new Date()) {
        return NextResponse.json({ error: "This account is temporarily locked. Try again later." }, { status: 423 });
      }
      const validPassword = !!user?.password && await bcrypt.compare(password, user.password);
      if (!validPassword || !user) {
        if (user) {
          const attempts = user.loginAttempts + 1;
          await prisma.$transaction([
            prisma.user.update({ where: { id: user.id }, data: { loginAttempts: attempts, ...(attempts >= 5 ? { accountLockedUntil: new Date(Date.now() + 15 * 60 * 1000) } : {}) } }),
            prisma.loginHistory.create({ data: { userId: user.id, success: false, failReason: "invalid_password" } }),
          ]);
        }
        return NextResponse.json({ error: "Email or password is incorrect" }, { status: 401 });
      }
    }

    if (!user?.profile) return NextResponse.json({ error: "This account is not enabled for NNS Enterprise." }, { status: 403 });
    if (user.twoFactorEnabled && user.twoFactorSecret) {
      if (!secondFactor) return NextResponse.json({ twoFactorRequired: true }, { status: 428 });
      let valid = false;
      try { valid = authenticator.verify({ token: secondFactor.replace(/[\s-]/g, "").toUpperCase(), secret: decrypt(user.twoFactorSecret) }); } catch { valid = false; }
      if (!valid) valid = await consumeBackupCode(user.id, secondFactor);
      if (!valid) {
        await prisma.loginHistory.create({ data: { userId: user.id, success: false, failReason: "2fa_failed" } });
        return NextResponse.json({ error: "The verification code is invalid" }, { status: 401 });
      }
    }

    const now = new Date();
    await prisma.$transaction([
      prisma.user.update({ where: { id: user.id }, data: { loginAttempts: 0, accountLockedUntil: null } }),
      prisma.loginHistory.create({ data: { userId: user.id, success: true } }),
    ]);
    const tokens = await createMobileSession(user.id, user.sessionVersion, typeof body.deviceName === "string" ? body.deviceName : null);
    return NextResponse.json({
      user: { id: user.id, email: user.email, fullName: user.profile.fullName, role: user.profile.role },
      ...tokens,
      issuedAt: now.toISOString(),
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Native sign-in failed", error);
    return NextResponse.json({ error: "Unable to sign in right now" }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}
