"use client"

import { Input } from "@/components/ui/input"

import { useEffect, useState } from "react"
import Link from "next/link"
import { BookOpen, Calendar, User2 } from "lucide-react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { supabase } from "@/lib/supabase"
import { format } from "date-fns"
import Image from "next/image"

interface Post {
  id: string
  title: string
  content: string
  author: string
  category: string
  created_at: string
  image_url?: string
}

export default function ArticlesPage() {
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")

  useEffect(() => {
    const fetchPosts = async () => {
      setLoading(true)
      setError(null)
      try {
        const { data, error } = await supabase.from("posts").select("*").order("created_at", { ascending: false })

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
  }, [])

  const filteredPosts = posts.filter(
    (post) =>
      post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      post.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
      post.author.toLowerCase().includes(searchTerm.toLowerCase()) ||
      post.category.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <header className="text-center mb-12">
          <h1 className="text-4xl font-extrabold text-gray-900 sm:text-5xl md:text-6xl leading-tight">
            Our Latest Articles
          </h1>
          <p className="mt-4 text-xl text-gray-600 max-w-2xl mx-auto">
            Dive into our insights on telecom trends, technology, and industry news.
          </p>
          <div className="mt-8 max-w-md mx-auto">
            <Input
              type="text"
              placeholder="Search articles..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500"
            />
          </div>
        </header>

        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="animate-pulse">
                <div className="w-full h-48 bg-gray-200 rounded-t-lg"></div>
                <CardHeader>
                  <div className="h-6 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-full"></div>
                  <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                </CardContent>
                <CardFooter>
                  <div className="h-8 bg-gray-200 rounded w-24"></div>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}

        {error && (
          <div className="text-center text-red-600 text-lg mt-8">
            <p>{error}</p>
          </div>
        )}

        {!loading && !error && filteredPosts.length === 0 && (
          <div className="text-center text-gray-700 text-lg mt-8">
            <p>No articles found matching your criteria.</p>
          </div>
        )}

        {!loading && !error && filteredPosts.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredPosts.map((post) => (
              <Card
                key={post.id}
                className="flex flex-col justify-between shadow-lg hover:shadow-xl transition-shadow duration-300"
              >
                {post.image_url && (
                  <div className="relative w-full h-48">
                    <Image
                      src={post.image_url || "/placeholder.svg"}
                      alt={post.title}
                      fill
                      style={{ objectFit: "cover" }}
                      className="rounded-t-lg"
                    />
                  </div>
                )}
                <CardHeader>
                  <CardTitle className="text-2xl font-bold text-gray-800">{post.title}</CardTitle>
                  <CardDescription className="flex items-center text-gray-600 mt-2">
                    <User2 className="h-4 w-4 mr-1 text-purple-500" /> {post.author}
                  </CardDescription>
                  <CardDescription className="flex items-center text-gray-600 mt-1">
                    <Calendar className="h-4 w-4 mr-1 text-purple-500" /> Posted:{" "}
                    {format(new Date(post.created_at), "MMM dd, yyyy")}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-grow">
                  <Badge variant="secondary" className="bg-purple-100 text-purple-800 mb-4">
                    <BookOpen className="h-3 w-3 mr-1" /> {post.category}
                  </Badge>
                  <p className="text-gray-700 line-clamp-3">{post.content}</p>
                </CardContent>
                <CardFooter className="flex justify-end pt-4">
                  <Link href={`/articles/${post.id}`} passHref>
                    <Button className="bg-purple-600 hover:bg-purple-700 text-white">Read Article</Button>
                  </Link>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
