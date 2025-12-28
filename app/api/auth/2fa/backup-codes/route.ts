/**
 * Regenerate 2FA Backup Codes API Route
 * POST: Generate new backup codes (requires password verification)
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { generateBackupCodes } from "@/lib/encryption";

interface RegenerateRequestBody {
  password: string;
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body: RegenerateRequestBody = await req.json();
    const { password } = body;

    if (!password) {
      return NextResponse.json(
        { error: "Password is required to regenerate backup codes" },
        { status: 400 }
      );
    }

    // Get user
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        password: true,
        twoFactorEnabled: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (!user.twoFactorEnabled) {
      return NextResponse.json(
        { error: "2FA must be enabled to regenerate backup codes" },
        { status: 400 }
      );
    }

    // Verify password
    if (!user.password) {
      return NextResponse.json(
        { error: "Cannot regenerate backup codes for OAuth accounts" },
        { status: 400 }
      );
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return NextResponse.json({ error: "Invalid password" }, { status: 401 });
    }

    // Generate new backup codes
    const backupCodesData = generateBackupCodes(10);
    const plainBackupCodes = backupCodesData.map((c) => c.code);
    const hashedBackupCodes = backupCodesData.map((c) => c.hashedCode);

    // Update user with new backup codes
    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        twoFactorBackupCodes: hashedBackupCodes,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        backupCodes: plainBackupCodes, // Show once - user must save these
        message:
          "New backup codes generated. Save these codes in a secure location.",
      },
    });
  } catch (error) {
    console.error("Backup codes regeneration error:", error);
    return NextResponse.json(
      { error: "Failed to regenerate backup codes" },
      { status: 500 }
    );
  }
}
