"use client"

import { useState, useEffect } from "react"
import { Search, ChevronDown, Eye, Check, X, Calendar, Phone, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { getSupabaseClient } from "@/lib/supabase"
import { useNotification } from "@/contexts/notification-context"
import { useAuth } from "@/contexts/auth-context"

interface Task {
  id: string
  task_date: string
  telephone_no: string
  dp: string
  contact_no: string
  customer_name: string
  address: string
  status: string
  connection_type_new: string
  connection_services: string[]
  rejection_reason?: string
  rejected_by?: string
  rejected_at?: string
  completed_at?: string
  completed_by?: string
  line_details_id?: string
  notes?: string
  created_at: string
  created_by?: string
  profiles?: {
    full_name: string
    role: string
  }
}

interface TaskManagementTableProps {
  refreshTrigger: number
  dateFilter: "today" | "week" | "month"
}

export function TaskManagementTable({ refreshTrigger, dateFilter }: TaskManagementTableProps) {
  const [data, setData] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [sortField, setSortField] = useState<string>("created_at")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc")
  const [rejectModalOpen, setRejectModalOpen] = useState(false)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [rejectionReason, setRejectionReason] = useState("")

  const supabase = getSupabaseClient()
  const { addNotification } = useNotification()
  const { user, profile } = useAuth()

  useEffect(() => {
    fetchData()
  }, [refreshTrigger, dateFilter, statusFilter, sortField, sortDirection])

  const fetchData = async () => {
    setLoading(true)
    try {
      let query = supabase
        .from("tasks")
        .select(
          `
          *,
          profiles:created_by(full_name, role)
        `,
        )
        .not("task_date", "is", null)

      // Apply date filter
      const now = new Date()
      let startDate: Date

      switch (dateFilter) {
        case "today":
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
          break
        case "week":
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
          break
        case "month":
          startDate = new Date(now.getFullYear(), now.getMonth(), 1)
          break
        default:
          startDate = new Date(0)
      }

      query = query.gte("task_date", startDate.toISOString().split("T")[0])

      // Apply status filter
      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter)
      }

      // Apply sorting
      query = query.order(sortField, { ascending: sortDirection === "asc" })

      const { data: tasks, error } = await query

      if (error) throw error

      setData(tasks || [])
    } catch (error: any) {
      addNotification({
        title: "Error",
        message: "Failed to fetch tasks",
        type: "error",
      })
    } finally {
      setLoading(false)
    }
  }

  const filteredData = data.filter(
    (item) =>
      item.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.telephone_no?.includes(searchTerm) ||
      item.contact_no?.includes(searchTerm) ||
      item.dp?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.address?.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortDirection("asc")
    }
  }

  const handleAcceptTask = async (taskId: string) => {
    try {
      const { error } = await supabase
        .from("tasks")
        .update({
          status: "accepted",
          assigned_to: user?.id,
        })
        .eq("id", taskId)

      if (error) throw error

      addNotification({
        title: "Success",
        message: "Task accepted successfully",
        type: "success",
      })

      fetchData()
    } catch (error: any) {
      addNotification({
        title: "Error",
        message: error.message,
        type: "error",
      })
    }
  }

  const handleRejectTask = async () => {
    if (!selectedTask || !rejectionReason.trim()) {
      addNotification({
        title: "Error",
        message: "Please provide a rejection reason",
        type: "error",
      })
      return
    }

    try {
      const { error } = await supabase
        .from("tasks")
        .update({
          status: "rejected",
          rejection_reason: rejectionReason,
          rejected_by: user?.id,
          rejected_at: new Date().toISOString(),
        })
        .eq("id", selectedTask.id)

      if (error) throw error

      addNotification({
        title: "Success",
        message: "Task rejected successfully",
        type: "success",
      })

      setRejectModalOpen(false)
      setSelectedTask(null)
      setRejectionReason("")
      fetchData()
    } catch (error: any) {
      addNotification({
        title: "Error",
        message: error.message,
        type: "error",
      })
    }
  }

  const handleCompleteTask = async (taskId: string) => {
    try {
      // Check if line details exist for this task
      const { data: lineDetails, error: lineError } = await supabase
        .from("line_details")
        .select("id")
        .eq("telephone_no", data.find((t) => t.id === taskId)?.telephone_no)
        .single()

      if (lineError || !lineDetails) {
        addNotification({
          title: "Cannot Complete Task",
          message: "Line details must be filled before marking task as completed",
          type: "error",
        })
        return
      }

      const { error } = await supabase
        .from("tasks")
        .update({
          status: "completed",
          completed_by: user?.id,
          completed_at: new Date().toISOString(),
          line_details_id: lineDetails.id,
        })
        .eq("id", taskId)

      if (error) throw error

      addNotification({
        title: "Success",
        message: "Task marked as completed",
        type: "success",
      })

      fetchData()
    } catch (error: any) {
      addNotification({
        title: "Error",
        message: error.message,
        type: "error",
      })
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="secondary">Pending</Badge>
      case "accepted":
        return <Badge variant="default">Accepted</Badge>
      case "rejected":
        return <Badge variant="destructive">Rejected</Badge>
      case "completed":
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            Completed
          </Badge>
        )
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const getConnectionTypeBadge = (type: string) => {
    return (
      <Badge variant={type === "New" ? "default" : "secondary"} className="text-xs">
        {type}
      </Badge>
    )
  }

  const ExpandedRowContent = ({ item }: { item: Task }) => (
    <div className="p-6 bg-muted/30 rounded-lg space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Task Details */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Task Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Date:</span>
              <span className="font-medium">{new Date(item.task_date).toLocaleDateString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Type:</span>
              {getConnectionTypeBadge(item.connection_type_new)}
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Status:</span>
              {getStatusBadge(item.status)}
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">DP:</span>
              <Badge variant="outline" className="font-mono text-xs">
                {item.dp}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Contact Information */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Phone className="h-4 w-4" />
              Contact Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div>
              <span className="text-sm text-muted-foreground">Customer:</span>
              <p className="font-medium">{item.customer_name}</p>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">Phone:</span>
              <p className="font-medium">{item.telephone_no}</p>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">Contact:</span>
              <p className="font-medium">{item.contact_no}</p>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">Address:</span>
              <p className="text-sm">{item.address}</p>
            </div>
          </CardContent>
        </Card>

        {/* Services & Status */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <User className="h-4 w-4" />
              Services & Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div>
              <span className="text-sm text-muted-foreground">Services:</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {item.connection_services?.map((service) => (
                  <Badge key={service} variant="outline" className="text-xs">
                    {service.replace("_", " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                  </Badge>
                ))}
              </div>
            </div>
            {item.rejection_reason && (
              <div>
                <span className="text-sm text-muted-foreground">Rejection Reason:</span>
                <p className="text-sm text-red-600">{item.rejection_reason}</p>
              </div>
            )}
            {item.notes && (
              <div>
                <span className="text-sm text-muted-foreground">Notes:</span>
                <p className="text-sm">{item.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="text-xs text-muted-foreground">
        Created: {new Date(item.created_at).toLocaleDateString()} |{" "}
        {item.profiles?.full_name && `By: ${item.profiles.full_name}`}
      </div>
    </div>
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-sm text-muted-foreground">Loading tasks...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Search and Filter Controls */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, phone, contact, DP, or address..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="accepted">Accepted</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sortField} onValueChange={setSortField}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="created_at">Date Created</SelectItem>
            <SelectItem value="task_date">Task Date</SelectItem>
            <SelectItem value="customer_name">Customer Name</SelectItem>
            <SelectItem value="status">Status</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={() => setSortDirection(sortDirection === "asc" ? "desc" : "asc")}>
          {sortDirection === "asc" ? "↑" : "↓"}
        </Button>
      </div>

      {/* Results Count */}
      <div className="text-sm text-muted-foreground">
        Showing {filteredData.length} of {data.length} tasks
      </div>

      {/* Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("task_date")}>
                Date
                {sortField === "task_date" && (
                  <ChevronDown className={`inline ml-1 h-4 w-4 ${sortDirection === "asc" ? "rotate-180" : ""}`} />
                )}
              </TableHead>
              <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("customer_name")}>
                Customer
                {sortField === "customer_name" && (
                  <ChevronDown className={`inline ml-1 h-4 w-4 ${sortDirection === "asc" ? "rotate-180" : ""}`} />
                )}
              </TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>DP</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Services</TableHead>
              <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("status")}>
                Status
                {sortField === "status" && (
                  <ChevronDown className={`inline ml-1 h-4 w-4 ${sortDirection === "asc" ? "rotate-180" : ""}`} />
                )}
              </TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredData.map((item) => (
              <TableRow key={item.id}>
                <TableCell>{new Date(item.task_date).toLocaleDateString()}</TableCell>
                <TableCell className="font-medium">{item.customer_name}</TableCell>
                <TableCell>{item.telephone_no}</TableCell>
                <TableCell>
                  <Badge variant="outline" className="font-mono text-xs">
                    {item.dp}
                  </Badge>
                </TableCell>
                <TableCell>{getConnectionTypeBadge(item.connection_type_new)}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {item.connection_services?.slice(0, 2).map((service) => (
                      <Badge key={service} variant="outline" className="text-xs">
                        {service.replace("_", " ")}
                      </Badge>
                    ))}
                    {item.connection_services?.length > 2 && (
                      <Badge variant="outline" className="text-xs">
                        +{item.connection_services.length - 2}
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell>{getStatusBadge(item.status)}</TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    {item.status === "pending" && (
                      <>
                        <Button size="sm" onClick={() => handleAcceptTask(item.id)} className="h-8">
                          <Check className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => {
                            setSelectedTask(item)
                            setRejectModalOpen(true)
                          }}
                          className="h-8"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </>
                    )}
                    {item.status === "accepted" && (
                      <Button size="sm" variant="outline" onClick={() => handleCompleteTask(item.id)} className="h-8">
                        Complete
                      </Button>
                    )}
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8">
                          <Eye className="h-3 w-3" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[800px]">
                        <ExpandedRowContent item={item} />
                      </PopoverContent>
                    </Popover>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {filteredData.length === 0 && (
        <div className="text-center py-8">
          <p className="text-muted-foreground">No tasks found matching your search criteria.</p>
        </div>
      )}

      {/* Rejection Modal */}
      <Dialog open={rejectModalOpen} onOpenChange={setRejectModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Task</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this task for {selectedTask?.customer_name}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="rejection_reason">Rejection Reason</Label>
              <Textarea
                id="rejection_reason"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Enter the reason for rejection..."
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleRejectTask}>
              Reject Task
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
