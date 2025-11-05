import { supabaseServer } from "@/lib/supabase-server";
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
import { CalendarDays, User, Tag } from "lucide-react";
import { format } from "date-fns";

interface Blog {
  id: string;
  title: string;
  content: string;
  excerpt: string;
  category: string;
  tags: string[];
  featured_image_url: string;
  slug: string;
  meta_description: string;
  status: string;
  author: string;
  created_at: string;
}

async function fetchBlog(slug: string): Promise<Blog | null> {
  const supabase = supabaseServer;
  const { data, error } = await supabase
    .from("blogs")
    .select(
      "id, title, content, excerpt, category, tags, featured_image_url, slug, meta_description, status, author, created_at"
    )
    .eq("slug", slug)
    .single();

  if (error) {
    console.error("Error fetching blog:", error.message);
    return null;
  }
  return data as Blog;
}

export default async function InsightDetailsPage({
  params,
}: {
  params: { id: string };
}) {
  const blog = await fetchBlog(params.id);

  if (!blog) {
    return (
      <PublicLayout>
        <section className='py-12 md:py-24 lg:py-32 text-center'>
          <div className='container px-4 md:px-6'>
            <h1 className='text-3xl font-bold tracking-tighter sm:text-5xl'>
              Insight Not Found
            </h1>
            <p className='mt-4 text-lg text-muted-foreground'>
              The insight or blog post you are looking for does not exist or has
              been removed.
            </p>
            <Button asChild className='mt-8'>
              <Link href='/insights'>Back to Insights</Link>
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
              <CardTitle className='text-3xl font-bold'>{blog.title}</CardTitle>
              <CardDescription className='flex flex-wrap items-center gap-4 mt-2 text-muted-foreground'>
                <span className='flex items-center gap-1'>
                  <User className='h-4 w-4' /> {blog.author}
                </span>
                <span className='flex items-center gap-1'>
                  <CalendarDays className='h-4 w-4' />{" "}
                  {format(new Date(blog.created_at), "MMM dd, yyyy")}
                </span>
                <span className='flex items-center gap-1'>
                  <Tag className='h-4 w-4' /> {blog.category}
                </span>
                {blog.tags && blog.tags.length > 0 && (
                  <span className='flex items-center gap-1'>
                    <Tag className='h-4 w-4' /> {blog.tags.join(", ")}
                  </span>
                )}
                <span className='flex items-center gap-1 text-xs'>
                  Status: {blog.status}
                </span>
              </CardDescription>
            </CardHeader>
            <CardContent className='space-y-6'>
              {blog.featured_image_url && (
                <img
                  src={blog.featured_image_url}
                  alt={blog.title}
                  className='w-full h-64 object-cover rounded-lg mb-4'
                />
              )}
              <div className='prose prose-sm max-w-none text-foreground'>
                <p>{blog.content}</p>
              </div>
              <Button asChild className='w-full'>
                <Link href='/insights'>Back to Insights</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>
    </PublicLayout>
  );
}
