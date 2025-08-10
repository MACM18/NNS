import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { getSupabaseClient } from "@/lib/supabase"
import Image from "next/image"
import Link from "next/link"
import { CalendarDays, BookOpen } from "lucide-react"

interface Blog {
  id: string
  title: string
  content: string
  image_url?: string
  created_at: string
  reading_time_minutes?: number
}

export const revalidate = 0 // Ensure data is fresh on every request

export default async function InsightsPage() {
  const supabase = getSupabaseClient()
  const { data: blogs, error } = await supabase
    .from("blogs") // Assuming your blog content is in a 'blogs' table
    .select("*")
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching blogs:", error.message)
    return (
      <div className="container mx-auto py-12 px-4 md:px-6">
        <h1 className="text-4xl font-bold text-center mb-8">Our Insights</h1>
        <p className="text-center text-red-500">Failed to load insights. Please try again later.</p>
      </div>
    )
  }

  const allBlogs: Blog[] = blogs || []

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950 py-12 px-4 md:px-6">
      <div className="container mx-auto">
        <h1 className="text-4xl md:text-5xl font-extrabold text-center text-gray-900 dark:text-gray-50 mb-6">
          Company Insights
        </h1>
        <p className="text-xl text-center text-gray-600 dark:text-gray-400 mb-12 max-w-3xl mx-auto">
          Stay informed with our latest thoughts, analyses, and updates on the fiber optics industry and NNS Enterprise.
        </p>

        {allBlogs.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-2xl text-gray-700 dark:text-gray-300">
              No insights published yet. Check back soon for new perspectives!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {allBlogs.map((blog) => (
              <Card key={blog.id} className="flex flex-col h-full hover:shadow-lg transition-shadow duration-300">
                {blog.image_url && (
                  <div className="relative w-full h-48">
                    <Image
                      src={blog.image_url || "/placeholder.svg"}
                      alt={blog.title}
                      layout="fill"
                      objectFit="cover"
                      className="rounded-t-lg"
                    />
                  </div>
                )}
                <CardHeader>
                  <CardTitle className="text-2xl font-bold text-gray-900 dark:text-gray-50">{blog.title}</CardTitle>
                  <CardDescription className="text-gray-600 dark:text-gray-400 line-clamp-3">
                    {blog.content}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-grow space-y-2 text-sm text-gray-500 dark:text-gray-400">
                  <div className="flex items-center gap-2">
                    <CalendarDays className="h-4 w-4" />
                    Published: {new Date(blog.created_at).toLocaleDateString()}
                  </div>
                  {blog.reading_time_minutes && (
                    <div className="flex items-center gap-2">
                      <BookOpen className="h-4 w-4" />
                      {blog.reading_time_minutes} min read
                    </div>
                  )}
                </CardContent>
                <div className="p-6 pt-0">
                  <Link href={`/insights/${blog.id}`} passHref>
                    <Button className="w-full">Read Insight</Button>
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
