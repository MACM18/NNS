import { PublicLayout } from "@/components/layout/public-layout";
import {
  Handshake,
  TrendingUp,
  Award,
  ShieldCheck,
  Users,
  Rocket,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function WhyUsPage() {
  return (
    <PublicLayout>
      <section className='py-12 md:py-24 lg:py-32 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950'>
        <div className='container px-4 md:px-6'>
          <div className='max-w-3xl mx-auto text-center mb-12'>
            <h1 className='text-4xl font-bold tracking-tight text-foreground sm:text-5xl'>
              Why Partner with NNS Enterprise?
            </h1>
            <p className='mt-4 text-lg text-muted-foreground'>
              We are more than just a subcontractor; we are an extension of your
              team, committed to your project&apos;s success.
            </p>
          </div>

          <div className='grid gap-12 lg:grid-cols-2 lg:gap-24'>
            <div className='space-y-8'>
              <h2 className='text-3xl font-bold tracking-tight text-foreground'>
                Our Core Strengths
              </h2>
              <p className='text-muted-foreground leading-relaxed'>
                Choosing NNS Enterprise means opting for a partner dedicated to
                delivering exceptional results through a combination of
                expertise, efficiency, and unwavering commitment to quality.
              </p>
              <div className='grid gap-6 sm:grid-cols-2'>
                <Card>
                  <CardHeader className='flex flex-row items-center gap-4 pb-2'>
                    <Handshake className='h-6 w-6 text-primary' />
                    <CardTitle className='text-lg'>
                      Reliable Partnership
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className='text-sm text-muted-foreground'>
                      We integrate seamlessly with your operations, providing
                      dependable support and consistent communication.
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className='flex flex-row items-center gap-4 pb-2'>
                    <TrendingUp className='h-6 w-6 text-primary' />
                    <CardTitle className='text-lg'>
                      Efficiency & Speed
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className='text-sm text-muted-foreground'>
                      Our streamlined processes and experienced teams ensure
                      rapid deployment without compromising quality.
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className='flex flex-row items-center gap-4 pb-2'>
                    <Award className='h-6 w-6 text-primary' />
                    <CardTitle className='text-lg'>
                      Uncompromising Quality
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className='text-sm text-muted-foreground'>
                      Adherence to international standards and rigorous testing
                      guarantee robust and future-proof fiber networks.
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className='flex flex-row items-center gap-4 pb-2'>
                    <ShieldCheck className='h-6 w-6 text-primary' />
                    <CardTitle className='text-lg'>Safety First</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className='text-sm text-muted-foreground'>
                      Prioritizing safety protocols to ensure a secure working
                      environment for all projects.
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>

            <div className='space-y-8'>
              <h2 className='text-3xl font-bold tracking-tight text-foreground'>
                Our Team & Approach
              </h2>
              <p className='text-muted-foreground leading-relaxed'>
                Our success is built on the expertise of our dedicated
                professionals and a collaborative approach that puts your
                project&apos;s needs at the forefront.
              </p>
              <div className='grid gap-6 sm:grid-cols-2'>
                <Card>
                  <CardHeader className='flex flex-row items-center gap-4 pb-2'>
                    <Users className='h-6 w-6 text-primary' />
                    <CardTitle className='text-lg'>
                      Experienced Professionals
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className='text-sm text-muted-foreground'>
                      Our certified technicians and engineers bring years of
                      experience to every fiber deployment.
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className='flex flex-row items-center gap-4 pb-2'>
                    <Rocket className='h-6 w-6 text-primary' />
                    <CardTitle className='text-lg'>
                      Agile Project Management
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className='text-sm text-muted-foreground'>
                      Flexible and adaptive strategies to meet evolving project
                      requirements and timelines.
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
