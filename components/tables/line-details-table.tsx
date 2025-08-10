"use client"

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Edit, Trash2 } from "lucide-react"
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

interface LineDetails {
  id: string
  telephone_no: string
  customer_name: string
  address: string
  status: string
  installation_date: string
  service_type: string
  monthly_fee: number
}

interface LineDetailsTableProps {
  lines: LineDetails[]
  onEdit: (line: LineDetails) => void
  onDelete: (id: string) => void
}

export function LineDetailsTable({ lines, onEdit, onDelete }: LineDetailsTableProps) {
  return (
    <div className="rounded-md border overflow-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Telephone No.</TableHead>
            <TableHead>Customer Name</TableHead>
            <TableHead>Address</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Installation Date</TableHead>
            <TableHead>Service Type</TableHead>
            <TableHead className="text-right">Monthly Fee</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {lines.map((line) => (
            <TableRow key={line.id}>
              <TableCell className="font-medium">{line.telephone_no}</TableCell>
              <TableCell>{line.customer_name}</TableCell>
              <TableCell>{line.address}</TableCell>
              <TableCell>
                <Badge
                  variant={
                    line.status === "active" ? "default" : line.status === "inactive" ? "secondary" : "destructive"
                  }
                >
                  {line.status}
                </Badge>
              </TableCell>
              <TableCell>{new Date(line.installation_date).toLocaleDateString()}</TableCell>
              <TableCell>{line.service_type}</TableCell>
              <TableCell className="text-right">
                {new Intl.NumberFormat("en-LK", { style: "currency", currency: "LKR" }).format(line.monthly_fee)}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <Button variant="outline" size="sm" onClick={() => onEdit(line)}>
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
                          This action cannot be undone. This will permanently delete the telephone line.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => onDelete(line.id)}>Continue</AlertDialogAction>
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
  )
}
