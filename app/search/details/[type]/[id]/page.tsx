import React from "react"
import { notFound } from "next/navigation"
import { getSupabaseClient } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Phone,
  CheckCircle,
  Package,
  Calendar,
  MapPin,
  User,
  Info,
  Clock,
  Tag,
  ClipboardList,
  DollarSignIcon,
  Warehouse,
  Ruler,
  FileText,
} from "lucide-react"
import { format } from "date-fns"

interface SearchDetailsPageProps {
  params: {
    type: "line" | "task" | "invoice" | "inventory"
    id: string
  }
}

export default async function SearchDetailsPage({ params }: SearchDetailsPageProps) {
  const { type, id } = params
  const supabase = getSupabaseClient()

  let data: any = null
  let title = ""
  let subtitle = ""
  let details: { label: string; value: React.ReactNode; icon?: React.ReactNode }[] = []
  let badgeColor = ""

  try {
    switch (type) {
      case "line": {
        const { data: line, error } = await supabase.from("line_details").select("*").eq("id", id).single()
        if (error || !line) notFound()
        data = line
        title = `Line: ${line.telephone_no}`
        subtitle = line.customer_name
        badgeColor = "bg-blue-100 text-blue-800"
        details = [
          { label: "Customer Name", value: line.customer_name, icon: <User className="h-4 w-4" /> },
          { label: "Address", value: line.address, icon: <MapPin className="h-4 w-4" /> },
          { label: "Length (m)", value: line.length, icon: <Ruler className="h-4 w-4" /> },
          {
            label: "Status",
            value: (
              <Badge
                variant="secondary"
                className={line.completed ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}
              >
                {line.completed ? "Completed" : "Pending"}
              </Badge>
            ),
            icon: <Info className="h-4 w-4" />,
          },
          {
            label: "Date Installed",
            value: line.date ? format(new Date(line.date), "PPP") : "N/A",
            icon: <Calendar className="h-4 w-4" />,
          },
          {
            label: "Created At",
            value: format(new Date(line.created_at), "PPP p"),
            icon: <Clock className="h-4 w-4" />,
          },
        ]
        break
      }
      case "task": {
        const { data: task, error } = await supabase.from("tasks").select("*").eq("id", id).single()
        if (error || !task) notFound()
        data = task
        title = `Task: ${task.title}`
        subtitle = task.telephone_no || "No phone number"
        badgeColor = "bg-green-100 text-green-800"
        details = [
          { label: "Description", value: task.description, icon: <ClipboardList className="h-4 w-4" /> },
          { label: "Assigned To", value: task.assigned_to || "N/A", icon: <User className="h-4 w-4" /> },
          {
            label: "Status",
            value: <Badge variant="secondary">{task.status}</Badge>,
            icon: <Info className="h-4 w-4" />,
          },
          {
            label: "Due Date",
            value: task.due_date ? format(new Date(task.due_date), "PPP") : "N/A",
            icon: <Calendar className="h-4 w-4" />,
          },
          {
            label: "Created At",
            value: format(new Date(task.created_at), "PPP p"),
            icon: <Clock className="h-4 w-4" />,
          },
        ]
        break
      }
      case "invoice": {
        const { data: invoice, error } = await supabase.from("generated_invoices").select("*").eq("id", id).single()
        if (error || !invoice) notFound()
        data = invoice
        title = `Invoice: ${invoice.invoice_number}`
        subtitle = invoice.customer_name
        badgeColor = "bg-yellow-100 text-yellow-800"
        details = [
          { label: "Customer Name", value: invoice.customer_name, icon: <User className="h-4 w-4" /> },
          { label: "Telephone No", value: invoice.telephone_no, icon: <Phone className="h-4 w-4" /> },
          {
            label: "Total Amount",
            value: `LKR ${invoice.total_amount?.toLocaleString()}`,
            icon: <DollarSignIcon className="h-4 w-4" />,
          },
          {
            label: "Type",
            value: <Badge variant="secondary">{invoice.invoice_type}</Badge>,
            icon: <Tag className="h-4 w-4" />,
          },
          {
            label: "Generated Date",
            value: invoice.created_at ? format(new Date(invoice.created_at), "PPP") : "N/A",
            icon: <Calendar className="h-4 w-4" />,
          },
        ]
        break
      }
      case "inventory": {
        const { data: item, error } = await supabase.from("inventory_items").select("*").eq("id", id).single()
        if (error || !item) notFound()
        data = item
        title = `Inventory: ${item.name}`
        subtitle = item.category
        badgeColor = "bg-purple-100 text-purple-800"
        details = [
          { label: "Description", value: item.description, icon: <Info className="h-4 w-4" /> },
          { label: "Category", value: item.category, icon: <Tag className="h-4 w-4" /> },
          {
            label: "Current Stock",
            value: `${item.current_stock} ${item.unit}`,
            icon: <Warehouse className="h-4 w-4" />,
          },
          {
            label: "Reorder Level",
            value: `${item.reorder_level} ${item.unit}`,
            icon: <Warehouse className="h-4 w-4" />,
          },
          {
            label: "Last Updated",
            value: item.updated_at ? format(new Date(item.updated_at), "PPP p") : "N/A",
            icon: <Clock className="h-4 w-4" />,
          },
        ]
        break
      }
      default:
        notFound()
    }
  } catch (error) {
    console.error("Error fetching search details:", error)
    notFound()
  }

  if (!data) {
    notFound()
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            {type === "line" && <Phone className="h-6 w-6" />}
            {type === "task" && <CheckCircle className="h-6 w-6" />}
            {type === "invoice" && <FileText className="h-6 w-6" />}
            {type === "inventory" && <Package className="h-6 w-6" />}
            {title}
            <Badge variant="secondary" className={`text-sm ${badgeColor}`}>
              {type}
            </Badge>
          </CardTitle>
          <p className="text-muted-foreground">{subtitle}</p>
        </CardHeader>
        <CardContent className="grid gap-4">
          {details.map((detail, index) => (
            <React.Fragment key={detail.label}>
              <div className="flex items-center gap-3">
                {detail.icon}
                <div className="grid gap-1">
                  <p className="text-sm font-medium leading-none">{detail.label}</p>
                  <p className="text-sm text-muted-foreground">{detail.value}</p>
                </div>
              </div>
              {index < details.length - 1 && <Separator />}
            </React.Fragment>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
