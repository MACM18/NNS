import { prisma } from "@/lib/prisma";
export const dynamic = "force-dynamic";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { format } from "date-fns";
import { Briefcase, MapPin, Calendar, Clock, ArrowRight } from "lucide-react";

interface JobVacancy {
  id: string;
  title: string;
  description: string;
  location: string;
  employment_type: string;
  created_at: Date;
  end_date: Date | null;
}

async function fetchJobVacancies(): Promise<JobVacancy[]> {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const rows = await prisma.jobVacancy.findMany({
      where: {
        status: "active",
        endDate: { gte: today },
      },
      select: {
        id: true,
        title: true,
        description: true,
        location: true,
        employmentType: true,
        createdAt: true,
        endDate: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return rows.map((r: any) => ({
      id: String(r.id),
      title: r.title,
      description: r.description,
      location: r.location ?? "",
      employment_type: r.employmentType,
      created_at: r.createdAt as Date,
      end_date: (r.endDate as Date) ?? null,
    }));
  } catch (error) {
    console.error("Error fetching job vacancies:", error);
    return [];
  }
}

export default async function JobListingsPage() {
  const jobVacancies = await fetchJobVacancies();

  return (
    <div className="relative overflow-hidden bg-background min-h-screen">
      <div className='absolute inset-0 bg-grid-pattern opacity-5'></div>
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-accent/5"></div>

      {/* Hero Section */}
      <section className='relative pt-24 pb-12 md:pt-32 md:pb-16 text-center px-4'>
        <Badge variant="outline" className="mb-6 px-4 py-2 rounded-full border-primary/20 bg-primary/5 text-primary backdrop-blur-sm">
          Careers at NNS
        </Badge>
        <h1 className='text-4xl md:text-6xl font-bold tracking-tight text-foreground mb-6'>
          Current Job Openings
        </h1>
        <p className='text-xl text-muted-foreground max-w-2xl mx-auto'>
          Explore exciting career opportunities and join our growing team of professionals.
        </p>
      </section>

      <div className='container mx-auto px-4 md:px-6 pb-24'>
        <div className='grid gap-6 lg:grid-cols-2 lg:gap-8 max-w-6xl mx-auto'>
          {jobVacancies.length > 0 ? (
            jobVacancies.map((job) => (
              <div
                key={job.id}
                className='glass-card rounded-2xl p-6 flex flex-col justify-between hover:scale-[1.01] transition-transform duration-300 group'
              >
                <div className="mb-4">
                  <div className='flex items-center justify-between gap-4 mb-3'>
                    <Badge variant='secondary' className='font-medium bg-primary/10 text-primary hover:bg-primary/20'>
                      {job.employment_type}
                    </Badge>
                    <span className='flex items-center gap-1 text-xs text-muted-foreground'>
                      <MapPin className='h-3 w-3' />
                      {job.location}
                    </span>
                  </div>
                  <h3 className='text-xl font-bold mb-3 group-hover:text-primary transition-colors'>
                    {job.title}
                  </h3>
                  <p className='text-sm text-muted-foreground line-clamp-3 leading-relaxed'>
                    {job.description}
                  </p>
                </div>

                <div className='pt-4 border-t border-border/50 space-y-3 mt-auto'>
                  <div className='flex items-center justify-between text-xs text-muted-foreground'>
                    <span className='flex items-center gap-1'>
                      <Calendar className='h-3 w-3' />
                      Posted: {format(new Date(job.created_at), "MMM dd, yyyy")}
                    </span>
                    {job.end_date && (
                      <span className='flex items-center gap-1 text-orange-600/80 dark:text-orange-400/80 font-medium'>
                        <Clock className='h-3 w-3' />
                        Apply by: {format(new Date(job.end_date), "MMM dd, yyyy")}
                      </span>
                    )}
                  </div>
                  <Button asChild className='w-full glass-button group-hover:bg-primary/90'>
                    <Link href={`/welcome/job-listings/${job.id}`}>
                      View Details <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </div>
            ))
          ) : (
            <div className='col-span-full text-center py-24 glass-card rounded-3xl'>
              <div className="h-16 w-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <Briefcase className='h-8 w-8 text-muted-foreground' />
              </div>
              <h3 className='text-xl font-bold text-foreground'>No active openings</h3>
              <p className='text-muted-foreground mt-2 max-w-sm mx-auto'>
                We don't have any vacancies right now. Please check back later!
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
