import { createHash, randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { authenticator } from "otplib";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { decrypt } from "@/lib/encryption";
import { sendEmail } from "@/lib/email-service";
import { prisma } from "@/lib/prisma";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const REQUEST_TTL_MS = 30 * 60 * 1000;

function normalizeEmail(value: unknown) {
  return String(value || "").trim().toLowerCase();
}

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character] || character);
}

async function getSessionUser() {
  const session = await auth();
  if (!session?.user?.id) return null;
  return prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, email: true, password: true, twoFactorEnabled: true, twoFactorSecret: true },
  });
}

export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const newEmail = normalizeEmail(body.newEmail ?? body.new_email);
    const currentPassword = String(body.currentPassword ?? body.current_password ?? "");
    const twoFactorCode = String(body.twoFactorCode ?? body.two_factor_code ?? "").trim();

    if (!EMAIL_PATTERN.test(newEmail) || newEmail.length > 254) {
      return NextResponse.json({ error: "Enter a valid email address" }, { status: 400 });
    }
    if (newEmail === user.email.toLowerCase()) {
      return NextResponse.json({ error: "The new email must be different from your current email" }, { status: 400 });
    }
    if (user.password) {
      if (!currentPassword || !(await bcrypt.compare(currentPassword, user.password))) {
        return NextResponse.json({ error: "Current password is incorrect" }, { status: 401 });
      }
    }
    if (user.twoFactorEnabled) {
      if (!twoFactorCode || !user.twoFactorSecret || !authenticator.verify({ token: twoFactorCode, secret: decrypt(user.twoFactorSecret) })) {
        return NextResponse.json({ error: "A valid two-factor code is required" }, { status: 401 });
      }
    }

    const conflict = await prisma.user.findUnique({ where: { email: newEmail }, select: { id: true } });
    if (conflict) return NextResponse.json({ error: "That email address is already in use" }, { status: 409 });

    const rawToken = randomBytes(32).toString("hex");
    const tokenHash = createHash("sha256").update(rawToken).digest("hex");
    const expiresAt = new Date(Date.now() + REQUEST_TTL_MS);
    await prisma.$transaction(async (tx) => {
      await tx.emailChangeRequest.deleteMany({ where: { userId: user.id, consumedAt: null } });
      await tx.emailChangeRequest.create({ data: { userId: user.id, newEmail, tokenHash, expiresAt } });
    });

    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const confirmationUrl = `${baseUrl}/dashboard/settings?email_change_token=${rawToken}`;
    const message = {
      subject: "Confirm your NNS Enterprise email change",
      html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto"><h2>Confirm email change</h2><p>Click the link below to change your NNS Enterprise login email to <strong>${escapeHtml(newEmail)}</strong>.</p><p><a href="${confirmationUrl}">Confirm email change</a></p><p>This link expires in 30 minutes. Your current email remains active until confirmation.</p></div>`,
      text: `Confirm your NNS Enterprise email change\n\nOpen this link within 30 minutes: ${confirmationUrl}\n\nYour current email remains active until confirmation.`,
    };
    const result = await sendEmail({ to: newEmail, ...message });
    if (!result.success && process.env.NODE_ENV !== "development") {
      await prisma.emailChangeRequest.deleteMany({ where: { userId: user.id, tokenHash } });
      return NextResponse.json({ error: "The verification email could not be sent. Try again later." }, { status: 503 });
    }

    return NextResponse.json({
      message: "Verification email sent. Your current login email remains active until confirmation.",
      ...(process.env.NODE_ENV === "development" ? { verification_url: confirmationUrl } : {}),
    });
  } catch (error) {
    console.error("Email change request failed:", error);
    return NextResponse.json({ error: "Unable to start email change" }, { status: 500 });
  }
}
