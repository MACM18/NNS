"use client"

import { useEffect, useState } from "react"
import { getSupabaseClient } from "@/lib/supabase"
import { PublicLayout } from "@/components/layout/public-layout"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { CalendarDays, User, Newspaper } from "lucide-react"
import { format } from "date-fns"

interface Post {
  id: string
  title: string
  content: string
  author: string
  published_date: string
  image_url?: string
}

export default function ArticlesPage() {
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = getSupabaseClient()

  useEffect(() => {
    const fetchPosts = async () => {
      setLoading(true)
      setError(null)
      try {
        const { data, error } = await supabase
          .from("posts")
          .select("id, title, content, author, published_date, image_url")
          .order("published_date", { ascending: false })

        if (error) {
          throw error
        }
        setPosts(data || [])
      } catch (err: any) {
        console.error("Error fetching posts:", err.message)
        setError("Failed to load articles. Please try again later.")
      } finally {
        setLoading(false)
      }
    }

    fetchPosts()
  }, [supabase])

  return (
    <PublicLayout>
      <section className="py-12 md:py-24 lg:py-32 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950">
        <div className="container px-4 md:px-6">
          <div className="max-w-3xl mx-auto text-center mb-12">
            <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">Our Latest Articles</h1>
            <p className="mt-4 text-lg text-muted-foreground">
              Stay informed with our insights on fiber optics, telecom trends, and industry news.
            </p>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {Array.from({ length: 6 }).map((_, index) => (
                <Card key={index} className="animate-pulse">
                  <div className="h-48 w-full bg-gray-200 rounded-t-lg dark:bg-gray-700"></div>
                  <CardHeader>
                    <div className="h-6 bg-gray-200 rounded w-3/4 mb-2 dark:bg-gray-700"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/2 dark:bg-gray-700"></div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="h-4 bg-gray-200 rounded dark:bg-gray-700"></div>
                    <div className="h-4 bg-gray-200 rounded w-5/6 dark:bg-gray-700"></div>
                  </CardContent>
                  <CardFooter className="flex justify-end">
                    <div className="h-8 bg-gray-200 rounded w-1/4 dark:bg-gray-700"></div>
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : error ? (
            <div className="text-center text-red-500 text-lg">{error}</div>
          ) : posts.length === 0 ? (
            <div className="text-center text-muted-foreground text-lg">
              No articles available at the moment. Please check back later!
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {posts.map((post) => (
                <Card
                  key={post.id}
                  className="flex flex-col justify-between shadow-md hover:shadow-lg transition-shadow duration-300"
                >
                  {post.image_url ? (
                    <img
                      src={post.image_url || "/placeholder.svg"}
                      alt={post.title}
                      width={400}
                      height={225}
                      className="w-full h-48 object-cover rounded-t-lg"
                    />
                  ) : (
                    <div className="w-full h-48 bg-muted flex items-center justify-center rounded-t-lg">
                      <Newspaper className="h-16 w-16 text-muted-foreground/50" />
                    </div>
                  )}
                  <CardHeader>
                    <CardTitle className="text-xl font-semibold">{post.title}</CardTitle>
                    <CardDescription className="flex items-center gap-2 text-sm text-muted-foreground">
                      <User className="h-4 w-4" /> {post.author || "NNS Enterprise"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-foreground line-clamp-3">{post.content}</p>
                    <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                      <CalendarDays className="h-4 w-4" /> {format(new Date(post.published_date), "MMM dd, yyyy")}
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button asChild className="w-full">
                      <Link href={`/articles/${post.id}`}>Read More</Link>
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </div>
      </section>
    </PublicLayout>
  )
}
