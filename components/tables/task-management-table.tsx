"use client"

import { useState, useEffect } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, Filter, X, Edit, Trash2, RefreshCw } from "lucide-react"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Badge } from "@/components/ui/badge"
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
import { toast } from "@/hooks/use-toast"
import { supabase } from "@/lib/supabase"
import { Loader2 } from "lucide-react"

interface Task {
  id: string
  telephone_no: string
  description: string
  status: string
  priority: string
  assigned_to: string | null
  due_date: string | null
  created_at: string
}

interface UserProfile {
  id: string
  full_name: string | null
}

interface TaskManagementTableProps {
  tasks: Task[]
  onEdit: (task: Task) => void
  onDelete: (id: string) => void
  onRefresh: () => void
}

export function TaskManagementTable({ tasks: initialTasks, onEdit, onDelete, onRefresh }: TaskManagementTableProps) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Search and Filter states
  const [searchTerm, setSearchTerm] = useState("")
  const [filterStatus, setFilterStatus] = useState<string>("all")
  const [filterPriority, setFilterPriority] = useState<string>("all")
  const [filterAssignee, setFilterAssignee] = useState<string>("all")
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false)
  const [users, setUsers] = useState<UserProfile[]>([])

  useEffect(() => {
    setTasks(initialTasks) // Update tasks when initialTasks prop changes
  }, [initialTasks])

  useEffect(() => {
    fetchFilteredTasks()
    fetchUsers()
  }, [searchTerm, filterStatus, filterPriority, filterAssignee])

  const fetchUsers = async () => {
    const { data, error } = await supabase.from("profiles").select("id, full_name")
    if (error) {
      console.error("Error fetching users:", error)
    } else {
      setUsers(data || [])
    }
  }

  const fetchFilteredTasks = async () => {
    setLoading(true)
    setError(null)

    let query = supabase.from("tasks").select("*")

    if (searchTerm) {
      query = query.or(`telephone_no.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`)
    }
    if (filterStatus !== "all") {
      query = query.eq("status", filterStatus)
    }
    if (filterPriority !== "all") {
      query = query.eq("priority", filterPriority)
    }
    if (filterAssignee !== "all") {
      query = query.eq("assigned_to", filterAssignee)
    }

    query = query.order("created_at", { ascending: false })

    const { data, error } = await query

    if (error) {
      console.error("Error fetching tasks:", error)
      setError("Failed to load tasks.")
      toast({
        title: "Error",
        description: "Failed to load tasks.",
        variant: "destructive",
      })
    } else {
      setTasks(data as Task[])
    }
    setLoading(false)
  }

  const handleClearFilters = () => {
    setSearchTerm("")
    setFilterStatus("all")
    setFilterPriority("all")
    setFilterAssignee("all")
    setIsFilterPanelOpen(false)
  }

  const getAssigneeName = (id: string | null) => {
    if (!id) return "Unassigned"
    const user = users.find((u) => u.id === id)
    return user?.full_name || "Unknown User"
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Input
            placeholder="Search by telephone no. or description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        </div>
        <Collapsible open={isFilterPanelOpen} onOpenChange={setIsFilterPanelOpen} className="w-full md:w-auto">
          <CollapsibleTrigger asChild>
            <Button variant="outline" className="w-full md:w-auto bg-transparent">
              <Filter className="mr-2 h-4 w-4" />
              Filters {isFilterPanelOpen ? <X className="ml-2 h-4 w-4" /> : ""}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-4 md:mt-0 bg-muted/20 p-4 rounded-md">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterPriority} onValueChange={setFilterPriority}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priorities</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterAssignee} onValueChange={setFilterAssignee}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by Assignee" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Assignees</SelectItem>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.full_name || user.id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end mt-4">
              <Button variant="outline" onClick={handleClearFilters}>
                Clear Filters
              </Button>
            </div>
          </CollapsibleContent>
        </Collapsible>
        <Button variant="outline" size="sm" onClick={onRefresh} disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-48">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : error ? (
        <p className="text-red-500 text-center">{error}</p>
      ) : tasks.length === 0 ? (
        <p className="text-center text-muted-foreground">No tasks found matching your criteria.</p>
      ) : (
        <div className="rounded-md border overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Telephone No.</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Assigned To</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tasks.map((task) => (
                <TableRow key={task.id}>
                  <TableCell className="font-medium">{task.telephone_no}</TableCell>
                  <TableCell className="max-w-[200px] truncate">{task.description}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        task.status === "completed"
                          ? "default"
                          : task.status === "in_progress"
                            ? "secondary"
                            : task.status === "pending"
                              ? "destructive"
                              : "outline"
                      }
                    >
                      {task.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{task.priority}</TableCell>
                  <TableCell>{getAssigneeName(task.assigned_to)}</TableCell>
                  <TableCell>{task.due_date ? new Date(task.due_date).toLocaleDateString() : "N/A"}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={() => onEdit(task)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive" size="sm">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This action cannot be undone. This will permanently delete the task.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => onDelete(task.id)}>Continue</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
