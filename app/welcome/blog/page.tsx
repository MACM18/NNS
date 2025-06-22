import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, Calendar, User } from "lucide-react";
import { supabase } from "@/lib/supabase";

export const metadata = {
  title: "Blog - NNS Enterprise",
  description:
    "Stay updated with the latest insights, news, and industry trends from NNS Enterprise.",
};

async function getBlogPosts(): Promise<BlogPost[]> {
  try {
    const { data, error } = await supabase
      .from("blogs")
      .select("*")
      .eq("status", "active")
      .order("published_at", { ascending: false });

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

export default async function BlogPage() {
  const posts = await getBlogPosts();

  return (
    <div className='py-24'>
      <div className='mx-auto max-w-7xl px-6 lg:px-8'>
        {/* Hero Section */}
        <div className='mx-auto max-w-2xl text-center'>
          <h1 className='text-4xl font-bold tracking-tight text-foreground sm:text-6xl'>
            Our{" "}
            <span className='bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent'>
              Blog
            </span>
          </h1>
          <p className='mt-6 text-lg leading-8 text-muted-foreground'>
            Insights, trends, and expert opinions on business transformation,
            technology, and industry developments.
          </p>
        </div>

        {/* Blog Posts */}
        {posts.length > 0 ? (
          <div className='mt-24 grid grid-cols-1 gap-8 lg:grid-cols-2 xl:grid-cols-3'>
            {posts.map((post) => (
              <Card
                key={post.id}
                className='h-full hover:shadow-lg transition-all duration-300 group'
              >
                {post.featured_image_url && (
                  <div className='aspect-video w-full overflow-hidden rounded-t-lg'>
                    <img
                      src={post.featured_image_url}
                      alt={post.title}
                      className='h-full w-full object-cover group-hover:scale-105 transition-transform duration-300'
                    />
                  </div>
                )}
                <CardHeader>
                  <div className='flex items-center space-x-4 text-sm text-muted-foreground'>
                    <div className='flex items-center space-x-1'>
                      <Calendar className='h-4 w-4' />
                      <time dateTime={post.published_at}>
                        {new Date(post.published_at ?? "").toLocaleDateString(
                          "en-US",
                          {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          }
                        )}
                      </time>
                    </div>
                    <div className='flex items-center space-x-1'>
                      <User className='h-4 w-4' />
                      <span>{post.author}</span>
                    </div>
                  </div>
                  <CardTitle className='group-hover:text-primary transition-colors'>
                    <Link
                      href={`/welcome/blog/${post.slug}`}
                      className='hover:underline'
                    >
                      {post.title}
                    </Link>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className='text-muted-foreground line-clamp-3 mb-4'>
                    {post.excerpt}
                  </p>
                  <Button
                    variant='ghost'
                    size='sm'
                    asChild
                    className='p-0 h-auto'
                  >
                    <Link
                      href={`/welcome/blog/${post.slug}`}
                      className='text-primary hover:text-primary/80 transition-colors inline-flex items-center'
                    >
                      Read more
                      <ArrowRight className='ml-1 h-4 w-4' />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className='mt-24 text-center'>
            <div className='mx-auto max-w-md'>
              <h3 className='text-lg font-semibold text-foreground mb-2'>
                No blog posts yet
              </h3>
              <p className='text-muted-foreground mb-6'>
                We're working on some great content. Check back soon for our
                latest insights and updates!
              </p>
              <Button asChild>
                <Link href='/welcome'>Return to Home</Link>
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export interface BlogPost {
  id: number;
  title: string;
  content: string;
  excerpt?: string;
  author: string;
  category?: string;
  tags?: string[];
  featured_image_url?: string;
  slug?: string;
  meta_description?: string;
  reading_time?: number;
  status: "active" | "disabled";
  published_at?: string;
  created_at: string;
  updated_at: string;
}
