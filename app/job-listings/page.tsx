"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Briefcase, MapPin, DollarSign, Calendar, ExternalLink } from "lucide-react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { supabase } from "@/lib/supabase"
import { format } from "date-fns"
import { Separator } from "@/components/ui/separator"
import { Input } from "@/components/ui/input"

interface JobVacancy {
  id: string
  title: string
  description: string
  location: string
  salary_range: string
  employment_type: string
  created_at: string // Changed from posted_at to created_at
  responsibilities: string[]
  requirements: string[]
}

export default function JobListingsPage() {
  const [jobVacancies, setJobVacancies] = useState<JobVacancy[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")

  useEffect(() => {
    const fetchJobVacancies = async () => {
      setLoading(true)
      setError(null)
      try {
        const { data, error } = await supabase
          .from("job_vacancies")
          .select("*")
          .order("created_at", { ascending: false }) // Changed from posted_at to created_at

        if (error) {
          throw error
        }
        setJobVacancies(data || [])
      } catch (err: any) {
        console.error("Error fetching job vacancies:", err.message)
        setError("Failed to load job vacancies. Please try again later.")
      } finally {
        setLoading(false)
      }
    }

    fetchJobVacancies()
  }, [])

  const filteredJobs = jobVacancies.filter(
    (job) =>
      job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.employment_type.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <header className="text-center mb-12">
          <h1 className="text-4xl font-extrabold text-gray-900 sm:text-5xl md:text-6xl leading-tight">Join Our Team</h1>
          <p className="mt-4 text-xl text-gray-600 max-w-2xl mx-auto">
            Explore exciting career opportunities and become a part of our innovative telecom solutions team.
          </p>
          <div className="mt-8 max-w-md mx-auto">
            <Input
              type="text"
              placeholder="Search jobs by title, location, or type..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </header>

        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-6 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-full"></div>
                  <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                </CardContent>
                <CardFooter className="flex justify-between">
                  <div className="h-8 bg-gray-200 rounded w-24"></div>
                  <div className="h-8 bg-gray-200 rounded w-24"></div>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}

        {error && (
          <div className="text-center text-red-600 text-lg mt-8">
            <p>{error}</p>
          </div>
        )}

        {!loading && !error && filteredJobs.length === 0 && (
          <div className="text-center text-gray-700 text-lg mt-8">
            <p>No job vacancies found matching your criteria.</p>
          </div>
        )}

        {!loading && !error && filteredJobs.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredJobs.map((job) => (
              <Card
                key={job.id}
                className="flex flex-col justify-between shadow-lg hover:shadow-xl transition-shadow duration-300"
              >
                <CardHeader>
                  <CardTitle className="text-2xl font-bold text-gray-800">{job.title}</CardTitle>
                  <CardDescription className="flex items-center text-gray-600 mt-2">
                    <MapPin className="h-4 w-4 mr-1 text-blue-500" /> {job.location}
                  </CardDescription>
                  <CardDescription className="flex items-center text-gray-600 mt-1">
                    <Calendar className="h-4 w-4 mr-1 text-blue-500" /> Posted:{" "}
                    {format(new Date(job.created_at), "MMM dd, yyyy")}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-grow">
                  <div className="flex flex-wrap gap-2 mb-4">
                    <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                      <Briefcase className="h-3 w-3 mr-1" /> {job.employment_type}
                    </Badge>
                    {job.salary_range && (
                      <Badge variant="secondary" className="bg-green-100 text-green-800">
                        <DollarSign className="h-3 w-3 mr-1" /> {job.salary_range}
                      </Badge>
                    )}
                  </div>
                  <p className="text-gray-700 line-clamp-3">{job.description}</p>
                  <Separator className="my-4" />
                  <h3 className="font-semibold text-gray-800 mb-2">Key Responsibilities:</h3>
                  <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                    {job.responsibilities?.slice(0, 2).map((resp, index) => (
                      <li key={index}>{resp}</li>
                    ))}
                    {job.responsibilities?.length > 2 && <li>...</li>}
                  </ul>
                </CardContent>
                <CardFooter className="flex justify-end pt-4">
                  <Link href={`/job-listings/${job.id}`} passHref>
                    <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                      View Details <ExternalLink className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
