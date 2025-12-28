import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { testEmailConfig } from "@/lib/email-service";
import { decrypt } from "@/lib/encryption";

export async function POST() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user has admin or moderator role
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        email: true,
        profile: {
          select: { role: true },
        },
      },
    });

    const role = user?.profile?.role?.toLowerCase() || "";
    if (!user || !["admin", "moderator"].includes(role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get current email settings
    const settings = await prisma.emailSettings.findFirst({
      where: { isActive: true },
    });

    // Build config from settings or env
    interface EmailConfigData {
      provider: "resend" | "smtp";
      fromEmail: string;
      fromName: string;
      resendApiKey?: string;
      smtpHost?: string;
      smtpPort?: number;
      smtpSecure?: boolean;
      smtpUser?: string;
      smtpPassword?: string;
    }

    let config: EmailConfigData;

    if (settings) {
      config = {
        provider: settings.provider as "resend" | "smtp",
        fromEmail: settings.fromEmail,
        fromName: settings.fromName,
        resendApiKey: settings.resendApiKey
          ? decrypt(settings.resendApiKey)
          : undefined,
        smtpHost: settings.smtpHost || undefined,
        smtpPort: settings.smtpPort || undefined,
        smtpSecure: settings.smtpSecure,
        smtpUser: settings.smtpUser || undefined,
        smtpPassword: settings.smtpPassword
          ? decrypt(settings.smtpPassword)
          : undefined,
      };
    } else {
      // Fall back to environment variables
      config = {
        provider: "resend",
        fromEmail: process.env.EMAIL_FROM || "noreply@nns.lk",
        fromName: process.env.EMAIL_FROM_NAME || "NNS Enterprise",
        resendApiKey: process.env.RESEND_API_KEY,
      };
    }

    // Test the configuration by sending a test email
    const result = await testEmailConfig(config);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Email configuration test failed" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Test email sent successfully",
      provider: config.provider,
    });
  } catch (error) {
    console.error("Error sending test email:", error);
    return NextResponse.json(
      { error: "Failed to send test email" },
      { status: 500 }
    );
  }
}
