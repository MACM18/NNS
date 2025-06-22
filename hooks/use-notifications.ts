import { useNotification } from "@/contexts/notification-context"
import { NotificationService } from "@/lib/notification-service"

export function useNotifications() {
  const { addNotification } = useNotification()

  const notifyLineAdded = async (phoneNumber: string, customerName: string) => {
    await NotificationService.createLineAddedNotification(phoneNumber, customerName)
  }

  const notifyTaskCompleted = async (taskId: string, phoneNumber: string) => {
    await NotificationService.createTaskCompletedNotification(taskId, phoneNumber)
  }

  const notifyInvoiceGenerated = async (invoiceNumber: string, amount: number) => {
    await NotificationService.createInvoiceGeneratedNotification(invoiceNumber, amount)
  }

  const notifyReportReady = async (reportType: string, month: string) => {
    await NotificationService.createReportReadyNotification(reportType, month)
  }

  const notifyInventoryLow = async (itemName: string, currentStock: number) => {
    await NotificationService.createInventoryLowNotification(itemName, currentStock)
  }

  const notifySystem = async (title: string, message: string, type: "info" | "warning" | "error" = "info") => {
    await NotificationService.createSystemNotification(title, message, type)
  }

  const notifySuccess = async (title: string, message: string, actionUrl?: string) => {
    await addNotification({
      title,
      message,
      type: "success",
      category: "system",
      action_url: actionUrl,
    })
  }

  const notifyError = async (title: string, message: string, actionUrl?: string) => {
    await addNotification({
      title,
      message,
      type: "error",
      category: "system",
      action_url: actionUrl,
    })
  }

  const notifyWarning = async (title: string, message: string, actionUrl?: string) => {
    await addNotification({
      title,
      message,
      type: "warning",
      category: "system",
      action_url: actionUrl,
    })
  }

  const notifyInfo = async (title: string, message: string, actionUrl?: string) => {
    await addNotification({
      title,
      message,
      type: "info",
      category: "system",
      action_url: actionUrl,
    })
  }

  return {
    notifyLineAdded,
    notifyTaskCompleted,
    notifyInvoiceGenerated,
    notifyReportReady,
    notifyInventoryLow,
    notifySystem,
    notifySuccess,
    notifyError,
    notifyWarning,
    notifyInfo,
  }
}
