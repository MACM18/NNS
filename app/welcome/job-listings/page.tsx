import { supabaseServer } from "@/lib/supabase-server";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { format } from "date-fns";
import { Briefcase, MapPin, Calendar, Clock } from "lucide-react";

interface JobVacancy {
  id: string;
  title: string;
  description: string;
  location: string;
  employment_type: string;
  created_at: string;
  end_date: string;
}

async function fetchJobVacancies(): Promise<JobVacancy[]> {
  const supabase = supabaseServer;
  const today = new Date().toISOString().split("T")[0]; // Get current date in YYYY-MM-DD format
  const { data, error } = await supabase
    .from("job_vacancies")
    .select(
      "id, title, description, location, employment_type, created_at, end_date"
    )
    .eq("status", "active") // Only show active jobs
    .gte("end_date", today) // Filter to show only jobs not yet expired
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching job vacancies:", error.message);
    return [];
  }
  return data as JobVacancy[];
}

export default async function JobListingsPage() {
  const jobVacancies = await fetchJobVacancies();

  return (
    <section className='py-12 md:py-24 lg:py-32 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950'>
      <div className='container mx-auto px-4 md:px-6'>
        <div className='max-w-6xl mx-auto'>
          <div className='max-w-3xl mx-auto text-center mb-12'>
            <h1 className='text-4xl font-bold tracking-tight text-foreground sm:text-5xl'>
              Current Job Openings
            </h1>
            <p className='mt-4 text-lg text-muted-foreground'>
              Explore exciting career opportunities at NNS Enterprise and join
              our growing team.
            </p>
          </div>
          <div className='grid gap-6 lg:grid-cols-2 lg:gap-8'>
            {jobVacancies.length > 0 ? (
              jobVacancies.map((job) => (
                <Card
                  key={job.id}
                  className='flex flex-col justify-between hover:shadow-lg transition-all duration-300 hover:scale-[1.02]'
                >
                  <CardHeader>
                    <div className='flex items-start justify-between gap-2'>
                      <CardTitle className='text-xl'>{job.title}</CardTitle>
                      <Briefcase className='h-5 w-5 text-primary flex-shrink-0' />
                    </div>
                    <CardDescription className='flex flex-wrap items-center gap-2 mt-2'>
                      <Badge variant='secondary' className='font-medium'>
                        {job.employment_type}
                      </Badge>
                      <span className='flex items-center gap-1 text-xs'>
                        <MapPin className='h-3 w-3' />
                        {job.location}
                      </span>
                    </CardDescription>
                  </CardHeader>
                  <CardContent className='space-y-4'>
                    <p className='text-sm text-muted-foreground line-clamp-3 leading-relaxed'>
                      {job.description}
                    </p>
                    <div className='flex flex-col gap-2 text-xs text-muted-foreground border-t pt-3'>
                      <span className='flex items-center gap-1'>
                        <Calendar className='h-3 w-3' />
                        Posted:{" "}
                        {format(new Date(job.created_at), "MMM dd, yyyy")}
                      </span>
                      {job.end_date && (
                        <span className='flex items-center gap-1'>
                          <Clock className='h-3 w-3' />
                          Apply by:{" "}
                          {format(new Date(job.end_date), "MMM dd, yyyy")}
                        </span>
                      )}
                    </div>
                    <Button asChild className='w-full'>
                      <Link href={`/welcome/job-listings/${job.id}`}>
                        View Details
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className='col-span-full text-center py-12'>
                <Briefcase className='h-12 w-12 text-muted-foreground/50 mx-auto mb-4' />
                <p className='text-lg text-muted-foreground'>
                  No active job vacancies available at the moment.
                </p>
                <p className='text-sm text-muted-foreground mt-2'>
                  Please check back later for new opportunities!
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
