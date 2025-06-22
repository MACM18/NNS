import Link from "next/link";
import { ArrowRight, Briefcase, Users, Target, Award } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { supabase } from "@/lib/supabase";

// Define BlogPost type here if not exported from supabase
type BlogPost = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  published_at: string;
  [key: string]: any;
};

async function getRecentPosts(): Promise<BlogPost[]> {
  try {
    const { data, error } = await supabase
      .from("blogs")
      .select("*")
      .eq("status", "active")
      .order("published_at", { ascending: false })
      .limit(3);

    if (error) {
      console.error("Error fetching blog posts:", error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error("Error fetching blog posts:", error);
    return [];
  }
}

export default async function WelcomePage() {
  const recentPosts = await getRecentPosts();

  return (
    <div className='flex flex-col'>
      {/* Hero Section */}
      <section className='relative overflow-hidden bg-gradient-to-br from-primary/5 via-background to-secondary/5 py-24 sm:py-32'>
        <div className='absolute inset-0 bg-grid-pattern opacity-5'></div>
        <div className='relative mx-auto max-w-7xl px-6 lg:px-8'>
          <div className='mx-auto max-w-3xl text-center'>
            <h1 className='text-4xl font-bold tracking-tight text-foreground sm:text-6xl'>
              Welcome to{" "}
              <span className='bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent'>
                NNS Enterprise
              </span>
            </h1>
            <p className='mt-6 text-lg leading-8 text-muted-foreground'>
              Leading the way in innovative business solutions and sustainable
              growth. We partner with organizations to unlock their full
              potential through strategic consulting, technology integration,
              and operational excellence.
            </p>
            <div className='mt-10 flex items-center justify-center gap-x-6'>
              <Button asChild size='lg' className='text-base'>
                <Link href='/welcome/about'>
                  Learn More
                  <ArrowRight className='ml-2 h-4 w-4' />
                </Link>
              </Button>
              <Button variant='outline' size='lg' asChild className='text-base'>
                <Link href='/welcome/contact'>Get in Touch</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className='py-24 bg-muted/30'>
        <div className='mx-auto max-w-7xl px-6 lg:px-8'>
          <div className='mx-auto max-w-2xl text-center'>
            <h2 className='text-3xl font-bold tracking-tight text-foreground sm:text-4xl'>
              Why Choose NNS Enterprise?
            </h2>
            <p className='mt-4 text-lg text-muted-foreground'>
              We deliver exceptional value through our core competencies and
              commitment to excellence.
            </p>
          </div>
          <div className='mx-auto mt-16 max-w-5xl'>
            <div className='grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4'>
              <Card className='text-center hover:shadow-lg transition-shadow duration-300'>
                <CardHeader>
                  <div className='mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-primary'>
                    <Briefcase className='h-6 w-6 text-primary-foreground' />
                  </div>
                  <CardTitle className='text-lg'>Expert Consulting</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>
                    Strategic guidance from industry experts with proven track
                    records
                  </CardDescription>
                </CardContent>
              </Card>

              <Card className='text-center hover:shadow-lg transition-shadow duration-300'>
                <CardHeader>
                  <div className='mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-primary'>
                    <Users className='h-6 w-6 text-primary-foreground' />
                  </div>
                  <CardTitle className='text-lg'>Team Excellence</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>
                    Dedicated professionals committed to delivering outstanding
                    results
                  </CardDescription>
                </CardContent>
              </Card>

              <Card className='text-center hover:shadow-lg transition-shadow duration-300'>
                <CardHeader>
                  <div className='mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-primary'>
                    <Target className='h-6 w-6 text-primary-foreground' />
                  </div>
                  <CardTitle className='text-lg'>Focused Solutions</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>
                    Tailored approaches that address your specific business
                    challenges
                  </CardDescription>
                </CardContent>
              </Card>

              <Card className='text-center hover:shadow-lg transition-shadow duration-300'>
                <CardHeader>
                  <div className='mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-primary'>
                    <Award className='h-6 w-6 text-primary-foreground' />
                  </div>
                  <CardTitle className='text-lg'>Proven Results</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>
                    A track record of successful projects and satisfied clients
                  </CardDescription>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Recent Updates Section */}
      <section className='py-24'>
        <div className='mx-auto max-w-7xl px-6 lg:px-8'>
          <div className='mx-auto max-w-2xl text-center'>
            <h2 className='text-3xl font-bold tracking-tight text-foreground sm:text-4xl'>
              Recent Updates
            </h2>
            <p className='mt-4 text-lg text-muted-foreground'>
              Stay informed with our latest insights, news, and industry
              updates.
            </p>
          </div>

          {recentPosts.length > 0 ? (
            <div className='mx-auto mt-16 grid max-w-2xl grid-cols-1 gap-8 lg:mx-0 lg:max-w-none lg:grid-cols-3'>
              {recentPosts.map((post) => (
                <Card
                  key={post.id}
                  className='hover:shadow-lg transition-all duration-300 group'
                >
                  <CardHeader>
                    <div className='flex items-center space-x-1 text-sm text-muted-foreground'>
                      <time dateTime={post.published_at}>
                        {new Date(post.published_at).toLocaleDateString(
                          "en-US",
                          {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          }
                        )}
                      </time>
                    </div>
                    <CardTitle className='group-hover:text-primary transition-colors'>
                      <Link href={`/welcome/blog/${post.slug}`}>
                        {post.title}
                      </Link>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className='line-clamp-3'>
                      {post.excerpt}
                    </CardDescription>
                    <div className='mt-4'>
                      <Link
                        href={`/welcome/blog/${post.slug}`}
                        className='text-sm font-semibold text-primary hover:text-primary/80 transition-colors inline-flex items-center'
                      >
                        Read more
                        <ArrowRight className='ml-1 h-3 w-3' />
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className='mx-auto mt-16 text-center'>
              <p className='text-muted-foreground'>
                No recent posts available.
              </p>
              <Button asChild className='mt-4'>
                <Link href='/welcome/blog'>View All Posts</Link>
              </Button>
            </div>
          )}

          <div className='mt-12 text-center'>
            <Button asChild variant='outline'>
              <Link href='/welcome/blog'>
                View All Posts
                <ArrowRight className='ml-2 h-4 w-4' />
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
