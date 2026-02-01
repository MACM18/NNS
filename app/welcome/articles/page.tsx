import { prisma } from "@/lib/prisma";
export const dynamic = "force-dynamic";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { format } from "date-fns";
import { FileText, Calendar, User, ArrowRight } from "lucide-react";

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
    <div className="relative overflow-hidden bg-background min-h-screen">
      <div className='absolute inset-0 bg-grid-pattern opacity-5'></div>
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-accent/5"></div>

      {/* Hero Section */}
      <section className='relative pt-24 pb-12 md:pt-32 md:pb-16 text-center px-4'>
        <Badge variant="outline" className="mb-6 px-4 py-2 rounded-full border-primary/20 bg-primary/5 text-primary backdrop-blur-sm">
          News & Insights
        </Badge>
        <h1 className='text-4xl md:text-6xl font-bold tracking-tight text-foreground mb-6'>
          Our Latest Articles
        </h1>
        <p className='text-xl text-muted-foreground max-w-2xl mx-auto'>
          Stay informed with our insights on fiber optics, telecom infrastructure, and industry trends.
        </p>
      </section>

      <div className='container mx-auto px-4 md:px-6 pb-24'>
        <div className='grid gap-6 lg:grid-cols-2 lg:gap-8 max-w-6xl mx-auto'>
          {posts.length > 0 ? (
            posts.map((post) => (
              <div
                key={post.id}
                className='glass-card rounded-2xl p-6 flex flex-col justify-between hover:scale-[1.01] transition-transform duration-300 group'
              >
                <div className="mb-4">
                  <div className='flex items-center justify-between gap-4 mb-3'>
                    <Badge variant='secondary' className='font-medium bg-primary/10 text-primary hover:bg-primary/20'>
                      {post.category}
                    </Badge>
                    <span className='flex items-center gap-1 text-xs text-muted-foreground'>
                      <Calendar className='h-3 w-3' />
                      {format(new Date(post.created_at), "MMM dd, yyyy")}
                    </span>
                  </div>
                  <h3 className='text-xl font-bold mb-3 group-hover:text-primary transition-colors line-clamp-2'>
                    {post.title}
                  </h3>
                  <p className='text-sm text-muted-foreground line-clamp-3 leading-relaxed'>
                    {post.content}
                  </p>
                </div>

                <div className='pt-4 border-t border-border/50 flex items-center justify-between mt-auto'>
                  <span className='flex items-center gap-2 text-xs font-medium text-foreground/80'>
                    <User className='h-3 w-3' />
                    {post.author}
                  </span>
                  <Link href={`/welcome/articles/${post.id}`} className="text-sm font-semibold text-primary hover:underline flex items-center gap-1">
                    Read Article <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            ))
          ) : (
            <div className='col-span-full text-center py-24 glass-card rounded-3xl'>
              <div className="h-16 w-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <FileText className='h-8 w-8 text-muted-foreground' />
              </div>
              <h3 className='text-xl font-bold text-foreground'>No articles found</h3>
              <p className='text-muted-foreground mt-2 max-w-sm mx-auto'>
                We haven't published any articles yet. Please check back later for new insights!
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
