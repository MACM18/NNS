"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, Edit, Trash2, ExternalLink } from "lucide-react"
import { AddJobVacancyModal } from "@/components/modals/add-job-vacancy-modal"
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
import Link from "next/link"

interface JobVacancy {
  id: string
  title: string
  description: string
  requirements: string
  location: string
  salary: string
  posted_at: string
}

export default function CareerManagementPage() {
  const [jobVacancies, setJobVacancies] = useState<JobVacancy[]>([])
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchJobVacancies()
  }, [])

  const fetchJobVacancies = async () => {
    setLoading(true)
    setError(null)
    const { data, error } = await supabase.from("job_vacancies").select("*").order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching job vacancies:", error)
      setError("Failed to load job vacancies.")
      toast({
        title: "Error",
        description: "Failed to load job vacancies.",
        variant: "destructive",
      })
    } else {
      setJobVacancies(data as JobVacancy[])
    }
    setLoading(false)
  }

  const handleDeleteJob = async (id: string) => {
    const { error } = await supabase.from("job_vacancies").delete().eq("id", id)

    if (error) {
      console.error("Error deleting job vacancy:", error)
      toast({
        title: "Error",
        description: "Failed to delete job vacancy.",
        variant: "destructive",
      })
    } else {
      setJobVacancies(jobVacancies.filter((job) => job.id !== id))
      toast({
        title: "Success",
        description: "Job vacancy deleted successfully.",
      })
    }
  }

  if (loading) {
    return (
      <div className="p-8">
        <p>Loading job vacancies...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-8">
        <p className="text-red-500">{error}</p>
        <Button onClick={fetchJobVacancies}>Retry</Button>
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Career Management</h2>
        <Button onClick={() => setIsAddModalOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add New Job
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {jobVacancies.length === 0 ? (
          <p className="col-span-full text-center text-muted-foreground">No job vacancies found.</p>
        ) : (
          jobVacancies.map((job) => (
            <Card key={job.id}>
              <CardHeader>
                <CardTitle>{job.title}</CardTitle>
                <CardDescription className="line-clamp-2">{job.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p>
                  <strong>Location:</strong> {job.location}
                </p>
                <p>
                  <strong>Salary:</strong> {job.salary}
                </p>
                <p>
                  <strong>Posted:</strong> {new Date(job.posted_at).toLocaleDateString()}
                </p>
                <div className="flex justify-end gap-2">
                  <Link href={`/job-listings/${job.id}`} passHref>
                    <Button variant="outline" size="sm">
                      <ExternalLink className="h-4 w-4 mr-2" /> View Public
                    </Button>
                  </Link>
                  <Button variant="outline" size="sm">
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
                          This action cannot be undone. This will permanently delete the job vacancy.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDeleteJob(job.id)}>Continue</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <AddJobVacancyModal
        open={isAddModalOpen}
        onOpenChange={setIsAddModalOpen}
        onSuccess={() => {
          setIsAddModalOpen(false)
          fetchJobVacancies()
        }}
      />
    </div>
  )
}
