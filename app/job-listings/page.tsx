import { createClient } from "@/lib/supabase-server"
import { PublicLayout } from "@/components/layout/public-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { format } from "date-fns"

interface JobVacancy {
  id: string
  title: string
  description: string
  location: string
  employment_type: string
  created_at: string // Corrected column name
  end_date: string // Corrected column name for application deadline
}

async function fetchJobVacancies(): Promise<JobVacancy[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("job_vacancies")
    .select("id, title, description, location, employment_type, created_at, end_date")
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching job vacancies:", error.message)
    // In a real application, you might want to throw an error or return an empty array
    return []
  }
  return data as JobVacancy[]
}

export default async function JobListingsPage() {
  const jobVacancies = await fetchJobVacancies()

  return (
    <PublicLayout>
      <section className="py-12 md:py-24 lg:py-32">
        <div className="container px-4 md:px-6">
          <div className="flex flex-col items-center justify-center space-y-4 text-center">
            <div className="space-y-2">
              <h1 className="text-3xl font-bold tracking-tighter sm:text-5xl">Current Job Openings</h1>
              <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                Explore exciting career opportunities at NNS Enterprise and join our growing team.
              </p>
            </div>
          </div>
          <div className="mx-auto grid max-w-5xl items-start gap-6 py-12 lg:grid-cols-2 lg:gap-12">
            {jobVacancies.length > 0 ? (
              jobVacancies.map((job) => (
                <Card
                  key={job.id}
                  className="flex flex-col justify-between hover:shadow-lg transition-shadow duration-300"
                >
                  <CardHeader>
                    <CardTitle>{job.title}</CardTitle>
                    <CardDescription className="flex items-center gap-2">
                      <Badge variant="secondary">{job.employment_type}</Badge>
                      <span>{job.location}</span>
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground line-clamp-3">{job.description}</p>
                    <div className="flex justify-between items-center text-xs text-muted-foreground">
                      <span>Posted: {format(new Date(job.created_at), "MMM dd, yyyy")}</span>
                      {job.end_date && <span>Apply by: {format(new Date(job.end_date), "MMM dd, yyyy")}</span>}
                    </div>
                    <Button asChild className="w-full">
                      <Link href={`/job-listings/${job.id}`}>View Details</Link>
                    </Button>
                  </CardContent>
                </Card>
              ))
            ) : (
              <p className="col-span-full text-center text-muted-foreground">
                No job vacancies available at the moment. Please check back later!
              </p>
            )}
          </div>
        </div>
      </section>
    </PublicLayout>
  )
}
