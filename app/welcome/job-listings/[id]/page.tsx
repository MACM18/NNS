import { prisma } from "@/lib/prisma";
import { PublicLayout } from "@/components/layout/public-layout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { MapPin, DollarSign, CalendarDays, Briefcase } from "lucide-react";
import { format } from "date-fns";

interface JobVacancy {
  id: string;
  title: string;
  description: string;
  location: string;
  employment_type: string;
  salary_range: string;
  created_at: string;
  end_date: string;
}

async function fetchJobVacancy(id: string): Promise<JobVacancy | null> {
  const row = await prisma.jobVacancy.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      description: true,
      location: true,
      employmentType: true,
      salaryRange: true,
      createdAt: true,
      endDate: true,
    },
  });
  if (!row) return null;
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    location: row.location,
    employment_type: (row as any).employmentType,
    salary_range: (row as any).salaryRange,
    created_at:
      (row.createdAt as Date).toISOString?.() || (row as any).createdAt,
    end_date:
      (row.endDate as Date | null)?.toISOString?.() ||
      ((row as any).endDate ?? null),
  } as JobVacancy;
}

export default async function JobDetailsPage({ params }: any) {
  const job = await fetchJobVacancy(params.id);

  if (!job) {
    return (
      <PublicLayout>
        <section className='py-12 md:py-24 lg:py-32 text-center'>
          <div className='container px-4 md:px-6'>
            <h1 className='text-3xl font-bold tracking-tighter sm:text-5xl'>
              Job Not Found
            </h1>
            <p className='mt-4 text-lg text-muted-foreground'>
              The job listing you are looking for does not exist or has been
              removed.
            </p>
            <Button asChild className='mt-8'>
              <Link href='/job-listings'>Back to Job Listings</Link>
            </Button>
          </div>
        </section>
      </PublicLayout>
    );
  }

  return (
    <PublicLayout>
      <section className='py-12 md:py-24 lg:py-32'>
        <div className='container px-4 md:px-6 max-w-3xl mx-auto'>
          <Card>
            <CardHeader>
              <CardTitle className='text-3xl font-bold'>{job.title}</CardTitle>
              <CardDescription className='flex flex-wrap items-center gap-4 mt-2 text-muted-foreground'>
                <span className='flex items-center gap-1'>
                  <MapPin className='h-4 w-4' /> {job.location}
                </span>
                <span className='flex items-center gap-1'>
                  <Briefcase className='h-4 w-4' /> {job.employment_type}
                </span>
                <span className='flex items-center gap-1'>
                  <DollarSign className='h-4 w-4' />{" "}
                  {job.salary_range || "Negotiable"}
                </span>
              </CardDescription>
            </CardHeader>
            <CardContent className='space-y-6'>
              <div className='prose prose-sm max-w-none text-foreground'>
                <h2 className='text-xl font-semibold mb-2'>Job Description</h2>
                <p>{job.description}</p>
              </div>
              <div className='grid gap-2 text-sm text-muted-foreground'>
                <div className='flex items-center gap-2'>
                  <CalendarDays className='h-4 w-4' />
                  <span>
                    Posted: {format(new Date(job.created_at), "MMM dd, yyyy")}
                  </span>
                </div>
                {job.end_date && (
                  <div className='flex items-center gap-2'>
                    <CalendarDays className='h-4 w-4' />
                    <span>
                      Application Deadline:{" "}
                      {format(new Date(job.end_date), "MMM dd, yyyy")}
                    </span>
                  </div>
                )}
              </div>
              <Button asChild className='w-full'>
                <Link href='/welcome/contact'>Apply Now</Link>
              </Button>
              <Button
                variant='outline'
                asChild
                className='w-full bg-transparent'
              >
                <Link href='/job-listings'>Back to Job Listings</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>
    </PublicLayout>
  );
}
