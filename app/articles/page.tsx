import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { User, Tag, CalendarDays } from "lucide-react"
import { supabase } from "@/lib/supabase"
import type { Post } from "@/types/content"
import Link from "next/link"

export const revalidate = 0 // Ensure data is fresh on every request

export default async function ArticlesPage() {
  const { data: posts, error } = await supabase
    .from("posts")
    .select("*")
    .eq("status", "active") // Only show active posts
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching posts:", error)
    return (
      <div className="container mx-auto py-12 px-4 md:px-6">
        <h1 className="text-4xl font-bold text-center mb-8">Our Articles</h1>
        <p className="text-center text-red-500">Failed to load articles. Please try again later.</p>
      </div>
    )
  }

  const activePosts: Post[] = posts || []

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950 py-12 px-4 md:px-6">
      <div className="container mx-auto">
        <h1 className="text-4xl md:text-5xl font-extrabold text-center text-gray-900 dark:text-gray-50 mb-6">
          Latest Articles
        </h1>
        <p className="text-xl text-center text-gray-600 dark:text-gray-400 mb-12 max-w-3xl mx-auto">
          Stay informed with our insights on fiber optics, telecommunications, and industry trends.
        </p>

        {activePosts.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-2xl text-gray-700 dark:text-gray-300">No articles published yet. Check back soon!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {activePosts.map((post) => (
              <Card key={post.id} className="flex flex-col h-full hover:shadow-lg transition-shadow duration-300">
                {post.featured_image_url && (
                  <img
                    src={post.featured_image_url || "/placeholder.svg"}
                    alt={post.title}
                    width={400}
                    height={225}
                    className="w-full h-48 object-cover rounded-t-lg"
                  />
                )}
                <CardHeader>
                  <CardTitle className="text-2xl font-bold text-gray-900 dark:text-gray-50 line-clamp-2">
                    {post.title}
                  </CardTitle>
                  <CardDescription className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                    <User className="h-4 w-4" />
                    {post.author}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-grow space-y-4">
                  <div className="flex flex-wrap gap-2">
                    {post.category && (
                      <Badge variant="secondary" className="flex items-center gap-1">
                        <Tag className="h-3 w-3" />
                        {post.category}
                      </Badge>
                    )}
                    <Badge variant="outline" className="flex items-center gap-1">
                      <CalendarDays className="h-3 w-3" />
                      {new Date(post.created_at).toLocaleDateString()}
                    </Badge>
                  </div>
                  <p className="text-gray-700 dark:text-gray-300 line-clamp-3">{post.excerpt || post.content}</p>
                </CardContent>
                {/* Placeholder for actual post detail page */}
                <div className="p-6 pt-0">
                  <Link href={`/articles/${post.id}`} passHref>
                    <Button className="w-full">Read More</Button>
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
