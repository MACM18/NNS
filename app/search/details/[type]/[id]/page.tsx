"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, Edit, Trash2, Phone, Package, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { getSupabaseClient } from "@/lib/supabase"
import { useAuth } from "@/contexts/auth-context"
import { useNotification } from "@/contexts/notification-context"
import { EditTelephoneLineModal } from "@/components/modals/edit-telephone-line-modal"
import { EditTaskModal } from "@/components/modals/edit-task-modal"
import { EditInventoryItemModal } from "@/components/modals/edit-inventory-item-modal"
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

interface DetailData {
  id: string
  type: "line" | "task" | "invoice" | "inventory"
  data: any
  relatedData?: {
    lines?: any[]
    tasks?: any[]
    invoices?: any[]
    inventory?: any[]
  }
}

export default function SearchDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const { user, role } = useAuth()
  const { addNotification } = useNotification()
  const supabase = getSupabaseClient()

  const [detailData, setDetailData] = useState<DetailData | null>(null)
  const [loading, setLoading] = useState(true)
  const [editModalOpen, setEditModalOpen] = useState(false)

  const type = params.type as string
  const id = params.id as string

  useEffect(() => {
    if (type && id) {
      fetchDetailData()
    }
  }, [type, id])

  const fetchDetailData = async () => {
    setLoading(true)
    try {
      let data = null
      let relatedData = {}

      switch (type) {
        case "line":
          const { data: lineData } = await supabase.from("line_details").select("*").eq("id", id).single()

          if (lineData) {
            data = lineData

            // Fetch related tasks
            const { data: tasks } = await supabase
              .from("tasks")
              .select("*")
              .eq("telephone_no", lineData.telephone_no)
              .limit(10)

            // Fetch related invoices
            const { data: invoices } = await supabase
              .from("generated_invoices")
              .select("*")
              .contains("line_details_ids", [lineData.id])
              .limit(5)

            relatedData = { tasks, invoices }
          }
          break

        case "task":
          const { data: taskData } = await supabase.from("tasks").select("*").eq("id", id).single()

          if (taskData) {
            data = taskData

            // Fetch related line details
            const { data: lines } = await supabase
              .from("line_details")
              .select("*")
              .eq("telephone_no", taskData.telephone_no)
              .limit(5)

            relatedData = { lines }
          }
          break

        case "invoice":
          const { data: invoiceData } = await supabase.from("generated_invoices").select("*").eq("id", id).single()

          if (invoiceData) {
            data = invoiceData

            // Fetch related line details
            if (invoiceData.line_details_ids && invoiceData.line_details_ids.length > 0) {
              const { data: lines } = await supabase
                .from("line_details")
                .select("*")
                .in("id", invoiceData.line_details_ids)
                .limit(10)

              relatedData = { lines }
            }
          }
          break

        case "inventory":
          const { data: inventoryData } = await supabase.from("inventory_items").select("*").eq("id", id).single()

          if (inventoryData) {
            data = inventoryData

            // Fetch related drum tracking
            const { data: drums } = await supabase
              .from("drum_tracking")
              .select("*")
              .eq("item_id", inventoryData.id)
              .limit(5)

            relatedData = { inventory: drums }
          }
          break
      }

      if (data) {
        setDetailData({ id, type: type as any, data, relatedData })
      }
    } catch (error) {
      console.error("Error fetching detail data:", error)
      addNotification({
        title: "Error",
        message: "Failed to fetch details",
        type: "error",
        category: "system",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!detailData) return

    try {
      let tableName = ""
      switch (type) {
        case "line":
          tableName = "line_details"
          break
        case "task":
          tableName = "tasks"
          break
        case "inventory":
          tableName = "inventory_items"
          break
        default:
          throw new Error("Cannot delete this type of record")
      }

      const { error } = await supabase.from(tableName).delete().eq("id", id)

      if (error) throw error

      addNotification({
        title: "Success",
        message: `${type.charAt(0).toUpperCase() + type.slice(1)} deleted successfully`,
        type: "success",
        category: "system",
      })

      router.back()
    } catch (error: any) {
      addNotification({
        title: "Error",
        message: error.message || "Failed to delete record",
        type: "error",
        category: "system",
      })
    }
  }

  const canEdit = () => {
    return role === "admin" || role === "moderator"
  }

  const canDelete = () => {
    return role === "admin"
  }

  if (loading) {
    return (
      <main className="flex-1 space-y-6 p-6">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </main>
    )
  }

  if (!detailData) {
    return (
      <main className="flex-1 space-y-6 p-6">
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold">Record not found</h2>
          <p className="text-muted-foreground mt-2">The requested record could not be found.</p>
          <Button onClick={() => router.back()} className="mt-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Go Back
          </Button>
        </div>
      </main>
    )
  }

  const renderLineDetails = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5" />
            Line Details: {detailData.data.telephone_no}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Customer Name</label>
              <p className="text-sm">{detailData.data.name}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Address</label>
              <p className="text-sm">{detailData.data.address}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Date</label>
              <p className="text-sm">{new Date(detailData.data.date).toLocaleDateString()}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Length</label>
              <p className="text-sm">{detailData.data.length}m</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Status</label>
              <Badge variant={detailData.data.completed ? "default" : "secondary"}>
                {detailData.data.completed ? "Completed" : "Pending"}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Related Tasks */}
      {detailData.relatedData?.tasks && detailData.relatedData.tasks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Related Tasks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {detailData.relatedData.tasks.map((task: any) => (
                <div key={task.id} className="flex items-center justify-between p-3 border rounded">
                  <div>
                    <p className="font-medium">{task.telephone_no}</p>
                    <p className="text-sm text-muted-foreground">{task.address}</p>
                  </div>
                  <Badge variant={task.status === "completed" ? "default" : "secondary"}>{task.status}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )

  const renderTaskDetails = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Task Details: {detailData.data.telephone_no}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-muted-foreground">Telephone Number</label>
            <p className="text-sm">{detailData.data.telephone_no}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">Address</label>
            <p className="text-sm">{detailData.data.address}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">Status</label>
            <Badge variant={detailData.data.status === "completed" ? "default" : "secondary"}>
              {detailData.data.status}
            </Badge>
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">Created</label>
            <p className="text-sm">{new Date(detailData.data.created_at).toLocaleDateString()}</p>
          </div>
          {detailData.data.description && (
            <div className="col-span-2">
              <label className="text-sm font-medium text-muted-foreground">Description</label>
              <p className="text-sm">{detailData.data.description}</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )

  const renderInvoiceDetails = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Invoice: {detailData.data.invoice_number}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-muted-foreground">Invoice Type</label>
            <Badge>{detailData.data.invoice_type}</Badge>
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">Amount</label>
            <p className="text-sm font-medium">LKR {detailData.data.total_amount.toLocaleString()}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">Lines Count</label>
            <p className="text-sm">{detailData.data.line_count}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">Job Month</label>
            <p className="text-sm">{detailData.data.job_month}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )

  const renderInventoryDetails = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          Inventory: {detailData.data.name}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-muted-foreground">Current Stock</label>
            <p className="text-sm font-medium">
              {detailData.data.current_stock} {detailData.data.unit}
            </p>
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">Reorder Level</label>
            <p className="text-sm">
              {detailData.data.reorder_level} {detailData.data.unit}
            </p>
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">Last Updated</label>
            <p className="text-sm">{new Date(detailData.data.updated_at).toLocaleDateString()}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )

  return (
    <main className="flex-1 space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold capitalize">{type} Details</h1>
            <p className="text-muted-foreground">Detailed information and related records</p>
          </div>
        </div>

        <div className="flex gap-2">
          {canEdit() && type !== "invoice" && (
            <Button onClick={() => setEditModalOpen(true)}>
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
          )}
          {canDelete() && type !== "invoice" && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete the {type} record.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>

      {/* Content */}
      {type === "line" && renderLineDetails()}
      {type === "task" && renderTaskDetails()}
      {type === "invoice" && renderInvoiceDetails()}
      {type === "inventory" && renderInventoryDetails()}

      {/* Edit Modals */}
      {type === "line" && (
        <EditTelephoneLineModal
          open={editModalOpen}
          onOpenChange={setEditModalOpen}
          lineData={detailData.data}
          onSuccess={() => {
            setEditModalOpen(false)
            fetchDetailData()
          }}
        />
      )}

      {type === "task" && (
        <EditTaskModal
          open={editModalOpen}
          onOpenChange={setEditModalOpen}
          task={detailData.data}
          onSuccess={() => {
            setEditModalOpen(false)
            fetchDetailData()
          }}
        />
      )}

      {type === "inventory" && (
        <EditInventoryItemModal
          open={editModalOpen}
          onOpenChange={setEditModalOpen}
          item={detailData.data}
          onSuccess={() => {
            setEditModalOpen(false)
            fetchDetailData()
          }}
        />
      )}
    </main>
  )
}
