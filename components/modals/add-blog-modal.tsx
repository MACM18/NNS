"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { toast } from "@/hooks/use-toast"
import { supabase } from "@/lib/supabase"
import { Loader2 } from "lucide-react"

interface AddBlogModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  editingBlog?: any | null
  onSuccess: () => void
}

export function AddBlogModal({ open, onOpenChange, editingBlog, onSuccess }: AddBlogModalProps) {
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [author, setAuthor] = useState("")
  const [excerpt, setExcerpt] = useState("")
  const [category, setCategory] = useState("")
  const [tags, setTags] = useState("")
  const [featured_image_url, setFeatured_image_url] = useState("")
  const [slug, setSlug] = useState("")
  const [meta_description, setMeta_description] = useState("")
  const [reading_time, setReading_time] = useState("")
  const [status, setStatus] = useState("active" as "active" | "disabled")
  const [published_at, setPublished_at] = useState("")
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (editingBlog) {
      setTitle(editingBlog.title)
      setContent(editingBlog.content)
      setExcerpt(editingBlog.excerpt || "")
      setAuthor(editingBlog.author)
      setCategory(editingBlog.category || "")
      setTags(editingBlog.tags?.join(", ") || "")
      setFeatured_image_url(editingBlog.featured_image_url || "")
      setSlug(editingBlog.slug || "")
      setMeta_description(editingBlog.meta_description || "")
      setReading_time(editingBlog.reading_time?.toString() || "")
      setStatus(editingBlog.status)
      setPublished_at(editingBlog.published_at ? editingBlog.published_at.slice(0, 16) : "")
    } else {
      setTitle("")
      setContent("")
      setExcerpt("")
      setAuthor("")
      setCategory("")
      setTags("")
      setFeatured_image_url("")
      setSlug("")
      setMeta_description("")
      setReading_time("")
      setStatus("active")
      setPublished_at("")
    }
  }, [editingBlog, open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const blogData = {
        title,
        content,
        excerpt,
        author,
        category,
        tags: tags ? tags.split(",").map((tag) => tag.trim()) : [],
        featured_image_url,
        slug,
        meta_description,
        reading_time: reading_time ? Number.parseInt(reading_time) : null,
        published_at: published_at ? new Date(published_at).toISOString() : null,
        status,
        updated_at: new Date().toISOString(),
      }

      if (editingBlog) {
        const { error } = await supabase.from("blogs").update(blogData).eq("id", editingBlog.id)
        if (error) throw error
        toast({ title: "Success", description: "Blog updated successfully" })
      } else {
        const { error } = await supabase.from("blogs").insert([{ ...blogData, created_at: new Date().toISOString() }])
        if (error) throw error
        toast({ title: "Success", description: "Blog created successfully" })
      }
      onSuccess()
      onOpenChange(false)
    } catch (error) {
      console.error("Error saving blog:", error)
      toast({
        title: "Error",
        description: "Failed to save blog",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editingBlog ? "Edit Blog" : "Add New Blog"}</DialogTitle>
          <DialogDescription>
            {editingBlog ? "Update the blog details below." : "Create a new blog post for your website."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="author">Author *</Label>
              <Input id="author" value={author} onChange={(e) => setAuthor(e.target.value)} required />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="excerpt">Excerpt</Label>
            <Textarea id="excerpt" value={excerpt} onChange={(e) => setExcerpt(e.target.value)} rows={2} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="content">Content *</Label>
            <Textarea id="content" value={content} onChange={(e) => setContent(e.target.value)} rows={6} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Input id="category" value={category} onChange={(e) => setCategory(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={status} onValueChange={(value) => setStatus(value as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="disabled">Disabled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="tags">Tags (comma separated)</Label>
            <Input id="tags" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="tag1, tag2, tag3" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="featured_image_url">Featured Image URL</Label>
            <Input
              id="featured_image_url"
              type="url"
              value={featured_image_url}
              onChange={(e) => setFeatured_image_url(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="slug">Slug</Label>
            <Input id="slug" value={slug} onChange={(e) => setSlug(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="meta_description">Meta Description</Label>
            <Textarea
              id="meta_description"
              value={meta_description}
              onChange={(e) => setMeta_description(e.target.value)}
              rows={2}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="reading_time">Reading Time (minutes)</Label>
              <Input
                id="reading_time"
                type="number"
                min="1"
                value={reading_time}
                onChange={(e) => setReading_time(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="published_at">Published At</Label>
              <Input
                id="published_at"
                type="datetime-local"
                value={published_at}
                onChange={(e) => setPublished_at(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...
                </>
              ) : editingBlog ? (
                "Update Blog"
              ) : (
                "Create Blog"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
