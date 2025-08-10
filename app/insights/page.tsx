import { supabaseServer } from "@/lib/supabase-server" // Corrected import
import { PublicLayout } from "@/components/layout/public-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { format } from "date-fns"

interface Blog {
  id: string
  title: string
  summary: string
  author: string
  tags: string[]
  created_at: string
}

async function fetchBlogs(): Promise<Blog[]> {
  const supabase = supabaseServer // Corrected usage
  const { data, error } = await supabase
    .from("blogs")
    .select("id, title, summary, author, tags, created_at")
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching blogs:", error.message)
    return []
  }
  return data as Blog[]
}

export default async function InsightsPage() {
  const blogs = await fetchBlogs()

  return (
    <PublicLayout>
      <section className="py-12 md:py-24 lg:py-32">
        <div className="container px-4 md:px-6">
          <div className="flex flex-col items-center justify-center space-y-4 text-center">
            <div className="space-y-2">
              <h1 className="text-3xl font-bold tracking-tighter sm:text-5xl">Our Latest Insights</h1>
              <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                Dive deep into our expert analysis and thought leadership on the telecom industry.
              </p>
            </div>
          </div>
          <div className="mx-auto grid max-w-5xl items-start gap-6 py-12 lg:grid-cols-2 lg:gap-12">
            {blogs.length > 0 ? (
              blogs.map((blog) => (
                <Card
                  key={blog.id}
                  className="flex flex-col justify-between hover:shadow-lg transition-shadow duration-300"
                >
                  <CardHeader>
                    <CardTitle>{blog.title}</CardTitle>
                    <CardDescription className="flex flex-wrap items-center gap-2">
                      {blog.tags &&
                        blog.tags.map((tag, index) => (
                          <Badge key={index} variant="secondary">
                            {tag}
                          </Badge>
                        ))}
                      <span>By {blog.author}</span>
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground line-clamp-3">{blog.summary}</p>
                    <div className="flex justify-between items-center text-xs text-muted-foreground">
                      <span>Published: {format(new Date(blog.created_at), "MMM dd, yyyy")}</span>
                    </div>
                    <Button asChild className="w-full">
                      <Link href={`/insights/${blog.id}`}>Read More</Link>
                    </Button>
                  </CardContent>
                </Card>
              ))
            ) : (
              <p className="col-span-full text-center text-muted-foreground">
                No insights available at the moment. Please check back later!
              </p>
            )}
          </div>
        </div>
      </section>
    </PublicLayout>
  )
}
