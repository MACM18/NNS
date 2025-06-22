"use client"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { generateMonthlyInvoicesForClients } from "@/lib/invoice-generation"
import { useState } from "react"
import { NotificationService } from "@/lib/notification-service"

interface GenerateMonthlyInvoicesModalProps {
  onInvoicesGenerated?: () => void
}

export function GenerateMonthlyInvoicesModal({ onInvoicesGenerated }: GenerateMonthlyInvoicesModalProps) {
  const [isLoading, setIsLoading] = useState(false)

  const generateInvoices = async () => {
    setIsLoading(true)
    try {
      const generatedInvoices = await generateMonthlyInvoicesForClients()

      for (const invoice of generatedInvoices) {
        const { invoiceNumber, totalAmount } = invoice
        // Create notification for invoice generation
        await NotificationService.createInvoiceGeneratedNotification(invoiceNumber, totalAmount)
      }

      onInvoicesGenerated?.()
    } catch (error) {
      console.error("Error generating invoices:", error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline">Generate Monthly Invoices</Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Generate Monthly Invoices?</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to generate monthly invoices for all clients? This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction disabled={isLoading} onClick={generateInvoices}>
            {isLoading ? "Generating..." : "Generate"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
