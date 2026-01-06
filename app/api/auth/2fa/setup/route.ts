/**
 * 2FA Setup API Route
 * POST: Generate TOTP secret and backup codes for 2FA setup
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { authenticator } from "otplib";
import * as QRCode from "qrcode";
import { encrypt, generateBackupCodes } from "@/lib/encryption";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user already has 2FA enabled
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        twoFactorEnabled: true,
        email: true,
        password: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // OAuth users cannot enable 2FA (no password)
    if (!user.password) {
      return NextResponse.json(
        {
          error:
            "OAuth users cannot enable 2FA. Your account is secured by your OAuth provider.",
        },
        { status: 400 }
      );
    }

    if (user.twoFactorEnabled) {
      return NextResponse.json(
        {
          error:
            "2FA is already enabled. Please disable it first to regenerate.",
        },
        { status: 400 }
      );
    }

    // Generate TOTP secret
    const secret = authenticator.generateSecret();

    // Generate otpauth URL for authenticator apps
    const appName = "NNS Enterprise";
    const otpauthUrl = authenticator.keyuri(
      user.email || session.user.email || "user",
      appName,
      secret
    );

    // Generate QR code as data URL
    const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl, {
      width: 256,
      margin: 2,
      color: {
        dark: "#000000",
        light: "#FFFFFF",
      },
    });

    // Generate backup codes
    const backupCodesData = generateBackupCodes(10);
    const plainBackupCodes = backupCodesData.map((c) => c.code);
    const hashedBackupCodes = backupCodesData.map((c) => c.hashedCode);

    // Encrypt and store the secret temporarily (not enabled yet)
    const encryptedSecret = encrypt(secret);

    // Store in session or temporary storage for verification
    // We'll store it in the user record but keep twoFactorEnabled = false
    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        twoFactorSecret: encryptedSecret,
        twoFactorBackupCodes: hashedBackupCodes,
        // Don't enable yet - user must verify first
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        secret, // Show secret once for manual entry
        qrCode: qrCodeDataUrl,
        backupCodes: plainBackupCodes, // Show once - user must save these
        message:
          "Scan the QR code with your authenticator app, then verify with a code to enable 2FA.",
      },
    });
  } catch (error) {
    console.error("2FA setup error:", error);
    return NextResponse.json(
      { error: "Failed to set up 2FA" },
      { status: 500 }
    );
  }
}

/**
 * DELETE: Cancel 2FA setup (before verification)
 */
export async function DELETE(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { twoFactorEnabled: true },
    });

    if (user?.twoFactorEnabled) {
      return NextResponse.json(
        { error: "Use the disable endpoint to remove active 2FA" },
        { status: 400 }
      );
    }

    // Clear pending 2FA setup
    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        twoFactorSecret: null,
        twoFactorBackupCodes: { set: [] },
      },
    });

    return NextResponse.json({
      success: true,
      message: "2FA setup cancelled",
    });
  } catch (error) {
    console.error("2FA cancel error:", error);
    return NextResponse.json(
      { error: "Failed to cancel 2FA setup" },
      { status: 500 }
    );
  }
}
