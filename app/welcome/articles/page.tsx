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

interface Post {
  id: string;
  title: string;
  content: string;
  author: string;
  category: string;
  created_at: string;
}

async function fetchPosts(): Promise<Post[]> {
  const supabase = supabaseServer;
  const { data, error } = await supabase
    .from("posts")
    .select("id, title, content, author, category, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching posts:", error.message);
    return [];
  }
  return data as Post[];
}

export default async function ArticlesPage() {
  const posts = await fetchPosts();

  return (
    <section className='py-12 md:py-24 lg:py-32'>
      <div className='container px-4 md:px-6'>
        <div className='flex flex-col items-center justify-center space-y-4 text-center'>
          <div className='space-y-2'>
            <h1 className='text-3xl font-bold tracking-tighter sm:text-5xl'>
              Our Latest Articles
            </h1>
            <p className='max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed'>
              Stay informed with our insights on fiber optics, telecom
              infrastructure, and industry trends.
            </p>
          </div>
        </div>
        <div className='mx-auto grid max-w-5xl items-start gap-6 py-12 lg:grid-cols-2 lg:gap-12'>
          {posts.length > 0 ? (
            posts.map((post) => (
              <Card
                key={post.id}
                className='flex flex-col justify-between hover:shadow-lg transition-shadow duration-300'
              >
                <CardHeader>
                  <CardTitle>{post.title}</CardTitle>
                  <CardDescription className='flex items-center gap-2'>
                    <Badge variant='secondary'>{post.category}</Badge>
                    <span>By {post.author}</span>
                  </CardDescription>
                </CardHeader>
                <CardContent className='space-y-4'>
                  <p className='text-sm text-muted-foreground line-clamp-3'>
                    {post.content}
                  </p>
                  <div className='flex justify-between items-center text-xs text-muted-foreground'>
                    <span>
                      Published:{" "}
                      {format(new Date(post.created_at), "MMM dd, yyyy")}
                    </span>
                  </div>
                  <Button asChild className='w-full'>
                    <Link href={`/articles/${post.id}`}>Read More</Link>
                  </Button>
                </CardContent>
              </Card>
            ))
          ) : (
            <p className='col-span-full text-center text-muted-foreground'>
              No articles available at the moment. Please check back later!
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
