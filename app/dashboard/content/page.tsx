"use client";

import { useState, useEffect } from "react";
import { Plus, Search, Filter, Edit, Trash2, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";
import { AddPostModal } from "@/components/modals/add-post-modal";
import { AddBlogModal } from "@/components/modals/add-blog-modal";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { Header } from "@/components/layout/header";
import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav";
import { supabase } from "@/lib/supabase";
import type { Post, Blog } from "@/types/content";

export default function ContentPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "active" | "disabled"
  >("all");
  const [showAddPostModal, setShowAddPostModal] = useState(false);
  const [showAddBlogModal, setShowAddBlogModal] = useState(false);
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [editingBlog, setEditingBlog] = useState<Blog | null>(null);
  const [deleteItem, setDeleteItem] = useState<{
    type: "post" | "blog";
    id: number;
  } | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch posts
      const { data: postsData, error: postsError } = await supabase
        .from("posts")
        .select("*")
        .order("created_at", { ascending: false });

      if (postsError) throw postsError;
      setPosts(postsData || []);

      // Fetch blogs
      const { data: blogsData, error: blogsError } = await supabase
        .from("blogs")
        .select("*")
        .order("created_at", { ascending: false });

      if (blogsError) throw blogsError;
      setBlogs(blogsData || []);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast({
        title: "Error",
        description: "Failed to fetch content data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleStatusToggle = async (
    type: "post" | "blog",
    id: number,
    currentStatus: string
  ) => {
    try {
      const newStatus = currentStatus === "active" ? "disabled" : "active";
      const table = type === "post" ? "posts" : "blogs";

      const { error } = await supabase
        .from(table)
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq("id", id);

      if (error) throw error;

      // Update local state
      if (type === "post") {
        setPosts(
          posts.map((post) =>
            post.id === id
              ? { ...post, status: newStatus as "active" | "disabled" }
              : post
          )
        );
      } else {
        setBlogs(
          blogs.map((blog) =>
            blog.id === id
              ? { ...blog, status: newStatus as "active" | "disabled" }
              : blog
          )
        );
      }

      toast({
        title: "Success",
        description: `${type} status updated successfully`,
      });
    } catch (error) {
      console.error("Error updating status:", error);
      toast({
        title: "Error",
        description: `Failed to update ${type} status`,
        variant: "destructive",
      });
    }
  };

  const handleDelete = async () => {
    if (!deleteItem) return;

    try {
      const table = deleteItem.type === "post" ? "posts" : "blogs";

      const { error } = await supabase
        .from(table)
        .delete()
        .eq("id", deleteItem.id);

      if (error) throw error;

      // Update local state
      if (deleteItem.type === "post") {
        setPosts(posts.filter((post) => post.id !== deleteItem.id));
      } else {
        setBlogs(blogs.filter((blog) => blog.id !== deleteItem.id));
      }

      toast({
        title: "Success",
        description: `${deleteItem.type} deleted successfully`,
      });
    } catch (error) {
      console.error("Error deleting item:", error);
      toast({
        title: "Error",
        description: `Failed to delete ${deleteItem.type}`,
        variant: "destructive",
      });
    } finally {
      setDeleteItem(null);
    }
  };

  const filteredPosts = posts.filter((post) => {
    const matchesSearch =
      post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      post.content.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus =
      statusFilter === "all" || post.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const filteredBlogs = blogs.filter((blog) => {
    const matchesSearch =
      blog.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      blog.content.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus =
      statusFilter === "all" || blog.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <SidebarProvider>
      <AppSidebar />
      <div className='flex-1 flex flex-col min-h-screen w-full'>
        <Header />
        <main className='flex-1 w-full max-w-full p-4 md:p-6 lg:p-8 pb-20 lg:pb-6 space-y-4 overflow-x-hidden'>
          <div className='w-full max-w-7xl mx-auto space-y-4'>
            <div className='flex flex-col gap-4'>
              <div className='flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4'>
                <div>
                  <h1 className='text-2xl sm:text-3xl font-bold tracking-tight'>
                    Content Management
                  </h1>
                  <p className='text-muted-foreground'>
                    Manage your posts and blog articles
                  </p>
                </div>
              </div>

              <div className='flex flex-col sm:flex-row items-stretch sm:items-center gap-4'>
                <div className='relative flex-1 max-w-sm'>
                  <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4' />
                  <Input
                    placeholder='Search content...'
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className='pl-10'
                  />
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant='outline' className='w-full sm:w-auto'>
                      <Filter className='mr-2 h-4 w-4' />
                      Status: {statusFilter}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={() => setStatusFilter("all")}>
                      All
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setStatusFilter("active")}>
                      Active
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => setStatusFilter("disabled")}
                    >
                      Disabled
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            <Tabs defaultValue='posts' className='space-y-4'>
              <div className='flex flex-col gap-4'>
                <TabsList className='grid w-full grid-cols-2'>
                  <TabsTrigger value='posts'>
                    Posts ({posts.length})
                  </TabsTrigger>
                  <TabsTrigger value='blogs'>
                    Blogs ({blogs.length})
                  </TabsTrigger>
                </TabsList>
                <div className='flex flex-col sm:flex-row gap-2'>
                  <Button
                    onClick={() => setShowAddPostModal(true)}
                    className='flex-1 sm:flex-none'
                  >
                    <Plus className='mr-2 h-4 w-4' />
                    Add Post
                  </Button>
                  <Button
                    onClick={() => setShowAddBlogModal(true)}
                    className='flex-1 sm:flex-none'
                  >
                    <Plus className='mr-2 h-4 w-4' />
                    Add Blog
                  </Button>
                </div>
              </div>

              <TabsContent value='posts'>
                <Card>
                  <CardHeader>
                    <CardTitle>Posts</CardTitle>
                    <CardDescription>
                      Manage your posts and announcements
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {loading ? (
                      <div className='text-center py-4'>Loading...</div>
                    ) : filteredPosts.length === 0 ? (
                      <div className='text-center py-8 text-muted-foreground'>
                        No posts found
                      </div>
                    ) : (
                      <div className='overflow-x-auto'>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Title</TableHead>
                              <TableHead className='hidden sm:table-cell'>
                                Author
                              </TableHead>
                              <TableHead className='hidden md:table-cell'>
                                Category
                              </TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead className='hidden lg:table-cell'>
                                Created
                              </TableHead>
                              <TableHead>Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {filteredPosts.map((post) => (
                              <TableRow key={post.id}>
                                <TableCell className='font-medium'>
                                  <div className='flex flex-col gap-1'>
                                    <span>{post.title}</span>
                                    <div className='sm:hidden text-xs text-muted-foreground'>
                                      {post.author} •{" "}
                                      {post.category || "Uncategorized"}
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell className='hidden sm:table-cell'>
                                  {post.author}
                                </TableCell>
                                <TableCell className='hidden md:table-cell'>
                                  {post.category || "Uncategorized"}
                                </TableCell>
                                <TableCell>
                                  <Badge
                                    variant={
                                      post.status === "active"
                                        ? "default"
                                        : "secondary"
                                    }
                                  >
                                    {post.status}
                                  </Badge>
                                </TableCell>
                                <TableCell className='hidden lg:table-cell'>
                                  {new Date(
                                    post.created_at
                                  ).toLocaleDateString()}
                                </TableCell>
                                <TableCell>
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant='ghost' size='sm'>
                                        •••
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent>
                                      <DropdownMenuItem
                                        onClick={() => setEditingPost(post)}
                                      >
                                        <Edit className='mr-2 h-4 w-4' />
                                        Edit
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        onClick={() =>
                                          handleStatusToggle(
                                            "post",
                                            post.id,
                                            post.status
                                          )
                                        }
                                      >
                                        {post.status === "active" ? (
                                          <>
                                            <EyeOff className='mr-2 h-4 w-4' />
                                            Disable
                                          </>
                                        ) : (
                                          <>
                                            <Eye className='mr-2 h-4 w-4' />
                                            Enable
                                          </>
                                        )}
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        onClick={() =>
                                          setDeleteItem({
                                            type: "post",
                                            id: post.id,
                                          })
                                        }
                                        className='text-red-600'
                                      >
                                        <Trash2 className='mr-2 h-4 w-4' />
                                        Delete
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value='blogs'>
                <Card>
                  <CardHeader>
                    <CardTitle>Blogs</CardTitle>
                    <CardDescription>
                      Manage your blog articles and publications
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {loading ? (
                      <div className='text-center py-4'>Loading...</div>
                    ) : filteredBlogs.length === 0 ? (
                      <div className='text-center py-8 text-muted-foreground'>
                        No blogs found
                      </div>
                    ) : (
                      <div className='overflow-x-auto'>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Title</TableHead>
                              <TableHead className='hidden sm:table-cell'>
                                Author
                              </TableHead>
                              <TableHead className='hidden md:table-cell'>
                                Category
                              </TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead className='hidden lg:table-cell'>
                                Published
                              </TableHead>
                              <TableHead>Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {filteredBlogs.map((blog) => (
                              <TableRow key={blog.id}>
                                <TableCell className='font-medium'>
                                  <div className='flex flex-col gap-1'>
                                    <span>{blog.title}</span>
                                    <div className='sm:hidden text-xs text-muted-foreground'>
                                      {blog.author} •{" "}
                                      {blog.category || "Uncategorized"}
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell className='hidden sm:table-cell'>
                                  {blog.author}
                                </TableCell>
                                <TableCell className='hidden md:table-cell'>
                                  {blog.category || "Uncategorized"}
                                </TableCell>
                                <TableCell>
                                  <Badge
                                    variant={
                                      blog.status === "active"
                                        ? "default"
                                        : "secondary"
                                    }
                                  >
                                    {blog.status}
                                  </Badge>
                                </TableCell>
                                <TableCell className='hidden lg:table-cell'>
                                  {blog.published_at
                                    ? new Date(
                                        blog.published_at
                                      ).toLocaleDateString()
                                    : "Draft"}
                                </TableCell>
                                <TableCell>
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant='ghost' size='sm'>
                                        •••
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent>
                                      <DropdownMenuItem
                                        onClick={() => setEditingBlog(blog)}
                                      >
                                        <Edit className='mr-2 h-4 w-4' />
                                        Edit
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        onClick={() =>
                                          handleStatusToggle(
                                            "blog",
                                            blog.id,
                                            blog.status
                                          )
                                        }
                                      >
                                        {blog.status === "active" ? (
                                          <>
                                            <EyeOff className='mr-2 h-4 w-4' />
                                            Disable
                                          </>
                                        ) : (
                                          <>
                                            <Eye className='mr-2 h-4 w-4' />
                                            Enable
                                          </>
                                        )}
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        onClick={() =>
                                          setDeleteItem({
                                            type: "blog",
                                            id: blog.id,
                                          })
                                        }
                                        className='text-red-600'
                                      >
                                        <Trash2 className='mr-2 h-4 w-4' />
                                        Delete
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>
      <MobileBottomNav />

      {/* Modals */}
      <AddPostModal
        open={showAddPostModal || !!editingPost}
        onOpenChange={(open) => {
          if (!open) {
            setShowAddPostModal(false);
            setEditingPost(null);
          }
        }}
        editingPost={editingPost}
        onSuccess={() => {
          fetchData();
          setShowAddPostModal(false);
          setEditingPost(null);
        }}
      />

      <AddBlogModal
        open={showAddBlogModal || !!editingBlog}
        onOpenChange={(open) => {
          if (!open) {
            setShowAddBlogModal(false);
            setEditingBlog(null);
          }
        }}
        editingBlog={editingBlog}
        onSuccess={() => {
          fetchData();
          setShowAddBlogModal(false);
          setEditingBlog(null);
        }}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteItem} onOpenChange={() => setDeleteItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the{" "}
              {deleteItem?.type}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className='bg-red-600 hover:bg-red-700'
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SidebarProvider>
  );
}
