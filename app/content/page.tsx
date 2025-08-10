"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, Edit, Trash2, ExternalLink } from "lucide-react"
import { AddPostModal } from "@/components/modals/add-post-modal"
import { AddBlogModal } from "@/components/modals/add-blog-modal"
import { supabase } from "@/lib/supabase"
import { toast } from "@/hooks/use-toast"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import Link from "next/link"

interface Post {
  id: string
  title: string
  content: string
  author: string
  published_at: string
}

interface Blog {
  id: string
  title: string
  content: string
  author: string
  published_at: string
}

export default function ContentManagementPage() {
  const [posts, setPosts] = useState<Post[]>([])
  const [blogs, setBlogs] = useState<Blog[]>([])
  const [isAddPostModalOpen, setIsAddPostModalOpen] = useState(false)
  const [isAddBlogModalOpen, setIsAddBlogModalOpen] = useState(false)
  const [loadingPosts, setLoadingPosts] = useState(true)
  const [loadingBlogs, setLoadingBlogs] = useState(true)
  const [errorPosts, setErrorPosts] = useState<string | null>(null)
  const [errorBlogs, setErrorBlogs] = useState<string | null>(null)

  useEffect(() => {
    fetchPosts()
    fetchBlogs()
  }, [])

  const fetchPosts = async () => {
    setLoadingPosts(true)
    setErrorPosts(null)
    const { data, error } = await supabase.from("posts").select("*").order("published_at", { ascending: false })

    if (error) {
      console.error("Error fetching posts:", error)
      setErrorPosts("Failed to load posts.")
      toast({
        title: "Error",
        description: "Failed to load posts.",
        variant: "destructive",
      })
    } else {
      setPosts(data as Post[])
    }
    setLoadingPosts(false)
  }

  const fetchBlogs = async () => {
    setLoadingBlogs(true)
    setErrorBlogs(null)
    const { data, error } = await supabase.from("blogs").select("*").order("published_at", { ascending: false })

    if (error) {
      console.error("Error fetching blogs:", error)
      setErrorBlogs("Failed to load blogs.")
      toast({
        title: "Error",
        description: "Failed to load blogs.",
        variant: "destructive",
      })
    } else {
      setBlogs(data as Blog[])
    }
    setLoadingBlogs(false)
  }

  const handleDeletePost = async (id: string) => {
    const { error } = await supabase.from("posts").delete().eq("id", id)

    if (error) {
      console.error("Error deleting post:", error)
      toast({
        title: "Error",
        description: "Failed to delete post.",
        variant: "destructive",
      })
    } else {
      setPosts(posts.filter((post) => post.id !== id))
      toast({
        title: "Success",
        description: "Post deleted successfully.",
      })
    }
  }

  const handleDeleteBlog = async (id: string) => {
    const { error } = await supabase.from("blogs").delete().eq("id", id)

    if (error) {
      console.error("Error deleting blog:", error)
      toast({
        title: "Error",
        description: "Failed to delete blog.",
        variant: "destructive",
      })
    } else {
      setBlogs(blogs.filter((blog) => blog.id !== id))
      toast({
        title: "Success",
        description: "Blog deleted successfully.",
      })
    }
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Content Management</h2>
        <div className="flex space-x-2">
          <Button onClick={() => setIsAddPostModalOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add New Post
          </Button>
          <Button onClick={() => setIsAddBlogModalOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add New Blog
          </Button>
        </div>
      </div>

      <Tabs defaultValue="posts" className="space-y-4">
        <TabsList>
          <TabsTrigger value="posts">Posts</TabsTrigger>
          <TabsTrigger value="blogs">Blogs</TabsTrigger>
        </TabsList>
        <TabsContent value="posts" className="space-y-4">
          {loadingPosts ? (
            <p>Loading posts...</p>
          ) : errorPosts ? (
            <p className="text-red-500">{errorPosts}</p>
          ) : posts.length === 0 ? (
            <p className="text-center text-muted-foreground">No posts found.</p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {posts.map((post) => (
                <Card key={post.id}>
                  <CardHeader>
                    <CardTitle>{post.title}</CardTitle>
                    <CardDescription className="line-clamp-2">{post.content}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <p>
                      <strong>Author:</strong> {post.author}
                    </p>
                    <p>
                      <strong>Published:</strong> {new Date(post.published_at).toLocaleDateString()}
                    </p>
                    <div className="flex justify-end gap-2">
                      <Link href={`/articles/${post.id}`} passHref>
                        <Button variant="outline" size="sm">
                          <ExternalLink className="h-4 w-4 mr-2" /> View Public
                        </Button>
                      </Link>
                      <Button variant="outline" size="sm">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive" size="sm">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This action cannot be undone. This will permanently delete the post.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDeletePost(post.id)}>Continue</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
        <TabsContent value="blogs" className="space-y-4">
          {loadingBlogs ? (
            <p>Loading blogs...</p>
          ) : errorBlogs ? (
            <p className="text-red-500">{errorBlogs}</p>
          ) : blogs.length === 0 ? (
            <p className="text-center text-muted-foreground">No blogs found.</p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {blogs.map((blog) => (
                <Card key={blog.id}>
                  <CardHeader>
                    <CardTitle>{blog.title}</CardTitle>
                    <CardDescription className="line-clamp-2">{blog.content}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <p>
                      <strong>Author:</strong> {blog.author}
                    </p>
                    <p>
                      <strong>Published:</strong> {new Date(blog.published_at).toLocaleDateString()}
                    </p>
                    <div className="flex justify-end gap-2">
                      <Link href={`/insights/${blog.id}`} passHref>
                        <Button variant="outline" size="sm">
                          <ExternalLink className="h-4 w-4 mr-2" /> View Public
                        </Button>
                      </Link>
                      <Button variant="outline" size="sm">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive" size="sm">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This action cannot be undone. This will permanently delete the blog.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDeleteBlog(blog.id)}>Continue</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <AddPostModal
        open={isAddPostModalOpen}
        onOpenChange={setIsAddPostModalOpen}
        onSuccess={() => {
          setIsAddPostModalOpen(false)
          fetchPosts()
        }}
      />
      <AddBlogModal
        open={isAddBlogModalOpen}
        onOpenChange={setIsAddBlogModalOpen}
        onSuccess={() => {
          setIsAddBlogModalOpen(false)
          fetchBlogs()
        }}
      />
    </div>
  )
}
