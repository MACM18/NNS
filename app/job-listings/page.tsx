import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { MapPin, Briefcase, CalendarDays } from "lucide-react"
import { supabase } from "@/lib/supabase"
import type { JobVacancy } from "@/types/content"
import Link from "next/link"

export const revalidate = 0 // Ensure data is fresh on every request

export default async function JobListingsPage() {
  const { data: jobVacancies, error } = await supabase
    .from("job_vacancies")
    .select("*")
    .eq("status", "active") // Only show active jobs
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching job vacancies:", error)
    return (
      <div className="container mx-auto py-12 px-4 md:px-6">
        <h1 className="text-4xl font-bold text-center mb-8">Job Opportunities</h1>
        <p className="text-center text-red-500">Failed to load job listings. Please try again later.</p>
      </div>
    )
  }

  const activeJobVacancies: JobVacancy[] = jobVacancies || []

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950 py-12 px-4 md:px-6">
      <div className="container mx-auto">
        <h1 className="text-4xl md:text-5xl font-extrabold text-center text-gray-900 dark:text-gray-50 mb-6">
          Join Our Team
        </h1>
        <p className="text-xl text-center text-gray-600 dark:text-gray-400 mb-12 max-w-3xl mx-auto">
          Explore exciting career opportunities at NNS Enterprise and become a part of our mission to build the future
          of connectivity.
        </p>

        {activeJobVacancies.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-2xl text-gray-700 dark:text-gray-300">
              No active job vacancies at the moment. Please check back later!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {activeJobVacancies.map((job) => (
              <Card key={job.id} className="flex flex-col h-full hover:shadow-lg transition-shadow duration-300">
                <CardHeader>
                  <CardTitle className="text-2xl font-bold text-gray-900 dark:text-gray-50">{job.title}</CardTitle>
                  <CardDescription className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                    <MapPin className="h-4 w-4" />
                    {job.location || "Remote"}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-grow space-y-4">
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary" className="flex items-center gap-1">
                      <Briefcase className="h-3 w-3" />
                      {job.employment_type}
                    </Badge>
                    {job.department && <Badge variant="outline">{job.department}</Badge>}
                    {job.salary_range && <Badge variant="outline">{job.salary_range}</Badge>}
                  </div>
                  <p className="text-gray-700 dark:text-gray-300 line-clamp-3">{job.description}</p>
                  <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                    <CalendarDays className="h-4 w-4" />
                    Application Deadline: {new Date(job.end_date).toLocaleDateString()}
                  </div>
                </CardContent>
                {/* Placeholder for actual job detail page */}
                <div className="p-6 pt-0">
                  <Link href={`/job-listings/${job.id}`} passHref>
                    <Button className="w-full">View Details</Button>
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
