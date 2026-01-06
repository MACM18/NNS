/**
 * 2FA Verify API Route
 * POST: Verify TOTP code to enable 2FA or complete login
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { authenticator } from "otplib";
import { decrypt, verifyBackupCode } from "@/lib/encryption";

// Configure otplib
authenticator.options = {
  window: 1, // Allow 1 step before/after for clock drift
};

interface VerifyRequestBody {
  code: string;
  purpose: "setup" | "login";
  userId?: string; // Only for login purpose (from temp session)
}

export async function POST(req: NextRequest) {
  try {
    const body: VerifyRequestBody = await req.json();
    const { code, purpose, userId: loginUserId } = body;

    if (!code) {
      return NextResponse.json(
        { error: "Verification code is required" },
        { status: 400 }
      );
    }

    // Clean the code (remove dashes and spaces)
    const cleanCode = code.replace(/[-\s]/g, "").toUpperCase();

    let userId: string;

    if (purpose === "setup") {
      // For setup, use current session
      const session = await auth();
      if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      userId = session.user.id;
    } else if (purpose === "login" && loginUserId) {
      // For login, use the userId passed from login flow
      userId = loginUserId;
    } else {
      return NextResponse.json(
        { error: "Invalid verification context" },
        { status: 400 }
      );
    }

    // Get user's 2FA data
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        twoFactorSecret: true,
        twoFactorEnabled: true,
        twoFactorBackupCodes: true,
      },
    });

    if (!user?.twoFactorSecret) {
      return NextResponse.json(
        { error: "2FA is not configured for this account" },
        { status: 400 }
      );
    }

    // Decrypt the secret
    const secret = decrypt(user.twoFactorSecret);

    // First, try to verify as TOTP code
    const isValidTotp = authenticator.verify({
      token: cleanCode,
      secret,
    });

    if (isValidTotp) {
      if (purpose === "setup") {
        // Enable 2FA after successful verification
        await prisma.user.update({
          where: { id: userId },
          data: { twoFactorEnabled: true },
        });

        return NextResponse.json({
          success: true,
          message: "Two-factor authentication has been enabled successfully",
        });
      } else {
        // Login verification successful
        return NextResponse.json({
          success: true,
          message: "2FA verification successful",
          verified: true,
        });
      }
    }

    // If not a valid TOTP, check if it's a backup code
    if (cleanCode.length === 8 || cleanCode.includes("-")) {
      const backupCodes = (user.twoFactorBackupCodes as string[]) || [];

      // Format code properly for comparison
      const formattedCode =
        cleanCode.length === 8
          ? `${cleanCode.slice(0, 4)}-${cleanCode.slice(4)}`
          : cleanCode;

      for (let i = 0; i < backupCodes.length; i++) {
        if (verifyBackupCode(formattedCode, backupCodes[i])) {
          // Remove the used backup code
          const updatedCodes = [...backupCodes];
          updatedCodes.splice(i, 1);

          await prisma.user.update({
            where: { id: userId },
            data: { twoFactorBackupCodes: updatedCodes },
          });

          if (purpose === "setup") {
            // Enable 2FA with backup code
            await prisma.user.update({
              where: { id: userId },
              data: { twoFactorEnabled: true },
            });

            return NextResponse.json({
              success: true,
              message:
                "Two-factor authentication enabled. Note: You used a backup code.",
              backupCodeUsed: true,
              remainingBackupCodes: updatedCodes.length,
            });
          } else {
            return NextResponse.json({
              success: true,
              message: "2FA verification successful (backup code used)",
              verified: true,
              backupCodeUsed: true,
              remainingBackupCodes: updatedCodes.length,
            });
          }
        }
      }
    }

    // Invalid code
    return NextResponse.json(
      { error: "Invalid verification code" },
      { status: 400 }
    );
  } catch (error) {
    console.error("2FA verification error:", error);
    return NextResponse.json(
      { error: "Failed to verify 2FA code" },
      { status: 500 }
    );
  }
}
