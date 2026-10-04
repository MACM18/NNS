import { createHash, randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email-service";
import { isValidEmailAddress } from "@/lib/email-validation";

const TOKEN_TTL_MS = 30 * 60 * 1000;
const RESEND_COOLDOWN_MS = 2 * 60 * 1000;
const GENERIC_RESPONSE = { message: "If an eligible account exists for that email, a password reset link will arrive shortly." };
const tokenHash = (token: string) => createHash("sha256").update(token).digest("hex");
const escapeHtml = (value: string) => value.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] || c);

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const email = String(body.email || "").trim().toLowerCase();
  if (!isValidEmailAddress(email)) return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });

  try {
    const user = await prisma.user.findUnique({ where: { email }, select: { id: true, email: true, password: true, profile: { select: { fullName: true } } } });
    if (user?.password) {
      const since = new Date(Date.now() - RESEND_COOLDOWN_MS);
      const recent = await prisma.passwordResetRequest.findFirst({ where: { userId: user.id, createdAt: { gte: since } }, select: { id: true } });
      if (!recent) {
        const rawToken = randomBytes(32).toString("base64url");
        await prisma.passwordResetRequest.deleteMany({ where: { userId: user.id, usedAt: null } });
        await prisma.passwordResetRequest.create({ data: { userId: user.id, tokenHash: tokenHash(rawToken), expiresAt: new Date(Date.now() + TOKEN_TTL_MS) } });
        const baseUrl = (process.env.APP_URL || request.nextUrl.origin || process.env.NEXTAUTH_URL || "https://nns.lk").replace(/\/+$/, "");
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
  if (password.length < 8 || password.length > 128) return NextResponse.json({ error: "Choose a password between 8 and 128 characters." }, { status: 400 });
  const hash = await bcrypt.hash(password, 12);
  try {
    const result = await prisma.$transaction(async tx => {
      const request = await tx.passwordResetRequest.findUnique({ where: { tokenHash: tokenHash(token) }, select: { id: true, userId: true, expiresAt: true, usedAt: true } });
      if (!request || request.usedAt || request.expiresAt <= new Date()) return false;
      const claimed = await tx.passwordResetRequest.updateMany({ where: { id: request.id, usedAt: null, expiresAt: { gt: new Date() } }, data: { usedAt: new Date() } });
      if (claimed.count !== 1) return false;
      await tx.user.update({ where: { id: request.userId }, data: { password: hash, lastPasswordChange: new Date(), passwordExpireWarned: false, loginAttempts: 0, accountLockedUntil: null } });
      await tx.passwordResetRequest.updateMany({ where: { userId: request.userId, id: { not: request.id }, usedAt: null }, data: { usedAt: new Date() } });
      return true;
    });
    if (!result) return NextResponse.json({ error: "This reset link is invalid or expired. Request a new one." }, { status: 400 });
    return NextResponse.json({ success: true, message: "Your password has been updated. You can now sign in." });
  } catch (error) {
    console.error("Password reset confirmation failed:", error);
    return NextResponse.json({ error: "Unable to update the password. Request a new reset link." }, { status: 500 });
  }
}
