"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Download } from "lucide-react"
import { getSupabaseClient } from "@/lib/supabase"
import { useNotification } from "@/contexts/notification-context"
import { InvoicePdfTemplate } from "@/components/invoice/invoice-pdf-template"
import { toast } from "@/hooks/use-toast"

interface GeneratedInvoice {
  id: string
  invoice_number: string
  invoice_type: "A" | "B" | "C"
  month: number
  year: number
  job_month: string
  invoice_date: string
  total_amount: number
  line_count: number
  line_details_ids: string[]
  status: string
  created_at: string
}

interface InvoicePDFModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  invoice: GeneratedInvoice | null
}

interface LineDetail {
  id: string
  name: string
  phone_number: string
  total_cable: number
  date: string
  address: string
}

interface CompanySettings {
  company_name: string
  address: string
  contact_numbers: string[]
  website: string
  registered_number: string
  bank_details: {
    bank_name: string
    account_title: string
    account_number: string
    branch_code: string
  }
  pricing_tiers: Array<{
    min_length: number
    max_length: number
    rate: number
  }>
}

export function InvoicePDFModal({ open, onOpenChange, invoice }: InvoicePDFModalProps) {
  const [loading, setLoading] = useState(false)
  const [lineDetails, setLineDetails] = useState<LineDetail[]>([])
  const [companySettings, setCompanySettings] = useState<CompanySettings | null>(null)
  const [pricingTiers, setPricingTiers] = useState<any[]>([])

  const supabase = getSupabaseClient()
  const { addNotification } = useNotification()

  useEffect(() => {
    if (open && invoice) {
      fetchInvoiceData()
    }
  }, [open, invoice])

  const fetchInvoiceData = async () => {
    if (!invoice) return

    setLoading(true)
    try {
      // Fetch line details
      const { data: lines, error: linesError } = await supabase
        .from("line_details")
        .select("id, name, phone_number, total_cable, date, address")
        .in("id", invoice.line_details_ids)

      if (linesError) throw linesError

      // Fetch company settings
      const { data: settings, error: settingsError } = await supabase.from("company_settings").select("*").single()

      if (settingsError && settingsError.code !== "PGRST116") {
        throw settingsError
      }

      setLineDetails(lines || [])

      if (settings) {
        const parsedSettings = settings
        if (typeof settings.pricing_tiers === "string") {
          try {
            parsedSettings.pricing_tiers = JSON.parse(settings.pricing_tiers)
          } catch {
            parsedSettings.pricing_tiers = getDefaultPricingTiers()
          }
        }
        setCompanySettings(parsedSettings)
        setPricingTiers(parsedSettings.pricing_tiers || getDefaultPricingTiers())
      } else {
        setCompanySettings(getDefaultCompanySettings())
        setPricingTiers(getDefaultPricingTiers())
      }
    } catch (error: any) {
      console.error("Error fetching invoice data:", error)
      addNotification({
        title: "Error",
        message: "Failed to load invoice data",
        type: "error",
      })
    } finally {
      setLoading(false)
    }
  }

  const getDefaultCompanySettings = (): CompanySettings => ({
    company_name: "NNS Enterprise",
    address: "No 89, Welikala, Pokunuwita",
    contact_numbers: ["0789070440", "0724918351", "0942263642"],
    website: "nns.lk",
    registered_number: "SLTS-OSP-2023-170",
    bank_details: {
      bank_name: "Sampath Bank",
      account_title: "M A N N Sanjeewa",
      account_number: "1057 5222 1967",
      branch_code: "Horana",
    },
    pricing_tiers: getDefaultPricingTiers(),
  })

  const getDefaultPricingTiers = () => [
    { min_length: 0, max_length: 100, rate: 6000 },
    { min_length: 101, max_length: 200, rate: 6500 },
    { min_length: 201, max_length: 300, rate: 7200 },
    { min_length: 301, max_length: 400, rate: 7800 },
    { min_length: 401, max_length: 500, rate: 8200 },
    { min_length: 501, max_length: 999999, rate: 8400 },
  ]

  const calculateRate = (cableLength: number): number => {
    const tier = pricingTiers.find((t) => cableLength >= t.min_length && cableLength <= t.max_length)
    return tier ? tier.rate : 8400
  }

  const groupLinesByRate = () => {
    const groups: {
      [key: string]: { count: number; rate: number; amount: number }
    } = {}

    lineDetails.forEach((line) => {
      const rate = calculateRate(line.total_cable)
      let rangeKey = ""

      if (line.total_cable <= 100) rangeKey = "0-100"
      else if (line.total_cable <= 200) rangeKey = "101-200"
      else if (line.total_cable <= 300) rangeKey = "201-300"
      else if (line.total_cable <= 400) rangeKey = "301-400"
      else if (line.total_cable <= 500) rangeKey = "401-500"
      else rangeKey = "Over 500"

      if (!groups[rangeKey]) {
        groups[rangeKey] = { count: 0, rate, amount: 0 }
      }

      groups[rangeKey].count += 1
      groups[rangeKey].amount += rate
    })

    return groups
  }

  const handleDownload = () => {
    if (invoice) {
      // In a real application, you would generate the PDF and trigger a download.
      // For this example, we'll just simulate it.
      toast({
        title: "Download Initiated",
        description: `Downloading invoice ${invoice.id}. (Mock)`,
      })
      console.log("Simulating PDF download for invoice:", invoice)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Invoice Details</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto p-4 border rounded-md bg-white">
          {invoice ? <InvoicePdfTemplate invoice={invoice} /> : <p>No invoice data available.</p>}
        </div>
        <div className="mt-4 flex justify-end">
          <Button onClick={handleDownload} disabled={!invoice}>
            <Download className="mr-2 h-4 w-4" /> Download PDF
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
