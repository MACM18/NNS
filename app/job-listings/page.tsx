import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { getSupabaseClient } from "@/lib/supabase"
import { Briefcase, MapPin, DollarSign, Calendar } from "lucide-react"
import Link from "next/link"

interface JobVacancy {
  id: string
  title: string
  location: string
  salary_range: string
  employment_type: string
  description: string
  posted_at: string
}

export default async function JobListingsPage() {
  const supabase = getSupabaseClient()
  const { data: jobVacancies, error } = await supabase
    .from("job_vacancies")
    .select("*")
    .order("posted_at", { ascending: false })

  if (error) {
    console.error("Error fetching job vacancies:", error.message)
    return <div className="container mx-auto py-8 text-center text-red-500">Failed to load job listings.</div>
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <header className="text-center mb-12">
          <h1 className="text-4xl font-extrabold text-gray-900 sm:text-5xl lg:text-6xl leading-tight">Join Our Team</h1>
          <p className="mt-4 text-xl text-gray-600 max-w-2xl mx-auto">
            Explore exciting career opportunities and become a part of our growing team dedicated to connecting
            communities.
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {jobVacancies.length === 0 ? (
            <div className="col-span-full text-center text-gray-600 text-lg">
              No job vacancies currently available. Please check back later!
            </div>
          ) : (
            jobVacancies.map((job) => (
              <Card
                key={job.id}
                className="flex flex-col justify-between shadow-lg hover:shadow-xl transition-shadow duration-300 ease-in-out"
              >
                <CardHeader>
                  <CardTitle className="text-2xl font-bold text-gray-900">{job.title}</CardTitle>
                  <CardDescription className="text-gray-600 mt-2 line-clamp-3">{job.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 text-gray-700">
                  <div className="flex items-center text-sm">
                    <MapPin className="mr-2 h-4 w-4 text-gray-500" /> {job.location}
                  </div>
                  <div className="flex items-center text-sm">
                    <DollarSign className="mr-2 h-4 w-4 text-gray-500" /> {job.salary_range}
                  </div>
                  <div className="flex items-center text-sm">
                    <Briefcase className="mr-2 h-4 w-4 text-gray-500" /> {job.employment_type}
                  </div>
                  <div className="flex items-center text-sm">
                    <Calendar className="mr-2 h-4 w-4 text-gray-500" /> Posted:{" "}
                    {new Date(job.posted_at).toLocaleDateString()}
                  </div>
                </CardContent>
                <CardFooter>
                  <Link href={`/job-listings/${job.id}`} className="w-full">
                    <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200">
                      View Details
                    </Button>
                  </Link>
                </CardFooter>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
