import { notFound } from "next/navigation";
import { Calendar, User, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  author: string;
  published_at: string;
  featured_image?: string;
}

interface BlogPostPageProps {
  params: {
    slug: string;
  };
}

async function getBlogPost(slug: string): Promise<BlogPost | null> {
  try {
    const { data, error } = await supabase
      .from("blogs")
      .select("*")
      .eq("slug", slug)
      .eq("status", "active")
      .single();

    if (error) {
      console.error("Error fetching blog post:", error);
      return null;
    }

    return data;
  } catch (error) {
    console.error("Error fetching blog post:", error);
    return null;
  }
}

export async function generateMetadata({ params }: BlogPostPageProps) {
  const post = await getBlogPost(params.slug);

  if (!post) {
    return {
      title: "Post Not Found - NNS Enterprise Blog",
    };
  }

  return {
    title: `${post.title} - NNS Enterprise Blog`,
    description: post.excerpt,
  };
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const post = await getBlogPost(params.slug);

  if (!post) {
    notFound();
  }

  return (
    <div className='py-24'>
      <div className='mx-auto max-w-4xl px-6 lg:px-8'>
        {/* Back Button */}
        <div className='mb-8'>
          <Button variant='ghost' asChild>
            <Link href='/welcome/blog' className='inline-flex items-center'>
              <ArrowLeft className='mr-2 h-4 w-4' />
              Back to Blog
            </Link>
          </Button>
        </div>

        {/* Article Header */}
        <header className='mb-12'>
          {post.featured_image && (
            <div className='aspect-video w-full overflow-hidden rounded-lg mb-8'>
              <img
                src={post.featured_image}
                alt={post.title}
                className='h-full w-full object-cover'
              />
            </div>
          )}

          <div className='space-y-4'>
            <div className='flex items-center space-x-4 text-sm text-muted-foreground'>
              <div className='flex items-center space-x-1'>
                <Calendar className='h-4 w-4' />
                <time dateTime={post.published_at}>
                  {new Date(post.published_at).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </time>
              </div>
              <div className='flex items-center space-x-1'>
                <User className='h-4 w-4' />
                <span>{post.author}</span>
              </div>
            </div>

            <h1 className='text-4xl font-bold tracking-tight text-foreground sm:text-5xl'>
              {post.title}
            </h1>

            {post.excerpt && (
              <p className='text-xl text-muted-foreground leading-8'>
                {post.excerpt}
              </p>
            )}
          </div>
        </header>

        {/* Article Content */}
        <Card>
          <CardContent className='p-8'>
            <div
              className='prose prose-lg max-w-none text-foreground prose-headings:text-foreground prose-a:text-primary prose-strong:text-foreground prose-code:text-foreground prose-pre:bg-muted'
              dangerouslySetInnerHTML={{ __html: post.content }}
            />
          </CardContent>
        </Card>

        {/* Article Footer */}
        <footer className='mt-12 pt-8 border-t'>
          <div className='flex justify-between items-center'>
            <div className='text-sm text-muted-foreground'>
              Published on{" "}
              {new Date(post.published_at).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </div>
            <Button asChild>
              <Link href='/welcome/blog'>More Articles</Link>
            </Button>
          </div>
        </footer>
      </div>
    </div>
  );
}
