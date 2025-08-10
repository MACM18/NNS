import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { getSupabaseClient } from "@/lib/supabase"
import Image from "next/image"
import Link from "next/link"
import { CalendarDays, User } from "lucide-react"

interface Post {
  id: string
  title: string
  content: string
  author: string
  created_at: string
  image_url?: string
}

export default async function ArticlesPage() {
  const supabase = getSupabaseClient()
  const { data: posts, error } = await supabase.from("posts").select("*").order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching posts:", error.message)
    return <div className="container mx-auto py-8 text-center text-red-500">Failed to load articles.</div>
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <header className="text-center mb-12">
          <h1 className="text-4xl font-extrabold text-gray-900 sm:text-5xl lg:text-6xl leading-tight">
            Our Latest Articles
          </h1>
          <p className="mt-4 text-xl text-gray-600 max-w-2xl mx-auto">
            Dive into our insights on fiber optics, network infrastructure, and industry trends.
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {posts.length === 0 ? (
            <div className="col-span-full text-center text-gray-600 text-lg">
              No articles currently available. Check back soon!
            </div>
          ) : (
            posts.map((post) => (
              <Card
                key={post.id}
                className="flex flex-col justify-between shadow-lg hover:shadow-xl transition-shadow duration-300 ease-in-out overflow-hidden"
              >
                {post.image_url && (
                  <div className="relative w-full h-48">
                    <Image
                      src={post.image_url || "/placeholder.svg"}
                      alt={post.title}
                      layout="fill"
                      objectFit="cover"
                      className="transition-transform duration-300 ease-in-out hover:scale-105"
                    />
                  </div>
                )}
                <CardHeader>
                  <CardTitle className="text-2xl font-bold text-gray-900">{post.title}</CardTitle>
                  <CardDescription className="text-gray-600 mt-2 line-clamp-3">{post.content}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2 text-gray-700">
                  <div className="flex items-center text-sm">
                    <User className="mr-2 h-4 w-4 text-gray-500" /> {post.author || "NNS Enterprise"}
                  </div>
                  <div className="flex items-center text-sm">
                    <CalendarDays className="mr-2 h-4 w-4 text-gray-500" />{" "}
                    {new Date(post.created_at).toLocaleDateString()}
                  </div>
                </CardContent>
                <CardFooter>
                  <Link href={`/articles/${post.id}`} className="w-full">
                    <Button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200">
                      Read More
                    </Button>
                  </Link>
                </CardFooter>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
