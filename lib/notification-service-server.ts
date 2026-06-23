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
  html?: string;
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
          html: params.html || `
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
  const lowItems = [];

  for (const item of items) {
    const currentStock = Number(item.currentStock);
    const reorderLevel = Number(item.reorderLevel || 0);

    if (reorderLevel > 0 && currentStock <= reorderLevel) {
      lowItems.push({
        id: item.id,
        name: item.name,
        currentStock,
        reorderLevel,
        unit: item.unit,
      });
    }
  }

  // If no items are low, no notification is needed
  if (lowItems.length === 0) return;

  // Rate-limit check: Max 2 emails/notifications of category "inventory_low" in the last 24 hours
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const recentAlertsCount = await prisma.notification.count({
    where: {
      category: "inventory_low",
      createdAt: {
        gte: twentyFourHoursAgo,
      },
    },
  });

  if (recentAlertsCount >= 2) {
    console.log(`[checkStockLevelsAndNotify] Suppression: Rate limit reached (${recentAlertsCount} low stock alerts sent in the last 24 hours).`);
    return;
  }

  const title = `Low Stock Alert: ${lowItems.length} Item(s) Need Attention`;
  
  // HTML summary table for the email body
  let htmlMessage = `
    <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; border: 1px solid #e5e7eb; border-radius: 8px;">
      <h2 style="color: #dc2626; margin-top: 0; font-size: 20px;">${title}</h2>
      <p style="font-size: 15px; color: #374151; line-height: 1.5;">
        The following items have dropped below their designated reorder thresholds. Please review and place an order soon:
      </p>
      <table style="width: 100%; border-collapse: collapse; margin-top: 15px; margin-bottom: 20px; font-size: 14px;">
        <thead>
          <tr style="border-bottom: 2px solid #e5e7eb; text-align: left; color: #4b5563;">
            <th style="padding: 8px; font-weight: 600;">Item Name</th>
            <th style="padding: 8px; font-weight: 600; text-align: right;">Current Stock</th>
            <th style="padding: 8px; font-weight: 600; text-align: right;">Reorder Level</th>
          </tr>
        </thead>
        <tbody>
  `;

  for (const item of lowItems) {
    htmlMessage += `
      <tr style="border-bottom: 1px solid #f3f4f6;">
        <td style="padding: 8px; color: #111827;">${item.name}</td>
        <td style="padding: 8px; color: #dc2626; font-weight: 600; text-align: right;">${item.currentStock} ${item.unit}</td>
        <td style="padding: 8px; color: #4b5563; text-align: right;">${item.reorderLevel} ${item.unit}</td>
      </tr>
    `;
  }

  htmlMessage += `
        </tbody>
      </table>
      <div style="margin-top: 25px;">
        <a href="${process.env.NEXTAUTH_URL || 'https://nns.lk'}/dashboard/inventory" 
           style="background: #2563eb; color: white; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-weight: 500; display: inline-block;">
          Open Inventory Dashboard
        </a>
      </div>
      <hr style="margin: 25px 0; border: 0; border-top: 1px solid #e5e7eb;" />
      <p style="font-size: 11px; color: #9ca3af; margin-bottom: 0;">
        This is an automated system notification from NNS Enterprise.
      </p>
    </div>
  `;

  // Raw text fallback
  const textMessage = `The following items are low in stock:\n\n` + 
    lowItems.map(item => `- ${item.name}: ${item.currentStock} ${item.unit} (Reorder level: ${item.reorderLevel} ${item.unit})`).join("\n") +
    `\n\nView details: ${process.env.NEXTAUTH_URL || 'https://nns.lk'}/dashboard/inventory`;

  await notifyAllAdmins({
    title,
    message: textMessage,
    html: htmlMessage,
    type: "warning",
    category: "inventory_low",
    actionUrl: "/dashboard/inventory",
    metadata: { items: lowItems },
    sendEmailAlert: true,
  });
}
