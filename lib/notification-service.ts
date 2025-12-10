// NotificationService - Server-side notification creation utilities
// For client-side use, call /api/notifications POST endpoint directly

export class NotificationService {
  /**
   * Creates a notification via the API
   * Note: This should only be called from server-side code (API routes)
   * For client-side, use fetch('/api/notifications', { method: 'POST', ... })
   */
  static async createLineAddedNotification(
    phoneNumber: string,
    customerName: string
  ) {
    return this.createNotification({
      title: "New Line Added",
      message: `Line ${phoneNumber} for ${customerName} has been successfully added`,
      type: "success",
      category: "line_added",
      action_url: "/lines",
      metadata: { phoneNumber, customerName },
    });
  }

  static async createTaskCompletedNotification(
    taskId: string,
    phoneNumber: string
  ) {
    return this.createNotification({
      title: "Task Completed",
      message: `Installation task for ${phoneNumber} has been completed`,
      type: "success",
      category: "task_completed",
      action_url: "/tasks",
      metadata: { taskId, phoneNumber },
    });
  }

  static async createInvoiceGeneratedNotification(
    invoiceNumber: string,
    amount: number
  ) {
    return this.createNotification({
      title: "Invoice Generated",
      message: `Invoice ${invoiceNumber} for LKR ${amount.toLocaleString()} has been generated`,
      type: "info",
      category: "invoice_generated",
      action_url: "/invoices",
      metadata: { invoiceNumber, amount },
    });
  }

  static async createReportReadyNotification(
    reportType: string,
    month: string
  ) {
    return this.createNotification({
      title: "Report Ready",
      message: `${reportType} report for ${month} is ready for download`,
      type: "info",
      category: "report_ready",
      action_url: "/reports",
      metadata: { reportType, month },
    });
  }

  static async createInventoryLowNotification(
    itemName: string,
    currentStock: number
  ) {
    return this.createNotification({
      title: "Low Inventory Alert",
      message: `${itemName} is running low (${currentStock} remaining)`,
      type: "warning",
      category: "inventory_low",
      action_url: "/inventory",
      metadata: { itemName, currentStock },
    });
  }

  static async createSystemNotification(
    title: string,
    message: string,
    type: "info" | "warning" | "error" = "info"
  ) {
    return this.createNotification({
      title,
      message,
      type,
      category: "system",
      action_url: "/dashboard",
    });
  }

  /**
   * Creates a notification via API call
   * This method is designed to be called from client-side code
   */
  private static async createNotification(notification: {
    title: string;
    message: string;
    type: "success" | "info" | "warning" | "error";
    category: string;
    action_url?: string;
    metadata?: Record<string, any>;
  }) {
    try {
      const response = await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...notification,
          is_read: false,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create notification");
      }

      return await response.json();
    } catch (error) {
      console.error("Error creating notification:", error);
    }
  }
}
