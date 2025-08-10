"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { MapPin, Calendar, Search, ArrowRight } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { PublicLayout } from "@/components/layout/public-layout"
import { supabase } from "@/lib/supabase"
import type { JobVacancy } from "@/types/content"

export default function JobListingsPage() {
  const [jobVacancies, setJobVacancies] = useState<JobVacancy[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")

  useEffect(() => {
    fetchJobVacancies()
  }, [])

  const fetchJobVacancies = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from("job_vacancies")
        .select("*")
        .eq("status", "active") // Only show active jobs
        .order("created_at", { ascending: false })

      if (error) throw error
      setJobVacancies(data || [])
    } catch (error) {
      console.error("Error fetching job vacancies:", error)
      // Optionally show a toast or error message to the user
    } finally {
      setLoading(false)
    }
  }

  const filteredJobs = jobVacancies.filter((job) => {
    const matchesSearch =
      job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (job.department && job.department.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (job.location && job.location.toLowerCase().includes(searchTerm.toLowerCase()))
    return matchesSearch
  })

  const isJobExpired = (endDate: string) => {
    return new Date(endDate) < new Date()
  }

  return (
    <PublicLayout>
      <section className="py-12 md:py-24 lg:py-32 bg-background">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Join Our Team</h1>
            <p className="mt-4 text-lg text-muted-foreground">
              Explore exciting career opportunities at NNS Enterprise and become a part of our growing team.
            </p>
          </div>

          <div className="mt-12 flex justify-center">
            <div className="relative w-full max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <Input
                placeholder="Search job titles, locations, or departments..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 rounded-md border border-input focus:ring-primary focus:border-primary w-full"
              />
            </div>
          </div>

          {loading ? (
            <div className="text-center py-16 text-muted-foreground">Loading job listings...</div>
          ) : filteredJobs.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              No active job vacancies found at this time. Please check back later!
            </div>
          ) : (
            <div className="mt-16 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {filteredJobs.map((job) => (
                <Card
                  key={job.id}
                  className="flex flex-col justify-between hover:shadow-lg transition-shadow duration-300"
                >
                  <CardHeader>
                    <CardTitle className="text-xl font-semibold">{job.title}</CardTitle>
                    <CardDescription className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      {job.location || "Remote"}
                    </CardDescription>
                    <div className="flex flex-wrap gap-2 mt-2">
                      <Badge variant="outline">{job.employment_type}</Badge>
                      {job.department && <Badge variant="secondary">{job.department}</Badge>}
                      {isJobExpired(job.end_date) && <Badge variant="destructive">Expired</Badge>}
                    </div>
                  </CardHeader>
                  <CardContent className="flex-grow">
                    <p className="text-sm text-muted-foreground line-clamp-3">{job.description}</p>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mt-4">
                      <Calendar className="h-4 w-4" />
                      <span>Apply by: {new Date(job.end_date).toLocaleDateString()}</span>
                    </div>
                  </CardContent>
                  <div className="p-6 pt-0">
                    <Link href={`/job-listings/${job.id}`} passHref>
                      <Button variant="outline" className="w-full bg-transparent">
                        View Details <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </section>
    </PublicLayout>
  )
}
