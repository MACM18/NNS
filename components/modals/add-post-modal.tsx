"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { supabase } from "@/lib/supabase"
import { toast } from "@/hooks/use-toast"
import { Loader2 } from "lucide-react"

interface AddPostModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function AddPostModal({ open, onOpenChange, onSuccess }: AddPostModalProps) {
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [author, setAuthor] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const { error } = await supabase.from("posts").insert({
      title,
      content,
      author,
      published_at: new Date().toISOString(),
    })

    if (error) {
      console.error("Error adding post:", error)
      toast({
        title: "Error",
        description: "Failed to add post. Please try again.",
        variant: "destructive",
      })
    } else {
      toast({
        title: "Success",
        description: "Post added successfully.",
      })
      onSuccess()
      setTitle("")
      setContent("")
      setAuthor("")
    }
    setLoading(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New Post</DialogTitle>
          <DialogDescription>Fill in the details for the new post.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="title">Title</Label>
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="content">Content</Label>
            <Textarea id="content" value={content} onChange={(e) => setContent(e.target.value)} required />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="author">Author</Label>
            <Input id="author" value={author} onChange={(e) => setAuthor(e.target.value)} required />
          </div>
          <Button type="submit" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Adding Post...
              </>
            ) : (
              "Add Post"
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
