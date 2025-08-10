"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { BookOpen, Calendar, Tag, Search, Clock, ArrowRight } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { PublicLayout } from "@/components/layout/public-layout"
import { supabase } from "@/lib/supabase"
import type { Blog } from "@/types/content"

export default function InsightsPage() {
  const [blogs, setBlogs] = useState<Blog[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")

  useEffect(() => {
    fetchBlogs()
  }, [])

  const fetchBlogs = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from("blogs")
        .select("*")
        .eq("status", "active") // Only show active blogs
        .order("published_at", { ascending: false })

      if (error) throw error
      setBlogs(data || [])
    } catch (error) {
      console.error("Error fetching blogs:", error)
      // Optionally show a toast or error message to the user
    } finally {
      setLoading(false)
    }
  }

  const filteredBlogs = blogs.filter((blog) => {
    const matchesSearch =
      blog.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      blog.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
      blog.author.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (blog.category && blog.category.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (blog.tags && blog.tags.some((tag) => tag.toLowerCase().includes(searchTerm.toLowerCase())))
    return matchesSearch
  })

  return (
    <PublicLayout>
      <section className="py-12 md:py-24 lg:py-32 bg-background">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Our Insights & Blog</h1>
            <p className="mt-4 text-lg text-muted-foreground">
              Dive into our latest articles, thought leadership, and industry analysis.
            </p>
          </div>

          <div className="mt-12 flex justify-center">
            <div className="relative w-full max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <Input
                placeholder="Search insights..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 rounded-md border border-input focus:ring-primary focus:border-primary w-full"
              />
            </div>
          </div>

          {loading ? (
            <div className="text-center py-16 text-muted-foreground">Loading insights...</div>
          ) : filteredBlogs.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">No insights or blog posts found.</div>
          ) : (
            <div className="mt-16 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {filteredBlogs.map((blog) => (
                <Card
                  key={blog.id}
                  className="flex flex-col justify-between hover:shadow-lg transition-shadow duration-300"
                >
                  <CardHeader>
                    <CardTitle className="text-xl font-semibold line-clamp-2">{blog.title}</CardTitle>
                    <CardDescription className="flex items-center gap-2 text-muted-foreground">
                      <BookOpen className="h-4 w-4" />
                      <span>By {blog.author}</span>
                    </CardDescription>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {blog.category && <Badge variant="secondary">{blog.category}</Badge>}
                      {blog.tags &&
                        blog.tags.map((tag, index) => (
                          <Badge key={index} variant="outline" className="flex items-center gap-1">
                            <Tag className="h-3 w-3" /> {tag}
                          </Badge>
                        ))}
                    </div>
                  </CardHeader>
                  <CardContent className="flex-grow">
                    <p className="text-sm text-muted-foreground line-clamp-3">
                      {blog.excerpt || blog.content.substring(0, 150) + "..."}
                    </p>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mt-4">
                      <Calendar className="h-4 w-4" />
                      <span>
                        Published: {blog.published_at ? new Date(blog.published_at).toLocaleDateString() : "Draft"}
                      </span>
                      {blog.reading_time && (
                        <span className="flex items-center gap-1 ml-auto">
                          <Clock className="h-4 w-4" /> {blog.reading_time} min read
                        </span>
                      )}
                    </div>
                  </CardContent>
                  <div className="p-6 pt-0">
                    <Link href={`/insights/${blog.id}`} passHref>
                      <Button variant="outline" className="w-full bg-transparent">
                        Read Blog <ArrowRight className="ml-2 h-4 w-4" />
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
