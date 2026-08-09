import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const token = String(body.token || "").trim();
    if (!token || token.length < 32) return NextResponse.json({ error: "Invalid verification token" }, { status: 400 });
    const tokenHash = createHash("sha256").update(token).digest("hex");

    const change = await prisma.emailChangeRequest.findUnique({ where: { tokenHash } });
    if (!change || change.consumedAt || change.expiresAt <= new Date()) {
      return NextResponse.json({ error: "This verification link is invalid or expired" }, { status: 400 });
    }
    const existing = await prisma.user.findUnique({ where: { email: change.newEmail }, select: { id: true } });
    if (existing && existing.id !== change.userId) {
      return NextResponse.json({ error: "That email address is already in use" }, { status: 409 });
    }

    await prisma.$transaction(async (tx) => {
      const claimed = await tx.emailChangeRequest.updateMany({
        where: { id: change.id, consumedAt: null, expiresAt: { gt: new Date() } },
        data: { consumedAt: new Date() },
      });
      if (claimed.count !== 1) throw new Error("This verification link has already been used");
      await tx.user.update({ where: { id: change.userId }, data: { email: change.newEmail, emailVerified: new Date() } });
      await tx.profile.upsert({
        where: { userId: change.userId },
        update: { email: change.newEmail },
        create: { userId: change.userId, email: change.newEmail },
      });
    });

    return NextResponse.json({ message: "Email address updated successfully. Use the new email on your next login." });
  } catch (error) {
    console.error("Email change confirmation failed:", error);
    return NextResponse.json({ error: "Unable to confirm email change" }, { status: 400 });
  }
}
