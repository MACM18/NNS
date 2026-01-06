import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

interface NotificationPreferences {
  email_notifications?: boolean;
  push_notifications?: boolean;
  task_reminders?: boolean;
  invoice_alerts?: boolean;
  system_updates?: boolean;
  marketing_emails?: boolean;
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

    // Extract notification preferences from JSON or return defaults
    const preferences = profile.preferences as any;
    const notifications: NotificationPreferences =
      preferences?.notifications || {
        email_notifications: true,
        push_notifications: true,
        task_reminders: true,
        invoice_alerts: true,
        system_updates: false,
        marketing_emails: false,
      };

    return NextResponse.json({ data: notifications });
  } catch (error) {
    console.error("Error fetching notification preferences:", error);
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

    // Validate notification preferences
    const allowedKeys = [
      "email_notifications",
      "push_notifications",
      "task_reminders",
      "invoice_alerts",
      "system_updates",
      "marketing_emails",
    ];

    const notifications: Record<string, unknown> = {};
    for (const key of allowedKeys) {
      if (key in body && typeof body[key] === "boolean") {
        notifications[key] = body[key];
      }
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

    // Merge notification preferences
    const updatedPreferences = {
      ...currentPreferences,
      notifications: {
        ...(currentPreferences.notifications || {}),
        ...notifications,
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
      message: "Notification preferences updated successfully",
      data: notifications,
    });
  } catch (error) {
    console.error("Error updating notification preferences:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
