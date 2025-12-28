/**
 * 2FA Disable API Route
 * POST: Disable 2FA after password verification
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

interface DisableRequestBody {
  password: string;
  code?: string; // Optional TOTP code for extra security
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body: DisableRequestBody = await req.json();
    const { password, code } = body;

    if (!password) {
      return NextResponse.json(
        { error: "Password is required to disable 2FA" },
        { status: 400 }
      );
    }

    // Get user with password
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        password: true,
        twoFactorEnabled: true,
        twoFactorSecret: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (!user.twoFactorEnabled) {
      return NextResponse.json(
        { error: "2FA is not enabled on this account" },
        { status: 400 }
      );
    }

    // Verify password
    if (!user.password) {
      return NextResponse.json(
        { error: "Cannot disable 2FA for OAuth accounts" },
        { status: 400 }
      );
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return NextResponse.json({ error: "Invalid password" }, { status: 401 });
    }

    // Optionally verify TOTP code if provided (extra security)
    if (code && user.twoFactorSecret) {
      const { authenticator } = await import("otplib");
      const { decrypt } = await import("@/lib/encryption");

      const secret = decrypt(user.twoFactorSecret);
      const isValidCode = authenticator.verify({
        token: code.replace(/[-\s]/g, ""),
        secret,
      });

      if (!isValidCode) {
        return NextResponse.json(
          { error: "Invalid 2FA code" },
          { status: 400 }
        );
      }
    }

    // Disable 2FA
    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        twoFactorEnabled: false,
        twoFactorSecret: null,
        twoFactorBackupCodes: { set: [] },
      },
    });

    return NextResponse.json({
      success: true,
      message: "Two-factor authentication has been disabled",
    });
  } catch (error) {
    console.error("2FA disable error:", error);
    return NextResponse.json(
      { error: "Failed to disable 2FA" },
      { status: 500 }
    );
  }
}
