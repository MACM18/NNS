/**
 * 2FA Status API Route
 * GET: Check 2FA status for current user
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        twoFactorEnabled: true,
        twoFactorBackupCodes: true,
        password: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Count remaining backup codes
    const backupCodesCount = Array.isArray(user.twoFactorBackupCodes)
      ? user.twoFactorBackupCodes.length
      : 0;

    return NextResponse.json({
      success: true,
      data: {
        twoFactorEnabled: user.twoFactorEnabled,
        canEnable2FA: !!user.password, // OAuth users can't enable 2FA
        backupCodesRemaining: user.twoFactorEnabled ? backupCodesCount : null,
        isOAuthUser: !user.password,
      },
    });
  } catch (error) {
    console.error("2FA status error:", error);
    return NextResponse.json(
      { error: "Failed to get 2FA status" },
      { status: 500 }
    );
  }
}
