import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

interface SecurityPreferences {
  two_factor_enabled?: boolean;
  session_timeout?: string;
  login_alerts?: boolean;
  password_expiry?: string;
}

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const profile = await prisma.profile.findUnique({
      where: { userId: session.user.id },
      select: { preferences: true },
    });

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    // Extract security preferences from JSON or return defaults
    const preferences = profile.preferences as any;
    const security: SecurityPreferences = preferences?.security || {
      two_factor_enabled: false,
      session_timeout: "30",
      login_alerts: true,
      password_expiry: "90",
    };

    return NextResponse.json({ data: security });
  } catch (error) {
    console.error("Error fetching security preferences:", error);
    return NextResponse.json(
      { error: "Internal server error" },
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

    const body = await req.json();

    // Validate security preferences
    const security: Record<string, unknown> = {};

    if (
      "two_factor_enabled" in body &&
      typeof body.two_factor_enabled === "boolean"
    ) {
      security.two_factor_enabled = body.two_factor_enabled;
    }

    if ("session_timeout" in body && typeof body.session_timeout === "string") {
      security.session_timeout = body.session_timeout;
    }

    if ("login_alerts" in body && typeof body.login_alerts === "boolean") {
      security.login_alerts = body.login_alerts;
    }

    if ("password_expiry" in body && typeof body.password_expiry === "string") {
      security.password_expiry = body.password_expiry;
    }

    // Fetch current preferences
    const profile = await prisma.profile.findUnique({
      where: { userId: session.user.id },
      select: { preferences: true },
    });

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    const currentPreferences = (profile.preferences as any) || {};

    // Merge security preferences
    const updatedPreferences = {
      ...currentPreferences,
      security: {
        ...(currentPreferences.security || {}),
        ...security,
      },
    };

    // Update profile with new preferences
    await prisma.profile.update({
      where: { userId: session.user.id },
      data: {
        preferences: updatedPreferences,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      message: "Security preferences updated successfully",
      data: security,
    });
  } catch (error) {
    console.error("Error updating security preferences:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
