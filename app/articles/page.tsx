"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { BookOpen, Calendar, Tag, Search, ArrowRight } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { PublicLayout } from "@/components/layout/public-layout"
import { supabase } from "@/lib/supabase"
import type { Post } from "@/types/content"

export default function ArticlesPage() {
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")

  useEffect(() => {
    fetchPosts()
  }, [])

  const fetchPosts = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from("posts")
        .select("*")
        .eq("status", "active") // Only show active posts
        .order("created_at", { ascending: false })

      if (error) throw error
      setPosts(data || [])
    } catch (error) {
      console.error("Error fetching posts:", error)
      // Optionally show a toast or error message to the user
    } finally {
      setLoading(false)
    }
  }

  const filteredPosts = posts.filter((post) => {
    const matchesSearch =
      post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      post.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
      post.author.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (post.category && post.category.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (post.tags && post.tags.some((tag) => tag.toLowerCase().includes(searchTerm.toLowerCase())))
    return matchesSearch
  })

  return (
    <PublicLayout>
      <section className="py-12 md:py-24 lg:py-32 bg-background">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Latest Articles</h1>
            <p className="mt-4 text-lg text-muted-foreground">
              Stay informed with our insights and updates on the telecom industry, technology, and more.
            </p>
          </div>

          <div className="mt-12 flex justify-center">
            <div className="relative w-full max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <Input
                placeholder="Search articles..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 rounded-md border border-input focus:ring-primary focus:border-primary w-full"
              />
            </div>
          </div>

          {loading ? (
            <div className="text-center py-16 text-muted-foreground">Loading articles...</div>
          ) : filteredPosts.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">No articles found.</div>
          ) : (
            <div className="mt-16 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {filteredPosts.map((post) => (
                <Card
                  key={post.id}
                  className="flex flex-col justify-between hover:shadow-lg transition-shadow duration-300"
                >
                  <CardHeader>
                    <CardTitle className="text-xl font-semibold line-clamp-2">{post.title}</CardTitle>
                    <CardDescription className="flex items-center gap-2 text-muted-foreground">
                      <BookOpen className="h-4 w-4" />
                      <span>By {post.author}</span>
                    </CardDescription>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {post.category && <Badge variant="secondary">{post.category}</Badge>}
                      {post.tags &&
                        post.tags.map((tag, index) => (
                          <Badge key={index} variant="outline" className="flex items-center gap-1">
                            <Tag className="h-3 w-3" /> {tag}
                          </Badge>
                        ))}
                    </div>
                  </CardHeader>
                  <CardContent className="flex-grow">
                    <p className="text-sm text-muted-foreground line-clamp-3">
                      {post.excerpt || post.content.substring(0, 150) + "..."}
                    </p>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mt-4">
                      <Calendar className="h-4 w-4" />
                      <span>Published: {new Date(post.created_at).toLocaleDateString()}</span>
                    </div>
                  </CardContent>
                  <div className="p-6 pt-0">
                    <Link href={`/articles/${post.id}`} passHref>
                      <Button variant="outline" className="w-full bg-transparent">
                        Read Article <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </section>
    </PublicLayout>
  )
}
