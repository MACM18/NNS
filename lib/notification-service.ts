import { getSupabaseClient } from "@/lib/supabase"

export class NotificationService {
  private static supabase = getSupabaseClient()

  static async createLineAddedNotification(phoneNumber: string, customerName: string) {
    return this.createNotification({
      title: "New Line Added",
      message: `Line ${phoneNumber} for ${customerName} has been successfully added`,
      type: "success",
      category: "line_added",
      action_url: "/lines",
      metadata: { phoneNumber, customerName },
    })
  }

  static async createTaskCompletedNotification(taskId: string, phoneNumber: string) {
    return this.createNotification({
      title: "Task Completed",
      message: `Installation task for ${phoneNumber} has been completed`,
      type: "success",
      category: "task_completed",
      action_url: "/tasks",
      metadata: { taskId, phoneNumber },
    })
  }

  static async createInvoiceGeneratedNotification(invoiceNumber: string, amount: number) {
    return this.createNotification({
      title: "Invoice Generated",
      message: `Invoice ${invoiceNumber} for LKR ${amount.toLocaleString()} has been generated`,
      type: "info",
      category: "invoice_generated",
      action_url: "/invoices",
      metadata: { invoiceNumber, amount },
    })
  }

  static async createReportReadyNotification(reportType: string, month: string) {
    return this.createNotification({
      title: "Report Ready",
      message: `${reportType} report for ${month} is ready for download`,
      type: "info",
      category: "report_ready",
      action_url: "/reports",
      metadata: { reportType, month },
    })
  }

  static async createInventoryLowNotification(itemName: string, currentStock: number) {
    return this.createNotification({
      title: "Low Inventory Alert",
      message: `${itemName} is running low (${currentStock} remaining)`,
      type: "warning",
      category: "inventory_low",
      action_url: "/inventory",
      metadata: { itemName, currentStock },
    })
  }

  static async createSystemNotification(title: string, message: string, type: "info" | "warning" | "error" = "info") {
    return this.createNotification({
      title,
      message,
      type,
      category: "system",
      action_url: "/dashboard",
    })
  }

  private static async createNotification(notification: any) {
    try {
      // Get current user (you might need to adjust this based on your auth setup)
      const {
        data: { user },
      } = await this.supabase.auth.getUser()
      if (!user) return

      const { data, error } = await this.supabase
        .from("notifications")
        .insert({
          ...notification,
          user_id: user.id,
          is_read: false,
        })
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error("Error creating notification:", error)
    }
  }
}
