"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, Download, Eye, RefreshCw } from "lucide-react"
import { GenerateMonthlyInvoicesModal } from "@/components/modals/generate-monthly-invoices-modal"
import { InvoicePdfModal } from "@/components/modals/invoice-pdf-modal"
import { supabase } from "@/lib/supabase"
import { toast } from "@/hooks/use-toast"
import { MonthYearPicker } from "@/components/ui/month-year-picker"

interface GeneratedInvoice {
  id: string
  customer_name: string
  invoice_date: string
  due_date: string
  total_amount: number
  status: string
  job_month: string
}

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<GeneratedInvoice[]>([])
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false)
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false)
  const [selectedInvoice, setSelectedInvoice] = useState<GeneratedInvoice | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date())

  useEffect(() => {
    fetchInvoices()
  }, [selectedMonth])

  const fetchInvoices = async () => {
    setLoading(true)
    setError(null)
    const year = selectedMonth.getFullYear()
    const month = selectedMonth.getMonth() + 1 // Month is 0-indexed

    const startDate = `${year}-${month.toString().padStart(2, "0")}-01`
    const endDate = `${year}-${month.toString().padStart(2, "0")}-${new Date(year, month, 0).getDate()}`

    const { data, error } = await supabase
      .from("generated_invoices")
      .select("*")
      .gte("job_month", startDate)
      .lte("job_month", endDate)
      .order("invoice_date", { ascending: false })

    if (error) {
      console.error("Error fetching invoices:", error)
      setError("Failed to load invoices.")
      toast({
        title: "Error",
        description: "Failed to load invoices.",
        variant: "destructive",
      })
    } else {
      setInvoices(data as GeneratedInvoice[])
    }
    setLoading(false)
  }

  const handleViewPdf = (invoice: GeneratedInvoice) => {
    setSelectedInvoice(invoice)
    setIsPdfModalOpen(true)
  }

  const handleDownloadPdf = (invoice: GeneratedInvoice) => {
    // In a real application, you would generate and download the PDF here.
    // For now, we'll just show a toast.
    toast({
      title: "Download Initiated",
      description: `Downloading invoice ${invoice.id}. (Mock)`,
    })
    console.log("Downloading invoice:", invoice)
  }

  if (loading) {
    return (
      <div className="p-8">
        <p>Loading invoices...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-8">
        <p className="text-red-500">{error}</p>
        <Button onClick={fetchInvoices}>Retry</Button>
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Invoices</h2>
        <div className="flex items-center space-x-2">
          <MonthYearPicker date={selectedMonth} onDateChange={setSelectedMonth} />
          <Button variant="outline" size="sm" onClick={fetchInvoices} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button onClick={() => setIsGenerateModalOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Generate Monthly Invoices
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {invoices.length === 0 ? (
          <p className="col-span-full text-center text-muted-foreground">No invoices found for this month.</p>
        ) : (
          invoices.map((invoice) => (
            <Card key={invoice.id}>
              <CardHeader>
                <CardTitle>{invoice.customer_name}</CardTitle>
                <CardDescription>Invoice ID: {invoice.id.substring(0, 8)}...</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p>
                  <strong>Invoice Date:</strong> {new Date(invoice.invoice_date).toLocaleDateString()}
                </p>
                <p>
                  <strong>Due Date:</strong> {new Date(invoice.due_date).toLocaleDateString()}
                </p>
                <p>
                  <strong>Total Amount:</strong>{" "}
                  {new Intl.NumberFormat("en-LK", { style: "currency", currency: "LKR" }).format(invoice.total_amount)}
                </p>
                <p>
                  <strong>Status:</strong> {invoice.status}
                </p>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" size="sm" onClick={() => handleViewPdf(invoice)}>
                    <Eye className="h-4 w-4 mr-2" /> View PDF
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => handleDownloadPdf(invoice)}>
                    <Download className="h-4 w-4 mr-2" /> Download
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <GenerateMonthlyInvoicesModal
        open={isGenerateModalOpen}
        onOpenChange={setIsGenerateModalOpen}
        onSuccess={() => {
          setIsGenerateModalOpen(false)
          fetchInvoices() // Refresh invoices after generation
        }}
      />

      {selectedInvoice && (
        <InvoicePdfModal open={isPdfModalOpen} onOpenChange={setIsPdfModalOpen} invoice={selectedInvoice} />
      )}
    </div>
  )
}
