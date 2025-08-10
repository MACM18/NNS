import { createClient } from "@/lib/supabase-server"
import { PublicLayout } from "@/components/layout/public-layout"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CalendarIcon, MapPinIcon, BriefcaseIcon } from "lucide-react"
import Link from "next/link"

interface JobVacancy {
  id: string
  title: string
  description: string
  location: string
  type: string
  salary_range: string
  created_at: string // Corrected column name
  end_date: string // Corrected column name for application deadline
}

async function fetchJobVacancies(): Promise<JobVacancy[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("job_vacancies")
    .select("id, title, description, location, type, salary_range, created_at, end_date") // Select correct columns
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching job vacancies:", error.message)
    return []
  }
  return data as JobVacancy[]
}

export default async function JobListingsPage() {
  const jobVacancies = await fetchJobVacancies()

  return (
    <PublicLayout>
      <main className="container mx-auto py-12 px-4 md:px-6">
        <section className="text-center mb-12">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">Current Job Openings</h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Explore exciting career opportunities and join our growing team.
          </p>
        </section>

        <section className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {jobVacancies.length > 0 ? (
            jobVacancies.map((job) => (
              <Card key={job.id} className="flex flex-col">
                <CardHeader>
                  <CardTitle>{job.title}</CardTitle>
                  <CardDescription className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPinIcon className="h-4 w-4" />
                    {job.location}
                  </CardDescription>
                  <CardDescription className="flex items-center gap-2 text-sm text-muted-foreground">
                    <BriefcaseIcon className="h-4 w-4" />
                    {job.type}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-1">
                  <p className="text-sm text-gray-600 line-clamp-3">{job.description}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Badge variant="secondary">{job.salary_range}</Badge>
                    <Badge variant="outline" className="flex items-center gap-1">
                      <CalendarIcon className="h-3 w-3" />
                      Posted: {new Date(job.created_at).toLocaleDateString()}
                    </Badge>
                    {job.end_date && (
                      <Badge variant="outline" className="flex items-center gap-1">
                        <CalendarIcon className="h-3 w-3" />
                        Apply by: {new Date(job.end_date).toLocaleDateString()}
                      </Badge>
                    )}
                  </div>
                </CardContent>
                <CardFooter>
                  <Button asChild className="w-full">
                    <Link href={`/job-listings/${job.id}`}>View Details</Link>
                  </Button>
                </CardFooter>
              </Card>
            ))
          ) : (
            <div className="col-span-full text-center text-muted-foreground">
              No job vacancies found at the moment. Please check back later!
            </div>
          )}
        </section>
      </main>
    </PublicLayout>
  )
}
