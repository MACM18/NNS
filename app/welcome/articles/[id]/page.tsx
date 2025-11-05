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
import { CalendarDays, User } from "lucide-react";
import { format } from "date-fns";

interface Post {
  id: string;
  title: string;
  content: string;
  author: string;
  category: string;
  created_at: string;
}

async function fetchPost(id: string): Promise<Post | null> {
  const supabase = supabaseServer;
  const { data, error } = await supabase
    .from("posts")
    .select("id, title, content, author, category, created_at")
    .eq("id", id)
    .single();

  if (error) {
    console.error("Error fetching post:", error.message);
    return null;
  }
  return data as Post;
}

export default async function ArticleDetailsPage({ params }: any) {
  const post = await fetchPost(params.id);

  if (!post) {
    return (
      <PublicLayout>
        <section className='py-12 md:py-24 lg:py-32 text-center'>
          <div className='container px-4 md:px-6'>
            <h1 className='text-3xl font-bold tracking-tighter sm:text-5xl'>
              Article Not Found
            </h1>
            <p className='mt-4 text-lg text-muted-foreground'>
              The article you are looking for does not exist or has been
              removed.
            </p>
            <Button asChild className='mt-8'>
              <Link href='/articles'>Back to Articles</Link>
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
              <CardTitle className='text-3xl font-bold'>{post.title}</CardTitle>
              <CardDescription className='flex flex-wrap items-center gap-4 mt-2 text-muted-foreground'>
                <span className='flex items-center gap-1'>
                  <User className='h-4 w-4' /> {post.author}
                </span>
                <span className='flex items-center gap-1'>
                  <CalendarDays className='h-4 w-4' />{" "}
                  {format(new Date(post.created_at), "MMM dd, yyyy")}
                </span>
              </CardDescription>
            </CardHeader>
            <CardContent className='space-y-6'>
              <div className='prose prose-sm max-w-none text-foreground'>
                <p>{post.content}</p>
              </div>
              <Button asChild className='w-full'>
                <Link href='/articles'>Back to Articles</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>
    </PublicLayout>
  );
}
