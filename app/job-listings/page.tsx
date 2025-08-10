"use client"

import { useEffect, useState } from "react"
import { getSupabaseClient } from "@/lib/supabase"
import { PublicLayout } from "@/components/layout/public-layout"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { MapPin, DollarSign, CalendarDays } from "lucide-react"
import { format } from "date-fns"

interface JobVacancy {
  id: string
  title: string
  description: string
  location: string
  salary_range: string
  posted_date: string
  application_deadline: string
}

export default function JobListingsPage() {
  const [jobVacancies, setJobVacancies] = useState<JobVacancy[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = getSupabaseClient()

  useEffect(() => {
    const fetchJobVacancies = async () => {
      setLoading(true)
      setError(null)
      try {
        const { data, error } = await supabase
          .from("job_vacancies")
          .select("id, title, description, location, salary_range, posted_date, application_deadline")
          .order("posted_date", { ascending: false })

        if (error) {
          throw error
        }
        setJobVacancies(data || [])
      } catch (err: any) {
        console.error("Error fetching job vacancies:", err.message)
        setError("Failed to load job listings. Please try again later.")
      } finally {
        setLoading(false)
      }
    }

    fetchJobVacancies()
  }, [supabase])

  return (
    <PublicLayout>
      <section className="py-12 md:py-24 lg:py-32 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950">
        <div className="container px-4 md:px-6">
          <div className="max-w-3xl mx-auto text-center mb-12">
            <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">Join Our Team</h1>
            <p className="mt-4 text-lg text-muted-foreground">
              Explore exciting career opportunities at NNS Enterprise and become a part of our innovative team.
            </p>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {Array.from({ length: 6 }).map((_, index) => (
                <Card key={index} className="animate-pulse">
                  <CardHeader>
                    <div className="h-6 bg-gray-200 rounded w-3/4 mb-2 dark:bg-gray-700"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/2 dark:bg-gray-700"></div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="h-4 bg-gray-200 rounded dark:bg-gray-700"></div>
                    <div className="h-4 bg-gray-200 rounded w-5/6 dark:bg-gray-700"></div>
                  </CardContent>
                  <CardFooter className="flex justify-between">
                    <div className="h-8 bg-gray-200 rounded w-1/4 dark:bg-gray-700"></div>
                    <div className="h-8 bg-gray-200 rounded w-1/4 dark:bg-gray-700"></div>
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : error ? (
            <div className="text-center text-red-500 text-lg">{error}</div>
          ) : jobVacancies.length === 0 ? (
            <div className="text-center text-muted-foreground text-lg">
              No job vacancies available at the moment. Please check back later!
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {jobVacancies.map((job) => (
                <Card
                  key={job.id}
                  className="flex flex-col justify-between shadow-md hover:shadow-lg transition-shadow duration-300"
                >
                  <CardHeader>
                    <CardTitle className="text-xl font-semibold">{job.title}</CardTitle>
                    <CardDescription className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4" /> {job.location}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-foreground line-clamp-3">{job.description}</p>
                    <div className="mt-4 space-y-2 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4" /> Salary: {job.salary_range || "Negotiable"}
                      </div>
                      <div className="flex items-center gap-2">
                        <CalendarDays className="h-4 w-4" /> Posted: {format(new Date(job.posted_date), "MMM dd, yyyy")}
                      </div>
                      {job.application_deadline && (
                        <div className="flex items-center gap-2">
                          <CalendarDays className="h-4 w-4" /> Apply by:{" "}
                          {format(new Date(job.application_deadline), "MMM dd, yyyy")}
                        </div>
                      )}
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button asChild className="w-full">
                      <Link href={`/job-listings/${job.id}`}>View Details</Link>
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </div>
      </section>
    </PublicLayout>
  )
}
