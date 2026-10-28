import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const params = new URL(req.url).searchParams;
    const requestedLimit = Number.parseInt(params.get("limit") || "100", 10);
    const requestedOffset = Number.parseInt(params.get("offset") || "0", 10);
    const take = Number.isFinite(requestedLimit) ? Math.min(100, Math.max(1, requestedLimit)) : 100;
    const skip = Number.isFinite(requestedOffset) ? Math.min(100_000, Math.max(0, requestedOffset)) : 0;
    const [notifications, unreadCount, totalCount] = await Promise.all([
      prisma.notification.findMany({
        where: { userId: session.user.id },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take,
        skip,
      }),
      prisma.notification.count({ where: { userId: session.user.id, isRead: false } }),
      prisma.notification.count({ where: { userId: session.user.id } }),
    ]);

    // Transform to frontend format
    const transformedNotifications = notifications.map((n) => ({
      id: n.id,
      user_id: n.userId,
      title: n.title,
      message: n.message,
      type: n.type,
      category: n.category,
      is_read: n.isRead,
      action_url: n.actionUrl,
      metadata: n.metadata,
      created_at: n.createdAt,
      updated_at: n.updatedAt,
    }));

    return NextResponse.json({ data: transformedNotifications, unreadCount, totalCount, hasMore: skip + notifications.length < totalCount });
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
    const title = typeof body.title === "string" ? body.title.trim() : "";
    const message = typeof body.message === "string" ? body.message.trim() : "";
    const allowedTypes = ["info", "success", "warning", "error"];
    const allowedCategories = ["line_added", "task_completed", "invoice_generated", "report_ready", "inventory_low", "system", "post", "job"];
    const actionUrl = body.action_url;
    if (!title || title.length > 180 || !message || message.length > 2000) {
      return NextResponse.json({ error: "Enter a title and message within the allowed length." }, { status: 400 });
    }
    if (actionUrl !== undefined && actionUrl !== null &&
      (typeof actionUrl !== "string" || !actionUrl.startsWith("/") || actionUrl.startsWith("//") || actionUrl.includes("\\") || /[\r\n]/.test(actionUrl))) {
      return NextResponse.json({ error: "Notification links must be local to this app." }, { status: 400 });
    }
    const type = allowedTypes.includes(body.type) ? body.type : "info";
    const category = allowedCategories.includes(body.category) ? body.category : "system";
    const metadata = body.metadata && typeof body.metadata === "object" && !Array.isArray(body.metadata) ? body.metadata : {};
    if (JSON.stringify(metadata).length > 8000) {
      return NextResponse.json({ error: "Notification details are too large." }, { status: 400 });
    }

    const notification = await prisma.notification.create({
      data: {
        userId: session.user.id,
        title,
        message,
        type,
        category,
        isRead: false,
        actionUrl,
        metadata,
      },
    });

    return NextResponse.json({
      data: {
        id: notification.id,
        user_id: notification.userId,
        title: notification.title,
        message: notification.message,
        type: notification.type,
        category: notification.category,
        is_read: notification.isRead,
        action_url: notification.actionUrl,
        metadata: notification.metadata,
        created_at: notification.createdAt,
        updated_at: notification.updatedAt,
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
          userId: session.user.id,
          isRead: false,
        },
        data: {
          isRead: true,
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

export async function DELETE(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action");

    if (action === "deleteAll") {
      await prisma.notification.deleteMany({
        where: { userId: session.user.id },
      });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Error deleting notifications:", error);
    return NextResponse.json(
      { error: "Failed to delete notifications" },
      { status: 500 }
    );
  }
}
