"use client";

import type React from "react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";

interface AddBlogModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingBlog?: any | null;
  onSuccess: () => void;
}

export function AddBlogModal({
  open,
  onOpenChange,
  editingBlog,
  onSuccess,
}: AddBlogModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    excerpt: "",
    author: "",
    category: "",
    tags: "",
    featured_image_url: "",
    slug: "",
    meta_description: "",
    reading_time: "",
    status: "active" as "active" | "disabled",
    published_at: "",
  });

  useEffect(() => {
    if (editingBlog) {
      setFormData({
        title: editingBlog.title,
        content: editingBlog.content,
        excerpt: editingBlog.excerpt || "",
        author: editingBlog.author,
        category: editingBlog.category || "",
        tags: editingBlog.tags?.join(", ") || "",
        featured_image_url: editingBlog.featured_image_url || "",
        slug: editingBlog.slug || "",
        meta_description: editingBlog.meta_description || "",
        reading_time: editingBlog.reading_time?.toString() || "",
        status: editingBlog.status,
        published_at: editingBlog.published_at
          ? editingBlog.published_at.slice(0, 16)
          : "",
      });
    } else {
      setFormData({
        title: "",
        content: "",
        excerpt: "",
        author: "",
        category: "",
        tags: "",
        featured_image_url: "",
        slug: "",
        meta_description: "",
        reading_time: "",
        status: "active",
        published_at: "",
      });
    }
  }, [editingBlog, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const blogData = {
        ...formData,
        tags: formData.tags
          ? formData.tags.split(",").map((tag) => tag.trim())
          : [],
        reading_time: formData.reading_time
          ? parseInt(formData.reading_time)
          : null,
        published_at: formData.published_at
          ? new Date(formData.published_at).toISOString()
          : null,
      };
      if (editingBlog) {
        const response = await fetch(`/api/blogs/${editingBlog.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(blogData),
        });
        if (!response.ok) throw new Error("Failed to update");
        toast({ title: "Success", description: "Blog updated successfully" });
      } else {
        const response = await fetch("/api/blogs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(blogData),
        });
        if (!response.ok) throw new Error("Failed to create");
        toast({ title: "Success", description: "Blog created successfully" });
      }
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error("Error saving blog:", error);
      toast({
        title: "Error",
        description: "Failed to save blog",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-w-2xl max-h-[90vh] overflow-y-auto'>
        <DialogHeader>
          <DialogTitle>
            {editingBlog ? "Edit Blog" : "Add New Blog"}
          </DialogTitle>
          <DialogDescription>
            {editingBlog
              ? "Update the blog details below."
              : "Create a new blog post for your website."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className='space-y-4'>
          <div className='grid grid-cols-2 gap-4'>
            <div className='space-y-2'>
              <Label htmlFor='title'>Title *</Label>
              <Input
                id='title'
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                required
              />
            </div>
            <div className='space-y-2'>
              <Label htmlFor='author'>Author *</Label>
              <Input
                id='author'
                value={formData.author}
                onChange={(e) =>
                  setFormData({ ...formData, author: e.target.value })
                }
                required
              />
            </div>
          </div>
          <div className='space-y-2'>
            <Label htmlFor='excerpt'>Excerpt</Label>
            <Textarea
              id='excerpt'
              value={formData.excerpt}
              onChange={(e) =>
                setFormData({ ...formData, excerpt: e.target.value })
              }
              rows={2}
            />
          </div>
          <div className='space-y-2'>
            <Label htmlFor='content'>Content *</Label>
            <Textarea
              id='content'
              value={formData.content}
              onChange={(e) =>
                setFormData({ ...formData, content: e.target.value })
              }
              rows={6}
              required
            />
          </div>
          <div className='grid grid-cols-2 gap-4'>
            <div className='space-y-2'>
              <Label htmlFor='category'>Category</Label>
              <Input
                id='category'
                value={formData.category}
                onChange={(e) =>
                  setFormData({ ...formData, category: e.target.value })
                }
              />
            </div>
            <div className='space-y-2'>
              <Label htmlFor='status'>Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) =>
                  setFormData({ ...formData, status: value as any })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='active'>Active</SelectItem>
                  <SelectItem value='disabled'>Disabled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className='space-y-2'>
            <Label htmlFor='tags'>Tags (comma separated)</Label>
            <Input
              id='tags'
              value={formData.tags}
              onChange={(e) =>
                setFormData({ ...formData, tags: e.target.value })
              }
              placeholder='tag1, tag2, tag3'
            />
          </div>
          <div className='space-y-2'>
            <Label htmlFor='featured_image_url'>Featured Image URL</Label>
            <Input
              id='featured_image_url'
              type='url'
              value={formData.featured_image_url}
              onChange={(e) =>
                setFormData({ ...formData, featured_image_url: e.target.value })
              }
            />
          </div>
          <div className='space-y-2'>
            <Label htmlFor='slug'>Slug</Label>
            <Input
              id='slug'
              value={formData.slug}
              onChange={(e) =>
                setFormData({ ...formData, slug: e.target.value })
              }
            />
          </div>
          <div className='space-y-2'>
            <Label htmlFor='meta_description'>Meta Description</Label>
            <Textarea
              id='meta_description'
              value={formData.meta_description}
              onChange={(e) =>
                setFormData({ ...formData, meta_description: e.target.value })
              }
              rows={2}
            />
          </div>
          <div className='grid grid-cols-2 gap-4'>
            <div className='space-y-2'>
              <Label htmlFor='reading_time'>Reading Time (minutes)</Label>
              <Input
                id='reading_time'
                type='number'
                min='1'
                value={formData.reading_time}
                onChange={(e) =>
                  setFormData({ ...formData, reading_time: e.target.value })
                }
              />
            </div>
            <div className='space-y-2'>
              <Label htmlFor='published_at'>Published At</Label>
              <Input
                id='published_at'
                type='datetime-local'
                value={formData.published_at}
                onChange={(e) =>
                  setFormData({ ...formData, published_at: e.target.value })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type='button'
              variant='outline'
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type='submit' disabled={loading}>
              {loading
                ? "Saving..."
                : editingBlog
                ? "Update Blog"
                : "Create Blog"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
