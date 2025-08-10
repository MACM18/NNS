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

interface AddTaskModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

interface LineDetails {
  telephone_no: string
}

interface UserProfile {
  id: string
  full_name: string | null
}

export function AddTaskModal({ open, onOpenChange, onSuccess }: AddTaskModalProps) {
  const [telephoneNo, setTelephoneNo] = useState("")
  const [description, setDescription] = useState("")
  const [status, setStatus] = useState("pending")
  const [priority, setPriority] = useState("low")
  const [assignedTo, setAssignedTo] = useState<string | null>(null)
  const [dueDate, setDueDate] = useState("")
  const [loading, setLoading] = useState(false)
  const [lines, setLines] = useState<LineDetails[]>([])
  const [users, setUsers] = useState<UserProfile[]>([])

  useEffect(() => {
    if (open) {
      fetchLinesAndUsers()
    }
  }, [open])

  const fetchLinesAndUsers = async () => {
    // Fetch telephone numbers
    const { data: linesData, error: linesError } = await supabase.from("line_details").select("telephone_no")
    if (linesError) {
      console.error("Error fetching telephone numbers:", linesError)
      toast({
        title: "Error",
        description: "Failed to load telephone numbers for tasks.",
        variant: "destructive",
      })
    } else {
      setLines(linesData || [])
    }

    // Fetch users for assignment
    const { data: usersData, error: usersError } = await supabase.from("profiles").select("id, full_name")
    if (usersError) {
      console.error("Error fetching users:", usersError)
      toast({
        title: "Error",
        description: "Failed to load users for task assignment.",
        variant: "destructive",
      })
    } else {
      setUsers(usersData || [])
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const { error } = await supabase.from("tasks").insert({
      telephone_no: telephoneNo,
      description,
      status,
      priority,
      assigned_to: assignedTo,
      due_date: dueDate || null,
    })

    if (error) {
      console.error("Error adding task:", error)
      toast({
        title: "Error",
        description: "Failed to add task. Please try again.",
        variant: "destructive",
      })
    } else {
      toast({
        title: "Success",
        description: "Task added successfully.",
      })
      onSuccess()
      setTelephoneNo("")
      setDescription("")
      setStatus("pending")
      setPriority("low")
      setAssignedTo(null)
      setDueDate("")
    }
    setLoading(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New Task</DialogTitle>
          <DialogDescription>Fill in the details for the new operational task.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="telephoneNo">Telephone Number</Label>
            <Select value={telephoneNo} onValueChange={setTelephoneNo} required>
              <SelectTrigger id="telephoneNo">
                <SelectValue placeholder="Select telephone number" />
              </SelectTrigger>
              <SelectContent>
                {lines.map((line) => (
                  <SelectItem key={line.telephone_no} value={line.telephone_no}>
                    {line.telephone_no}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
            <Select value={assignedTo || ""} onValueChange={setAssignedTo}>
              <SelectTrigger id="assignedTo">
                <SelectValue placeholder="Select assignee (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Unassigned</SelectItem>
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
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Adding Task...
              </>
            ) : (
              "Add Task"
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
