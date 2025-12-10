import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const notifications = await prisma.notification.findMany({
      where: { user_id: session.user.id },
      orderBy: { created_at: "desc" },
      take: 50,
    });

    // Transform to frontend format
    const transformedNotifications = notifications.map((n: any) => ({
      id: n.id,
      user_id: n.user_id,
      title: n.title,
      message: n.message,
      type: n.type,
      category: n.category,
      is_read: n.is_read,
      action_url: n.action_url,
      metadata: n.metadata,
      created_at: n.created_at,
      updated_at: n.updated_at,
    }));

    return NextResponse.json({ data: transformedNotifications });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return NextResponse.json(
      { error: "Failed to fetch notifications" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { title, message, type, category, action_url, metadata } = body;

    const notification = await prisma.notification.create({
      data: {
        user_id: session.user.id,
        title,
        message,
        type: type || "info",
        category: category || "system",
        is_read: false,
        action_url,
        metadata,
      },
    });

    return NextResponse.json({
      data: {
        id: notification.id,
        user_id: notification.user_id,
        title: notification.title,
        message: notification.message,
        type: notification.type,
        category: notification.category,
        is_read: notification.is_read,
        action_url: notification.action_url,
        metadata: notification.metadata,
        created_at: notification.created_at,
        updated_at: notification.updated_at,
      },
    });
  } catch (error) {
    console.error("Error creating notification:", error);
    return NextResponse.json(
      { error: "Failed to create notification" },
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

    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action");

    if (action === "markAllRead") {
      // Mark all as read
      await prisma.notification.updateMany({
        where: {
          user_id: session.user.id,
          is_read: false,
        },
        data: {
          is_read: true,
          updated_at: new Date(),
        },
      });

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Error updating notifications:", error);
    return NextResponse.json(
      { error: "Failed to update notifications" },
      { status: 500 }
    );
  }
}
