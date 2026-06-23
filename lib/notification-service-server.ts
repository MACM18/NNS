import { prisma } from "@/lib/prisma";
import { broadcastToUser } from "@/lib/sse-manager";
import { sendEmail } from "@/lib/email-service";

export type NotificationType = "info" | "success" | "warning" | "error";
export type NotificationCategory =
  | "line_added"
  | "task_completed"
  | "invoice_generated"
  | "report_ready"
  | "inventory_low"
  | "system";

export async function createSystemNotification(params: {
  userId: string;
  title: string;
  message: string;
  type?: NotificationType;
  category?: NotificationCategory;
  actionUrl?: string;
  metadata?: any;
}) {
  const notification = await prisma.notification.create({
    data: {
      userId: params.userId,
      title: params.title,
      message: params.message,
      type: params.type || "info",
      category: params.category || "system",
      isRead: false,
      actionUrl: params.actionUrl || null,
      metadata: params.metadata || {},
    },
  });

  // Broadcast to active SSE clients for this user
  broadcastToUser(params.userId, notification);

  return notification;
}

export async function notifyAllAdmins(params: {
  title: string;
  message: string;
  type?: NotificationType;
  category?: NotificationCategory;
  actionUrl?: string;
  metadata?: any;
  sendEmailAlert?: boolean;
}) {
  // Find all admin and moderator users
  const admins = await prisma.profile.findMany({
    where: { role: { in: ["admin", "moderator"] } },
    select: { userId: true, email: true },
  });

  const createdNotifications = [];

  for (const admin of admins) {
    const notification = await createSystemNotification({
      userId: admin.userId,
      title: params.title,
      message: params.message,
      type: params.type,
      category: params.category,
      actionUrl: params.actionUrl,
      metadata: params.metadata,
    });
    createdNotifications.push(notification);

    // Send email alert if requested and admin has email
    if (params.sendEmailAlert && admin.email) {
      try {
        await sendEmail({
          to: admin.email,
          subject: params.title,
          html: `
            <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; border: 1px solid #e5e7eb; border-radius: 8px;">
              <h2 style="color: ${params.type === 'error' ? '#dc2626' : params.type === 'warning' ? '#d97706' : '#2563eb'}; margin-top: 0;">
                ${params.title}
              </h2>
              <p style="font-size: 16px; line-height: 1.5; color: #374151;">${params.message}</p>
              ${params.actionUrl ? `
                <div style="margin-top: 25px;">
                  <a href="${process.env.NEXTAUTH_URL || 'https://nns.lk'}${params.actionUrl}" 
                     style="background: #2563eb; color: white; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-weight: 500;">
                    View Details
                  </a>
                </div>
              ` : ''}
              <hr style="margin: 25px 0; border: 0; border-top: 1px solid #e5e7eb;" />
              <p style="font-size: 12px; color: #6b7280; margin-bottom: 0;">
                This is an automated system notification from NNS Enterprise.
              </p>
            </div>
          `,
          text: `${params.title}\n\n${params.message}${params.actionUrl ? `\n\nLink: ${process.env.NEXTAUTH_URL || 'https://nns.lk'}${params.actionUrl}` : ''}`
        });
      } catch (emailErr) {
        console.error(`Failed to send email alert to ${admin.email}:`, emailErr);
      }
    }
  }

  return createdNotifications;
}

export async function checkStockLevelsAndNotify() {
  const items = await prisma.inventoryItem.findMany();
  const warningThreshold = 24 * 60 * 60 * 1000; // 24 hours rate-limit

  for (const item of items) {
    const currentStock = Number(item.currentStock);
    const reorderLevel = Number(item.reorderLevel || 0);

    if (reorderLevel > 0 && currentStock <= reorderLevel) {
      // Check if low stock notification was already created for this item in last 24h
      const recentNotification = await prisma.notification.findFirst({
        where: {
          category: "inventory_low",
          title: { contains: item.name },
          createdAt: {
            gte: new Date(Date.now() - warningThreshold),
          },
        },
      });

      if (!recentNotification) {
        await notifyAllAdmins({
          title: `Low Stock Alert: ${item.name}`,
          message: `The item "${item.name}" has dropped to ${currentStock} ${item.unit} (Reorder level: ${reorderLevel} ${item.unit}). Please reorder soon.`,
          type: "warning",
          category: "inventory_low",
          actionUrl: "/dashboard/inventory",
          metadata: { itemId: item.id, currentStock, reorderLevel },
          sendEmailAlert: true,
        });
      }
    }
  }
}
