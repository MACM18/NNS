import { createHash, randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email-service";
import { isValidEmailAddress } from "@/lib/email-validation";
import { allowAuthAttempt } from "@/lib/auth-rate-limit";

const TOKEN_TTL_MS = 30 * 60 * 1000;
const RESEND_COOLDOWN_MS = 2 * 60 * 1000;
const GENERIC_RESPONSE = { message: "If an eligible account exists for that email, a password reset link will arrive shortly." };
const tokenHash = (token: string) => createHash("sha256").update(token).digest("hex");
const escapeHtml = (value: string) => value.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] || c);

function resetBaseUrl(request: NextRequest): string | null {
  const configured = process.env.APP_URL || process.env.NEXTAUTH_URL;
  // In production never build credential-bearing links from a request Host header.
  if (!configured && process.env.NODE_ENV === "production") return null;
  const raw = configured || request.nextUrl.origin;
  try {
    const url = new URL(raw);
    if (process.env.NODE_ENV === "production" && url.protocol !== "https:") return null;
    return url.origin.replace(/\/+$/, "");
  } catch {
    return null;
  }
}

function passwordIsStrongEnough(password: string) {
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  return password.length <= 128 && score >= 3;
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const email = String(body.email || "").trim().toLowerCase();
  if (!isValidEmailAddress(email)) return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });

  try {
    if (!await allowAuthAttempt(request, "password-reset-request", 5)) return NextResponse.json(GENERIC_RESPONSE);
    const user = await prisma.user.findUnique({ where: { email }, select: { id: true, email: true, password: true, profile: { select: { fullName: true } } } });
    const baseUrl = resetBaseUrl(request);
    if (user?.password && baseUrl) {
      const rawToken = randomBytes(32).toString("base64url");
      const now = new Date();
      // Serialize requests per account, including requests handled by different app replicas.
      const created = await prisma.$transaction(async tx => {
        await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${`password-reset:${user.id}`}))`;
        const recent = await tx.passwordResetRequest.findFirst({ where: { userId: user.id, createdAt: { gte: new Date(now.getTime() - RESEND_COOLDOWN_MS) } }, select: { id: true } });
        if (recent) return false;
        await tx.passwordResetRequest.deleteMany({ where: { userId: user.id, usedAt: null } });
        await tx.passwordResetRequest.create({ data: { userId: user.id, tokenHash: tokenHash(rawToken), expiresAt: new Date(now.getTime() + TOKEN_TTL_MS) } });
        return true;
      });
      if (created) {
        const resetUrl = `${baseUrl}/auth/password-update?token=${encodeURIComponent(rawToken)}`;
        const greeting = user.profile?.fullName ? `Hello ${escapeHtml(user.profile.fullName)},` : "Hello,";
        const mail = await sendEmail({
          to: user.email,
          subject: "Reset your NNS Enterprise password",
          preheader: "Use this secure link to choose a new password.",
          html: `<p>${greeting}</p><p>We received a request to reset the password for your NNS Enterprise account.</p><p style="margin:24px 0"><a href="${escapeHtml(resetUrl)}" style="display:inline-block;background:#134160;color:#ffffff;padding:12px 20px;border-radius:5px;text-decoration:none;font-weight:bold">Reset password</a></p><p>If the button does not work, copy this link into your browser:</p><p style="word-break:break-all"><a href="${escapeHtml(resetUrl)}">${escapeHtml(resetUrl)}</a></p><p>This link expires in 30 minutes and can be used once. If you did not request a reset, you can ignore this message.</p>`,
          text: `We received a request to reset your NNS Enterprise password. Open this link within 30 minutes: ${resetUrl}\n\nThe link can be used once. If you did not request a reset, ignore this message.`,
        });
        if (!mail.success) await prisma.passwordResetRequest.deleteMany({ where: { tokenHash: tokenHash(rawToken) } });
      }
    } else if (user?.password && !baseUrl) {
      console.error("Password reset email skipped: APP_URL or NEXTAUTH_URL must be set to a valid HTTPS origin in production.");
    }
  } catch (error) {
    console.error("Password reset request could not be completed:", error);
    // Do not reveal account existence or mail-provider state to the requester.
  }
  return NextResponse.json(GENERIC_RESPONSE);
}

export async function PUT(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const token = String(body.token || "");
  const password = String(body.password || "");
  if (!/^[A-Za-z0-9_-]{40,60}$/.test(token)) return NextResponse.json({ error: "This reset link is invalid or expired. Request a new one." }, { status: 400 });
  if (!passwordIsStrongEnough(password)) return NextResponse.json({ error: "Choose a password with at least 3 of these: 8 or more characters, uppercase letters, numbers, and symbols. Maximum 128 characters." }, { status: 400 });

  try {
    if (!await allowAuthAttempt(request, "password-reset-confirm", 12)) return NextResponse.json({ error: "Too many reset attempts. Please try again later." }, { status: 429 });
    // Check the random token before doing expensive password hashing, so invalid
    // links cannot use bcrypt work as a denial-of-service primitive.
    const candidate = await prisma.passwordResetRequest.findUnique({ where: { tokenHash: tokenHash(token) }, select: { id: true, userId: true, expiresAt: true, usedAt: true } });
    if (!candidate || candidate.usedAt || candidate.expiresAt <= new Date()) return NextResponse.json({ error: "This reset link is invalid or expired. Request a new one." }, { status: 400 });
    const hash = await bcrypt.hash(password, 12);
    const now = new Date();
    const result = await prisma.$transaction(async tx => {
      const claimed = await tx.passwordResetRequest.updateMany({ where: { id: candidate.id, usedAt: null, expiresAt: { gt: now } }, data: { usedAt: now } });
      if (claimed.count !== 1) return false;
      await tx.user.update({ where: { id: candidate.userId }, data: { password: hash, lastPasswordChange: now, sessionVersion: { increment: 1 }, passwordExpireWarned: false, loginAttempts: 0, accountLockedUntil: null } });
      await tx.passwordResetRequest.updateMany({ where: { userId: candidate.userId, id: { not: candidate.id }, usedAt: null }, data: { usedAt: now } });
      return true;
    });
    if (!result) return NextResponse.json({ error: "This reset link is invalid or expired. Request a new one." }, { status: 400 });
    return NextResponse.json({ success: true, message: "Your password has been updated. You can now sign in." });
  } catch (error) {
    console.error("Password reset confirmation failed:", error);
    return NextResponse.json({ error: "Unable to update the password. Request a new reset link." }, { status: 500 });
  }
}
