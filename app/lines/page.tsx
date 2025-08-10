"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, Edit, Trash2, RefreshCw } from "lucide-react"
import { AddTelephoneLineModal } from "@/components/modals/add-telephone-line-modal"
import { EditTelephoneLineModal } from "@/components/modals/edit-telephone-line-modal"
import { supabase } from "@/lib/supabase"
import { toast } from "@/hooks/use-toast"
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

export default function TelephoneLinesPage() {
  const [lines, setLines] = useState<LineDetails[]>([])
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [selectedLine, setSelectedLine] = useState<LineDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchLines()
  }, [])

  const fetchLines = async () => {
    setLoading(true)
    setError(null)
    const { data, error } = await supabase.from("line_details").select("*").order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching telephone lines:", error)
      setError("Failed to load telephone lines.")
      toast({
        title: "Error",
        description: "Failed to load telephone lines.",
        variant: "destructive",
      })
    } else {
      setLines(data as LineDetails[])
    }
    setLoading(false)
  }

  const handleEditLine = (line: LineDetails) => {
    setSelectedLine(line)
    setIsEditModalOpen(true)
  }

  const handleDeleteLine = async (id: string) => {
    const { error } = await supabase.from("line_details").delete().eq("id", id)

    if (error) {
      console.error("Error deleting line:", error)
      toast({
        title: "Error",
        description: "Failed to delete telephone line.",
        variant: "destructive",
      })
    } else {
      setLines(lines.filter((line) => line.id !== id))
      toast({
        title: "Success",
        description: "Telephone line deleted successfully.",
      })
    }
  }

  if (loading) {
    return (
      <div className="p-8">
        <p>Loading telephone lines...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-8">
        <p className="text-red-500">{error}</p>
        <Button onClick={fetchLines}>Retry</Button>
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Telephone Lines</h2>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={fetchLines} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button onClick={() => setIsAddModalOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add New Line
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {lines.length === 0 ? (
          <p className="col-span-full text-center text-muted-foreground">No telephone lines found.</p>
        ) : (
          lines.map((line) => (
            <Card key={line.id}>
              <CardHeader>
                <CardTitle>{line.telephone_no}</CardTitle>
                <CardDescription>{line.customer_name}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p>
                  <strong>Address:</strong> {line.address}
                </p>
                <p>
                  <strong>Status:</strong> {line.status}
                </p>
                <p>
                  <strong>Installation Date:</strong> {new Date(line.installation_date).toLocaleDateString()}
                </p>
                <p>
                  <strong>Service Type:</strong> {line.service_type}
                </p>
                <p>
                  <strong>Monthly Fee:</strong>{" "}
                  {new Intl.NumberFormat("en-LK", { style: "currency", currency: "LKR" }).format(line.monthly_fee)}
                </p>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" size="sm" onClick={() => handleEditLine(line)}>
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
                        <AlertDialogAction onClick={() => handleDeleteLine(line.id)}>Continue</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <AddTelephoneLineModal
        open={isAddModalOpen}
        onOpenChange={setIsAddModalOpen}
        onSuccess={() => {
          setIsAddModalOpen(false)
          fetchLines()
        }}
      />

      {selectedLine && (
        <EditTelephoneLineModal
          open={isEditModalOpen}
          onOpenChange={setIsEditModalOpen}
          line={selectedLine}
          onSuccess={() => {
            setIsEditModalOpen(false)
            fetchLines()
          }}
        />
      )}
    </div>
  )
}
