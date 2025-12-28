/**
 * Email Settings API Route
 * GET: Retrieve current email settings (Admin/Moderator only)
 * PUT: Update email settings (Admin only)
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { encrypt, decrypt } from "@/lib/encryption";
import { clearEmailConfigCache, testEmailConfig } from "@/lib/email-service";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only Admin and Moderator can view email settings
    if (!["admin", "moderator"].includes(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const settings = await prisma.emailSettings.findFirst({
      where: { isActive: true },
    });

    if (!settings) {
      // Return defaults if no settings exist
      return NextResponse.json({
        success: true,
        data: {
          provider: "resend",
          isActive: true,
          fromEmail: "noreply@nns.lk",
          fromName: "NNS Enterprise",
          resendApiKey: process.env.RESEND_API_KEY ? "***configured***" : "",
          smtpHost: "",
          smtpPort: 587,
          smtpSecure: true,
          smtpUser: "",
          smtpPassword: "",
          hasEnvConfig: !!process.env.RESEND_API_KEY,
        },
      });
    }

    // Mask sensitive values
    return NextResponse.json({
      success: true,
      data: {
        id: settings.id,
        provider: settings.provider,
        isActive: settings.isActive,
        fromEmail: settings.fromEmail,
        fromName: settings.fromName,
        resendApiKey: settings.resendApiKey ? "***configured***" : "",
        smtpHost: settings.smtpHost || "",
        smtpPort: settings.smtpPort || 587,
        smtpSecure: settings.smtpSecure,
        smtpUser: settings.smtpUser || "",
        smtpPassword: settings.smtpPassword ? "***configured***" : "",
        hasEnvConfig: !!process.env.RESEND_API_KEY,
      },
    });
  } catch (error) {
    console.error("Error fetching email settings:", error);
    return NextResponse.json(
      { error: "Failed to fetch email settings" },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only Admin can modify email settings
    if (session.user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const {
      provider,
      fromEmail,
      fromName,
      resendApiKey,
      smtpHost,
      smtpPort,
      smtpSecure,
      smtpUser,
      smtpPassword,
      testOnly, // If true, only test the config without saving
    } = body;

    // Validate required fields
    if (!provider || !["resend", "smtp"].includes(provider)) {
      return NextResponse.json(
        { error: "Invalid email provider" },
        { status: 400 }
      );
    }

    if (!fromEmail) {
      return NextResponse.json(
        { error: "From email is required" },
        { status: 400 }
      );
    }

    // Validate provider-specific fields
    if (
      provider === "resend" &&
      !resendApiKey &&
      resendApiKey !== "***configured***"
    ) {
      return NextResponse.json(
        { error: "Resend API key is required" },
        { status: 400 }
      );
    }

    if (provider === "smtp") {
      if (!smtpHost || !smtpUser) {
        return NextResponse.json(
          { error: "SMTP host and username are required" },
          { status: 400 }
        );
      }
      if (!smtpPassword && smtpPassword !== "***configured***") {
        return NextResponse.json(
          { error: "SMTP password is required" },
          { status: 400 }
        );
      }
    }

    // Get existing settings for preserving encrypted values
    const existingSettings = await prisma.emailSettings.findFirst({
      where: { isActive: true },
    });

    // Prepare data with encryption
    const updateData: Record<string, unknown> = {
      provider,
      fromEmail,
      fromName: fromName || "NNS Enterprise",
      smtpHost: provider === "smtp" ? smtpHost : null,
      smtpPort: provider === "smtp" ? smtpPort || 587 : null,
      smtpSecure: provider === "smtp" ? smtpSecure ?? true : true,
      smtpUser: provider === "smtp" ? smtpUser : null,
      isActive: true,
    };

    // Handle Resend API key
    if (provider === "resend") {
      if (resendApiKey && resendApiKey !== "***configured***") {
        updateData.resendApiKey = encrypt(resendApiKey);
      } else if (existingSettings?.resendApiKey) {
        updateData.resendApiKey = existingSettings.resendApiKey;
      }
    } else {
      updateData.resendApiKey = null;
    }

    // Handle SMTP password
    if (provider === "smtp") {
      if (smtpPassword && smtpPassword !== "***configured***") {
        updateData.smtpPassword = encrypt(smtpPassword);
      } else if (existingSettings?.smtpPassword) {
        updateData.smtpPassword = existingSettings.smtpPassword;
      }
    } else {
      updateData.smtpPassword = null;
    }

    // If testOnly, just test the config
    if (testOnly) {
      // Decrypt existing values if using "***configured***"
      const testConfig: Record<string, unknown> = {
        provider,
        fromEmail,
        fromName: fromName || "NNS Enterprise",
      };

      if (provider === "resend") {
        testConfig.resendApiKey =
          resendApiKey === "***configured***" && existingSettings?.resendApiKey
            ? decrypt(existingSettings.resendApiKey)
            : resendApiKey;
      } else {
        testConfig.smtpHost = smtpHost;
        testConfig.smtpPort = smtpPort || 587;
        testConfig.smtpSecure = smtpSecure ?? true;
        testConfig.smtpUser = smtpUser;
        testConfig.smtpPassword =
          smtpPassword === "***configured***" && existingSettings?.smtpPassword
            ? decrypt(existingSettings.smtpPassword)
            : smtpPassword;
      }

      const testResult = await testEmailConfig(testConfig);

      return NextResponse.json({
        success: testResult.success,
        message: testResult.success
          ? "Test email sent successfully! Check your inbox."
          : `Test failed: ${testResult.error}`,
        testResult,
      });
    }

    // Save settings
    if (existingSettings) {
      await prisma.emailSettings.update({
        where: { id: existingSettings.id },
        data: updateData,
      });
    } else {
      await prisma.emailSettings.create({
        data: updateData as Record<string, unknown> & {
          provider: string;
          fromEmail: string;
        },
      });
    }

    // Clear cache so new settings are used immediately
    clearEmailConfigCache();

    return NextResponse.json({
      success: true,
      message: "Email settings updated successfully",
    });
  } catch (error) {
    console.error("Error updating email settings:", error);
    return NextResponse.json(
      { error: "Failed to update email settings" },
      { status: 500 }
    );
  }
}
