"use client"

import { type ColumnDef, flexRender, getCoreRowModel, useReactTable } from "@tanstack/react-table"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { MoreHorizontal } from "lucide-react"
import { useState } from "react"
import { useToast } from "@/components/ui/use-toast"
import { NotificationService } from "@/lib/notification-service"

interface Task {
  id: string
  phone_number: string
  status: "pending" | "in_progress" | "completed" | "cancelled"
}

interface DataTableProps {
  data: Task[]
  updateTaskStatus: (taskId: string, newStatus: string) => Promise<void>
}

const TaskManagementTable = ({ data, updateTaskStatus }: DataTableProps) => {
  const [tasks, setTasks] = useState(data)
  const { toast } = useToast()

  const columns: ColumnDef<Task>[] = [
    {
      accessorKey: "id",
      header: "ID",
    },
    {
      accessorKey: "phone_number",
      header: "Phone Number",
    },
    {
      accessorKey: "status",
      header: "Status",
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const task = row.original

        const handleStatusChange = async (newStatus: string) => {
          try {
            await updateTaskStatus(task.id, newStatus)
            setTasks((prevTasks) => prevTasks.map((t) => (t.id === task.id ? { ...t, status: newStatus } : t)))

            toast({
              title: "Success",
              description: `Task status updated to ${newStatus}`,
            })

            if (newStatus === "completed") {
              // Create notification for task completion
              await NotificationService.createTaskCompletedNotification(task.id, task.phone_number)
            }
          } catch (error) {
            console.error("Error updating task status:", error)
            toast({
              title: "Error",
              description: "Failed to update task status",
              variant: "destructive",
            })
          }
        }

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handleStatusChange("pending")}>Pending</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleStatusChange("in_progress")}>In Progress</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleStatusChange("completed")}>Completed</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleStatusChange("cancelled")}>Cancelled</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ]

  const table = useReactTable({
    data: tasks,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  return (
    <div className="w-full">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => {
                return (
                  <TableHead key={header.id}>
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                )
              })}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows?.length ? (
            table.getRowModel().rows.map((row) => (
              <TableRow key={row.id} data-row={JSON.stringify(row.original)}>
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={columns.length} className="h-24 text-center">
                No results.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  )
}

export default TaskManagementTable
