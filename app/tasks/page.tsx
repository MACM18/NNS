"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, RefreshCw } from "lucide-react"
import { AddTaskModal } from "@/components/modals/add-task-modal"
import { EditTaskModal } from "@/components/modals/edit-task-modal"
import { AssigneeManagementModal } from "@/components/modals/assignee-management-modal"
import { supabase } from "@/lib/supabase"
import { toast } from "@/hooks/use-toast"
import { TaskManagementTable } from "@/components/tables/task-management-table"

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

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [isAddTaskModalOpen, setIsAddTaskModalOpen] = useState(false)
  const [isEditTaskModalOpen, setIsEditTaskModalOpen] = useState(false)
  const [isAssigneeModalOpen, setIsAssigneeModalOpen] = useState(false)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchTasks()
  }, [])

  const fetchTasks = async () => {
    setLoading(true)
    setError(null)
    const { data, error } = await supabase.from("tasks").select("*").order("created_at", { ascending: false })

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

  const handleEditTask = (task: Task) => {
    setSelectedTask(task)
    setIsEditTaskModalOpen(true)
  }

  const handleDeleteTask = async (id: string) => {
    const { error } = await supabase.from("tasks").delete().eq("id", id)

    if (error) {
      console.error("Error deleting task:", error)
      toast({
        title: "Error",
        description: "Failed to delete task.",
        variant: "destructive",
      })
    } else {
      setTasks(tasks.filter((task) => task.id !== id))
      toast({
        title: "Success",
        description: "Task deleted successfully.",
      })
    }
  }

  const handleManageAssignees = () => {
    setIsAssigneeModalOpen(true)
  }

  if (loading) {
    return (
      <div className="p-8">
        <p>Loading tasks...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-8">
        <p className="text-red-500">{error}</p>
        <Button onClick={fetchTasks}>Retry</Button>
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Task Management</h2>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={fetchTasks} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button onClick={handleManageAssignees}>Manage Assignees</Button>
          <Button onClick={() => setIsAddTaskModalOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add New Task
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Tasks</CardTitle>
          <CardDescription>Overview of all operational tasks.</CardDescription>
        </CardHeader>
        <CardContent>
          {tasks.length === 0 ? (
            <p className="text-center text-muted-foreground">No tasks found.</p>
          ) : (
            <TaskManagementTable
              tasks={tasks}
              onEdit={handleEditTask}
              onDelete={handleDeleteTask}
              onRefresh={fetchTasks}
            />
          )}
        </CardContent>
      </Card>

      <AddTaskModal
        open={isAddTaskModalOpen}
        onOpenChange={setIsAddTaskModalOpen}
        onSuccess={() => {
          setIsAddTaskModalOpen(false)
          fetchTasks()
        }}
      />

      {selectedTask && (
        <EditTaskModal
          open={isEditTaskModalOpen}
          onOpenChange={setIsEditTaskModalOpen}
          task={selectedTask}
          onSuccess={() => {
            setIsEditTaskModalOpen(false)
            fetchTasks()
          }}
        />
      )}

      <AssigneeManagementModal
        open={isAssigneeModalOpen}
        onOpenChange={setIsAssigneeModalOpen}
        onSuccess={() => {
          setIsAssigneeModalOpen(false)
          fetchTasks() // Refresh tasks if assignees might have changed
        }}
      />
    </div>
  )
}
