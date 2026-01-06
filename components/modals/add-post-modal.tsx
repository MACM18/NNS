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
import type { Post } from "@/types/content";

interface AddPostModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingPost?: Post | null;
  onSuccess: () => void;
}

export function AddPostModal({
  open,
  onOpenChange,
  editingPost,
  onSuccess,
}: AddPostModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    excerpt: "",
    author: "",
    category: "",
    tags: "",
    featured_image_url: "",
    status: "active" as "active" | "disabled",
  });

  useEffect(() => {
    if (editingPost) {
      setFormData({
        title: editingPost.title,
        content: editingPost.content,
        excerpt: editingPost.excerpt || "",
        author: editingPost.author,
        category: editingPost.category || "",
        tags: editingPost.tags?.join(", ") || "",
        featured_image_url: editingPost.featured_image_url || "",
        status: editingPost.status,
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
        status: "active",
      });
    }
  }, [editingPost, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const postData = {
        ...formData,
        tags: formData.tags
          ? formData.tags.split(",").map((tag) => tag.trim())
          : [],
      };

      if (editingPost) {
        const response = await fetch(`/api/posts/${editingPost.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(postData),
        });

        if (!response.ok) throw new Error("Failed to update");

        toast({
          title: "Success",
          description: "Post updated successfully",
        });
      } else {
        const response = await fetch("/api/posts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(postData),
        });

        if (!response.ok) throw new Error("Failed to create");

        toast({
          title: "Success",
          description: "Post created successfully",
        });
      }

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error("Error saving post:", error);
      toast({
        title: "Error",
        description: "Failed to save post",
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
            {editingPost ? "Edit Post" : "Add New Post"}
          </DialogTitle>
          <DialogDescription>
            {editingPost
              ? "Update the post details below."
              : "Create a new post for your website."}
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
                onValueChange={(value: "active" | "disabled") =>
                  setFormData({ ...formData, status: value })
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
                : editingPost
                ? "Update Post"
                : "Create Post"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
