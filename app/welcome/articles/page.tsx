import { prisma } from "@/lib/prisma";
export const dynamic = "force-dynamic";
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
import { FileText, Calendar, User } from "lucide-react";

interface Post {
  id: string;
  title: string;
  content: string;
  author: string;
  category: string;
  created_at: Date;
}

async function fetchPosts(): Promise<Post[]> {
  try {
    const rows = await prisma.post.findMany({
      where: { status: "active" },
      select: {
        id: true,
        title: true,
        content: true,
        author: true,
        category: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return rows.map((r: any) => ({
      id: String(r.id),
      title: r.title,
      content: r.content,
      author: r.author,
      category: r.category ?? "General",
      created_at: r.createdAt as Date,
    }));
  } catch (error) {
    console.error("Error fetching posts:", error);
    return [];
  }
}

export default async function ArticlesPage() {
  const posts = await fetchPosts();

  return (
    <section className='py-12 md:py-24 lg:py-32 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950'>
      <div className='container mx-auto px-4 md:px-6'>
        <div className='max-w-6xl mx-auto'>
          <div className='max-w-3xl mx-auto text-center mb-12'>
            <h1 className='text-4xl font-bold tracking-tight text-foreground sm:text-5xl'>
              Our Latest Articles
            </h1>
            <p className='mt-4 text-lg text-muted-foreground'>
              Stay informed with our insights on fiber optics, telecom
              infrastructure, and industry trends.
            </p>
          </div>
          <div className='grid gap-6 lg:grid-cols-2 lg:gap-8'>
            {posts.length > 0 ? (
              posts.map((post) => (
                <Card
                  key={post.id}
                  className='flex flex-col justify-between hover:shadow-lg transition-all duration-300 hover:scale-[1.02]'
                >
                  <CardHeader>
                    <div className='flex items-start justify-between gap-2'>
                      <CardTitle className='text-xl'>{post.title}</CardTitle>
                      <FileText className='h-5 w-5 text-primary flex-shrink-0' />
                    </div>
                    <CardDescription className='flex flex-wrap items-center gap-2 mt-2'>
                      <Badge variant='secondary' className='font-medium'>
                        {post.category}
                      </Badge>
                      <span className='flex items-center gap-1 text-xs'>
                        <User className='h-3 w-3' />
                        {post.author}
                      </span>
                    </CardDescription>
                  </CardHeader>
                  <CardContent className='space-y-4'>
                    <p className='text-sm text-muted-foreground line-clamp-3 leading-relaxed'>
                      {post.content}
                    </p>
                    <div className='flex items-center gap-1 text-xs text-muted-foreground border-t pt-3'>
                      <Calendar className='h-3 w-3' />
                      <span>
                        Published:{" "}
                        {format(new Date(post.created_at), "MMM dd, yyyy")}
                      </span>
                    </div>
                    <Button asChild className='w-full'>
                      <Link href={`/welcome/articles/${post.id}`}>
                        Read More
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className='col-span-full text-center py-12'>
                <FileText className='h-12 w-12 text-muted-foreground/50 mx-auto mb-4' />
                <p className='text-lg text-muted-foreground'>
                  No articles available at the moment.
                </p>
                <p className='text-sm text-muted-foreground mt-2'>
                  Please check back later for new insights!
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
