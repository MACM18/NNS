import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { User, Tag, CalendarDays, Clock } from "lucide-react"
import { supabase } from "@/lib/supabase"
import type { Blog } from "@/types/content"
import Link from "next/link"

export const revalidate = 0 // Ensure data is fresh on every request

export default async function InsightsPage() {
  const { data: blogs, error } = await supabase
    .from("blogs")
    .select("*")
    .eq("status", "active") // Only show active blogs
    .order("published_at", { ascending: false })

  if (error) {
    console.error("Error fetching blogs:", error)
    return (
      <div className="container mx-auto py-12 px-4 md:px-6">
        <h1 className="text-4xl font-bold text-center mb-8">Our Blog</h1>
        <p className="text-center text-red-500">Failed to load blog posts. Please try again later.</p>
      </div>
    )
  }

  const activeBlogs: Blog[] = blogs || []

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950 py-12 px-4 md:px-6">
      <div className="container mx-auto">
        <h1 className="text-4xl md:text-5xl font-extrabold text-center text-gray-900 dark:text-gray-50 mb-6">
          NNS Insights
        </h1>
        <p className="text-xl text-center text-gray-600 dark:text-gray-400 mb-12 max-w-3xl mx-auto">
          Dive into our latest articles, industry analyses, and expert opinions on telecommunications and fiber optics.
        </p>

        {activeBlogs.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-2xl text-gray-700 dark:text-gray-300">No blog posts published yet. Check back soon!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {activeBlogs.map((blog) => (
              <Card key={blog.id} className="flex flex-col h-full hover:shadow-lg transition-shadow duration-300">
                {blog.featured_image_url && (
                  <img
                    src={blog.featured_image_url || "/placeholder.svg"}
                    alt={blog.title}
                    width={400}
                    height={225}
                    className="w-full h-48 object-cover rounded-t-lg"
                  />
                )}
                <CardHeader>
                  <CardTitle className="text-2xl font-bold text-gray-900 dark:text-gray-50 line-clamp-2">
                    {blog.title}
                  </CardTitle>
                  <CardDescription className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                    <User className="h-4 w-4" />
                    {blog.author}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-grow space-y-4">
                  <div className="flex flex-wrap gap-2">
                    {blog.category && (
                      <Badge variant="secondary" className="flex items-center gap-1">
                        <Tag className="h-3 w-3" />
                        {blog.category}
                      </Badge>
                    )}
                    {blog.published_at && (
                      <Badge variant="outline" className="flex items-center gap-1">
                        <CalendarDays className="h-3 w-3" />
                        {new Date(blog.published_at).toLocaleDateString()}
                      </Badge>
                    )}
                    {blog.reading_time && (
                      <Badge variant="outline" className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {blog.reading_time} min read
                      </Badge>
                    )}
                  </div>
                  <p className="text-gray-700 dark:text-gray-300 line-clamp-3">{blog.excerpt || blog.content}</p>
                </CardContent>
                {/* Placeholder for actual blog detail page */}
                <div className="p-6 pt-0">
                  <Link href={`/insights/${blog.slug || blog.id}`} passHref>
                    <Button className="w-full">Read Article</Button>
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
