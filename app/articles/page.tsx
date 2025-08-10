import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { getSupabaseClient } from "@/lib/supabase"
import Image from "next/image"
import Link from "next/link"
import { CalendarDays, Clock } from "lucide-react"

interface Post {
  id: string
  title: string
  content: string
  image_url?: string
  created_at: string
  author?: string
}

export const revalidate = 0 // Ensure data is fresh on every request

export default async function ArticlesPage() {
  const supabase = getSupabaseClient()
  const { data: posts, error } = await supabase.from("posts").select("*").order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching posts:", error.message)
    return (
      <div className="container mx-auto py-12 px-4 md:px-6">
        <h1 className="text-4xl font-bold text-center mb-8">Our Articles</h1>
        <p className="text-center text-red-500">Failed to load articles. Please try again later.</p>
      </div>
    )
  }

  const allPosts: Post[] = posts || []

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950 py-12 px-4 md:px-6">
      <div className="container mx-auto">
        <h1 className="text-4xl md:text-5xl font-extrabold text-center text-gray-900 dark:text-gray-50 mb-6">
          Latest Articles
        </h1>
        <p className="text-xl text-center text-gray-600 dark:text-gray-400 mb-12 max-w-3xl mx-auto">
          Dive into our collection of insightful articles covering industry trends, technical deep-dives, and company
          news.
        </p>

        {allPosts.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-2xl text-gray-700 dark:text-gray-300">
              No articles published yet. Check back soon for new content!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {allPosts.map((post) => (
              <Card key={post.id} className="flex flex-col h-full hover:shadow-lg transition-shadow duration-300">
                {post.image_url && (
                  <div className="relative w-full h-48">
                    <Image
                      src={post.image_url || "/placeholder.svg"}
                      alt={post.title}
                      layout="fill"
                      objectFit="cover"
                      className="rounded-t-lg"
                    />
                  </div>
                )}
                <CardHeader>
                  <CardTitle className="text-2xl font-bold text-gray-900 dark:text-gray-50">{post.title}</CardTitle>
                  <CardDescription className="text-gray-600 dark:text-gray-400 line-clamp-3">
                    {post.content}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-grow space-y-2 text-sm text-gray-500 dark:text-gray-400">
                  <div className="flex items-center gap-2">
                    <CalendarDays className="h-4 w-4" />
                    Published: {new Date(post.created_at).toLocaleDateString()}
                  </div>
                  {post.author && (
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4" /> {/* Using Clock for author, could be User icon */}
                      Author: {post.author}
                    </div>
                  )}
                </CardContent>
                <div className="p-6 pt-0">
                  <Link href={`/articles/${post.id}`} passHref>
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
