"use client"

import { Input } from "@/components/ui/input"

import { useEffect, useState } from "react"
import Link from "next/link"
import { BookOpen, Calendar, Clock, User2 } from "lucide-react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { supabase } from "@/lib/supabase"
import { format } from "date-fns"
import Image from "next/image"

interface Blog {
  id: string
  title: string
  content: string
  author: string
  tags: string[]
  created_at: string
  image_url?: string
  reading_time_minutes: number
}

export default function InsightsPage() {
  const [blogs, setBlogs] = useState<Blog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")

  useEffect(() => {
    const fetchBlogs = async () => {
      setLoading(true)
      setError(null)
      try {
        const { data, error } = await supabase.from("blogs").select("*").order("created_at", { ascending: false })

        if (error) {
          throw error
        }
        setBlogs(data || [])
      } catch (err: any) {
        console.error("Error fetching blogs:", err.message)
        setError("Failed to load insights. Please try again later.")
      } finally {
        setLoading(false)
      }
    }

    fetchBlogs()
  }, [])

  const filteredBlogs = blogs.filter(
    (blog) =>
      blog.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      blog.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
      blog.author.toLowerCase().includes(searchTerm.toLowerCase()) ||
      blog.tags.some((tag) => tag.toLowerCase().includes(searchTerm.toLowerCase())),
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <header className="text-center mb-12">
          <h1 className="text-4xl font-extrabold text-gray-900 sm:text-5xl md:text-6xl leading-tight">
            Telecom Insights
          </h1>
          <p className="mt-4 text-xl text-gray-600 max-w-2xl mx-auto">
            Stay informed with our expert analysis, industry trends, and technological breakthroughs.
          </p>
          <div className="mt-8 max-w-md mx-auto">
            <Input
              type="text"
              placeholder="Search insights..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500"
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

        {!loading && !error && filteredBlogs.length === 0 && (
          <div className="text-center text-gray-700 text-lg mt-8">
            <p>No insights found matching your criteria.</p>
          </div>
        )}

        {!loading && !error && filteredBlogs.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredBlogs.map((blog) => (
              <Card
                key={blog.id}
                className="flex flex-col justify-between shadow-lg hover:shadow-xl transition-shadow duration-300"
              >
                {blog.image_url && (
                  <div className="relative w-full h-48">
                    <Image
                      src={blog.image_url || "/placeholder.svg"}
                      alt={blog.title}
                      fill
                      style={{ objectFit: "cover" }}
                      className="rounded-t-lg"
                    />
                  </div>
                )}
                <CardHeader>
                  <CardTitle className="text-2xl font-bold text-gray-800">{blog.title}</CardTitle>
                  <CardDescription className="flex items-center text-gray-600 mt-2">
                    <User2 className="h-4 w-4 mr-1 text-green-500" /> {blog.author}
                  </CardDescription>
                  <CardDescription className="flex items-center text-gray-600 mt-1">
                    <Calendar className="h-4 w-4 mr-1 text-green-500" /> Published:{" "}
                    {format(new Date(blog.created_at), "MMM dd, yyyy")}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-grow">
                  <div className="flex flex-wrap gap-2 mb-4">
                    {blog.tags.map((tag, index) => (
                      <Badge key={index} variant="secondary" className="bg-green-100 text-green-800">
                        <BookOpen className="h-3 w-3 mr-1" /> {tag}
                      </Badge>
                    ))}
                    <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                      <Clock className="h-3 w-3 mr-1" /> {blog.reading_time_minutes} min read
                    </Badge>
                  </div>
                  <p className="text-gray-700 line-clamp-3">{blog.content}</p>
                </CardContent>
                <CardFooter className="flex justify-end pt-4">
                  <Link href={`/insights/${blog.id}`} passHref>
                    <Button className="bg-green-600 hover:bg-green-700 text-white">Read Blog</Button>
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
