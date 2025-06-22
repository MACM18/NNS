export interface Notification {
  id: string
  user_id: string
  title: string
  message: string
  type: "info" | "success" | "warning" | "error"
  category: "line_added" | "task_completed" | "invoice_generated" | "report_ready" | "inventory_low" | "system" | "post" | "job"
  is_read: boolean
  action_url?: string
  metadata?: Record<string, any>
  created_at: string
  updated_at: string
}

export interface NotificationContextType {
  notifications: Notification[]
  unreadCount: number
  addNotification: (
    notification: Omit<Notification, "id" | "user_id" | "is_read" | "created_at" | "updated_at">,
  ) => Promise<void>
  markAsRead: (id: string) => Promise<void>
  markAllAsRead: () => Promise<void>
  deleteNotification: (id: string) => Promise<void>
  fetchNotifications: () => Promise<void>
  isLoading: boolean
}
