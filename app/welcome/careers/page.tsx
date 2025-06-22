import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Calendar, Briefcase, Clock, ExternalLink } from "lucide-react";
import { supabase } from "@/lib/supabase";

// Define the JobVacancy type locally
type JobVacancy = {
  id: string | number;
  title: string;
  location: string;
  employment_type: string;
  experience_level: string;
  updated_at: string;
  description: string;
  application_email: string;
  application_url?: string;
  expires_at?: string;
  status: "active" | "disabled";
};

export const metadata = {
  title: "Careers - NNS Enterprise",
  description:
    "Join our team at NNS Enterprise. Explore current job opportunities and grow your career with us.",
};

async function getJobVacancies(): Promise<JobVacancy[]> {
  try {
    const { data, error } = await supabase
      .from("job_vacancies")
      .select("*")
      .eq("status", "active")
      .order("updated_at", { ascending: false });

    if (error) {
      console.error("Error fetching job vacancies:", error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error("Error fetching job vacancies:", error);
    return [];
  }
}

export default async function CareersPage() {
  const jobs = await getJobVacancies();

  return (
    <div className='py-24'>
      <div className='mx-auto max-w-7xl px-6 lg:px-8'>
        {/* Hero Section */}
        <div className='mx-auto max-w-2xl text-center'>
          <h1 className='text-4xl font-bold tracking-tight text-foreground sm:text-6xl'>
            Join Our{" "}
            <span className='bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent'>
              Team
            </span>
          </h1>
          <p className='mt-6 text-lg leading-8 text-muted-foreground'>
            Build your career with NNS Enterprise. We're looking for talented
            individuals who are passionate about making a difference and driving
            innovation.
          </p>
        </div>

        {/* Why Work With Us */}
        <section className='mt-24'>
          <div className='mx-auto max-w-2xl text-center mb-16'>
            <h2 className='text-3xl font-bold tracking-tight text-foreground sm:text-4xl'>
              Why Work With Us?
            </h2>
            <p className='mt-4 text-lg text-muted-foreground'>
              We offer more than just a job - we provide a platform for growth
              and impact.
            </p>
          </div>

          <div className='grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3'>
            <Card className='text-center'>
              <CardHeader>
                <CardTitle className='text-lg'>Growth Opportunities</CardTitle>
              </CardHeader>
              <CardContent>
                <p className='text-muted-foreground'>
                  Continuous learning and development programs to advance your
                  career
                </p>
              </CardContent>
            </Card>

            <Card className='text-center'>
              <CardHeader>
                <CardTitle className='text-lg'>Collaborative Culture</CardTitle>
              </CardHeader>
              <CardContent>
                <p className='text-muted-foreground'>
                  Work with talented professionals in a supportive team
                  environment
                </p>
              </CardContent>
            </Card>

            <Card className='text-center'>
              <CardHeader>
                <CardTitle className='text-lg'>Competitive Benefits</CardTitle>
              </CardHeader>
              <CardContent>
                <p className='text-muted-foreground'>
                  Comprehensive benefits package including health insurance and
                  retirement plans
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Job Listings */}
        <section className='mt-24'>
          <div className='mx-auto max-w-2xl text-center mb-16'>
            <h2 className='text-3xl font-bold tracking-tight text-foreground sm:text-4xl'>
              Current Openings
            </h2>
            <p className='mt-4 text-lg text-muted-foreground'>
              Explore our current job opportunities and find your next career
              move.
            </p>
          </div>

          {jobs.length > 0 ? (
            <div className='space-y-6'>
              {jobs.map((job) => (
                <Card
                  key={job.id}
                  className='hover:shadow-lg transition-shadow duration-300'
                >
                  <CardHeader>
                    <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4'>
                      <div>
                        <CardTitle className='text-xl mb-2'>
                          {job.title}
                        </CardTitle>
                        <div className='flex flex-wrap items-center gap-4 text-sm text-muted-foreground'>
                          <div className='flex items-center space-x-1'>
                            <MapPin className='h-4 w-4' />
                            <span>{job.location}</span>
                          </div>
                          <div className='flex items-center space-x-1'>
                            <Briefcase className='h-4 w-4' />
                            <span>{job.employment_type}</span>
                          </div>
                          <div className='flex items-center space-x-1'>
                            <Clock className='h-4 w-4' />
                            <span>{job.experience_level}</span>
                          </div>
                          <div className='flex items-center space-x-1'>
                            <Calendar className='h-4 w-4' />
                            <span>
                              Posted{" "}
                              {new Date(job.updated_at).toLocaleDateString(
                                "en-US",
                                {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                }
                              )}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className='flex flex-wrap gap-2'>
                        <Badge variant='secondary'>{job.employment_type}</Badge>
                        <Badge variant='outline'>{job.experience_level}</Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className='space-y-4'>
                      <p className='text-muted-foreground'>{job.description}</p>

                      <div className='flex flex-col sm:flex-row gap-3'>
                        <Button asChild>
                          <a
                            href={`mailto:${job.application_email}?subject=Application for ${job.title}`}
                          >
                            Apply via Email
                          </a>
                        </Button>

                        {job.application_url && (
                          <Button variant='outline' asChild>
                            <a
                              href={job.application_url}
                              target='_blank'
                              rel='noopener noreferrer'
                              className='inline-flex items-center'
                            >
                              Apply Online
                              <ExternalLink className='ml-2 h-4 w-4' />
                            </a>
                          </Button>
                        )}
                      </div>

                      {job.expires_at && (
                        <p className='text-sm text-muted-foreground'>
                          Application deadline:{" "}
                          {new Date(job.expires_at).toLocaleDateString(
                            "en-US",
                            {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            }
                          )}
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className='text-center'>
              <div className='mx-auto max-w-md'>
                <h3 className='text-lg font-semibold text-foreground mb-2'>
                  No current openings
                </h3>
                <p className='text-muted-foreground mb-6'>
                  We don't have any job openings at the moment, but we're always
                  looking for talented individuals. Feel free to send us your
                  resume for future opportunities.
                </p>
                <Button asChild>
                  <a href='mailto:careers@nns.lk?subject=Future Opportunities'>
                    Send Resume
                  </a>
                </Button>
              </div>
            </div>
          )}
        </section>

        {/* Contact for Opportunities */}
        <section className='mt-24 bg-muted/30 rounded-2xl p-12 text-center'>
          <h2 className='text-2xl font-bold text-foreground mb-4'>
            Don't see the right fit?
          </h2>
          <p className='text-muted-foreground mb-6 max-w-2xl mx-auto'>
            We're always interested in connecting with talented professionals.
            Send us your resume and let us know how you'd like to contribute to
            our mission.
          </p>
          <Button asChild size='lg'>
            <a href='mailto:careers@nns.lk?subject=General Inquiry'>
              Get in Touch
            </a>
          </Button>
        </section>
      </div>
    </div>
  );
}
