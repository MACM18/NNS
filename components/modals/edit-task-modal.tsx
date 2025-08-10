"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { supabase } from "@/lib/supabase"
import { toast } from "@/hooks/use-toast"
import { Loader2 } from "lucide-react"

interface Task {
  id: string
  telephone_no: string
  description: string
  status: string
  priority: string
  assigned_to: string | null
  due_date: string | null
}

interface UserProfile {
  id: string
  full_name: string | null
}

interface EditTaskModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  task: Task | null
  onSuccess: () => void
}

export function EditTaskModal({ open, onOpenChange, task, onSuccess }: EditTaskModalProps) {
  const [telephoneNo, setTelephoneNo] = useState("")
  const [description, setDescription] = useState("")
  const [status, setStatus] = useState("pending")
  const [priority, setPriority] = useState("low")
  const [assignedTo, setAssignedTo] = useState<string | null>(null)
  const [dueDate, setDueDate] = useState("")
  const [loading, setLoading] = useState(false)
  const [users, setUsers] = useState<UserProfile[]>([])

  useEffect(() => {
    if (task) {
      setTelephoneNo(task.telephone_no)
      setDescription(task.description)
      setStatus(task.status)
      setPriority(task.priority)
      setAssignedTo(task.assigned_to)
      setDueDate(task.due_date || "")
    }
    if (open) {
      fetchUsers()
    }
  }, [task, open])

  const fetchUsers = async () => {
    const { data, error } = await supabase.from("profiles").select("id, full_name")
    if (error) {
      console.error("Error fetching users:", error)
      toast({
        title: "Error",
        description: "Failed to load users for task assignment.",
        variant: "destructive",
      })
    } else {
      setUsers(data || [])
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    if (!task) {
      toast({
        title: "Error",
        description: "No task selected for editing.",
        variant: "destructive",
      })
      setLoading(false)
      return
    }

    const { error } = await supabase
      .from("tasks")
      .update({
        telephone_no: telephoneNo,
        description,
        status,
        priority,
        assigned_to: assignedTo,
        due_date: dueDate || null,
      })
      .eq("id", task.id)

    if (error) {
      console.error("Error updating task:", error)
      toast({
        title: "Error",
        description: "Failed to update task. Please try again.",
        variant: "destructive",
      })
    } else {
      toast({
        title: "Success",
        description: "Task updated successfully.",
      })
      onSuccess()
      onOpenChange(false)
    }
    setLoading(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Task</DialogTitle>
          <DialogDescription>Make changes to the task details.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="telephoneNo">Telephone Number</Label>
            <Input
              id="telephoneNo"
              value={telephoneNo}
              onChange={(e) => setTelephoneNo(e.target.value)}
              required
              disabled
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} required />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="status">Status</Label>
            <Select value={status} onValueChange={setStatus} required>
              <SelectTrigger id="status">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="priority">Priority</Label>
            <Select value={priority} onValueChange={setPriority} required>
              <SelectTrigger id="priority">
                <SelectValue placeholder="Select priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="assignedTo">Assigned To</Label>
            <Select value={assignedTo || "unassigned"} onValueChange={setAssignedTo}>
              <SelectTrigger id="assignedTo">
                <SelectValue placeholder="Select assignee (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unassigned">Unassigned</SelectItem>
                {users.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.full_name || user.id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="dueDate">Due Date</Label>
            <Input id="dueDate" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>
          <Button type="submit" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving Changes...
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
