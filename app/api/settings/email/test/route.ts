import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email-service";

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
    if (!user || !["admin", "moderator", "superadmin"].includes(role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!user.email) {
      return NextResponse.json({ error: "Your account does not have an email address to send the test to." }, { status: 400 });
    }

    // Use the active saved configuration (with environment fallback) and send
    // only to the signed-in user's own address.
    const result = await sendEmail({
      to: user.email,
      subject: "NNS Email Configuration Test",
      text: `This is a test email from NNS Enterprise.\n\nSent at: ${new Date().toISOString()}`,
      html: `<div style="font-family: Arial, sans-serif; padding: 20px;"><h2>Email Configuration Test</h2><p>This test message was sent to your signed-in NNS account.</p><p>Sent at: ${new Date().toISOString()}</p></div>`,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: `${result.provider || "Email provider"}: ${result.error || "Email configuration test failed"}` },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Test email sent successfully",
      provider: result.provider,
      sentTo: user.email,
    });
  } catch (error) {
    console.error("Error sending test email:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to send test email" },
      { status: 500 }
    );
  }
}
