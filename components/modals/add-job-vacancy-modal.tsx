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
import { supabase } from "@/lib/supabase";

interface AddJobVacancyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingJob?: any | null;
  onSuccess: () => void;
}

export function AddJobVacancyModal({
  open,
  onOpenChange,
  editingJob,
  onSuccess,
}: AddJobVacancyModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    requirements: "",
    responsibilities: "",
    department: "",
    location: "",
    employment_type: "full-time" as
      | "full-time"
      | "part-time"
      | "contract"
      | "internship",
    salary_range: "",
    experience_level: "",
    skills: "",
    benefits: "",
    application_email: "",
    application_url: "",
    end_date: "",
    status: "active" as "active" | "disabled",
  });

  useEffect(() => {
    if (editingJob) {
      setFormData({
        title: editingJob.title,
        description: editingJob.description,
        requirements: editingJob.requirements || "",
        responsibilities: editingJob.responsibilities || "",
        department: editingJob.department || "",
        location: editingJob.location || "",
        employment_type: editingJob.employment_type,
        salary_range: editingJob.salary_range || "",
        experience_level: editingJob.experience_level || "",
        skills: editingJob.skills?.join(", ") || "",
        benefits: editingJob.benefits?.join(", ") || "",
        application_email: editingJob.application_email || "",
        application_url: editingJob.application_url || "",
        end_date: editingJob.end_date || "",
        status: editingJob.status,
      });
    } else {
      setFormData({
        title: "",
        description: "",
        requirements: "",
        responsibilities: "",
        department: "",
        location: "",
        employment_type: "full-time",
        salary_range: "",
        experience_level: "",
        skills: "",
        benefits: "",
        application_email: "",
        application_url: "",
        end_date: "",
        status: "active",
      });
    }
  }, [editingJob, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const jobData = {
        ...formData,
        skills: formData.skills
          ? formData.skills.split(",").map((s) => s.trim())
          : [],
        benefits: formData.benefits
          ? formData.benefits.split(",").map((b) => b.trim())
          : [],
        updated_at: new Date().toISOString(),
      };
      if (editingJob) {
        const { error } = await supabase
          .from("job_vacancies")
          .update(jobData)
          .eq("id", editingJob.id);
        if (error) throw error;
        toast({
          title: "Success",
          description: "Job vacancy updated successfully",
        });
      } else {
        const { error } = await supabase
          .from("job_vacancies")
          .insert([{ ...jobData, created_at: new Date().toISOString() }]);
        if (error) throw error;
        toast({
          title: "Success",
          description: "Job vacancy created successfully",
        });
      }
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error("Error saving job vacancy:", error);
      toast({
        title: "Error",
        description: "Failed to save job vacancy",
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
            {editingJob ? "Edit Job Vacancy" : "Add New Job Vacancy"}
          </DialogTitle>
          <DialogDescription>
            {editingJob
              ? "Update the job vacancy details below."
              : "Create a new job vacancy for your company."}
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
              <Label htmlFor='department'>Department</Label>
              <Input
                id='department'
                value={formData.department}
                onChange={(e) =>
                  setFormData({ ...formData, department: e.target.value })
                }
              />
            </div>
          </div>
          <div className='grid grid-cols-2 gap-4'>
            <div className='space-y-2'>
              <Label htmlFor='location'>Location</Label>
              <Input
                id='location'
                value={formData.location}
                onChange={(e) =>
                  setFormData({ ...formData, location: e.target.value })
                }
              />
            </div>
            <div className='space-y-2'>
              <Label htmlFor='employment_type'>Employment Type</Label>
              <Select
                value={formData.employment_type}
                onValueChange={(value) =>
                  setFormData({ ...formData, employment_type: value as any })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='full-time'>Full-time</SelectItem>
                  <SelectItem value='part-time'>Part-time</SelectItem>
                  <SelectItem value='contract'>Contract</SelectItem>
                  <SelectItem value='internship'>Internship</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className='grid grid-cols-2 gap-4'>
            <div className='space-y-2'>
              <Label htmlFor='salary_range'>Salary Range</Label>
              <Input
                id='salary_range'
                value={formData.salary_range}
                onChange={(e) =>
                  setFormData({ ...formData, salary_range: e.target.value })
                }
              />
            </div>
            <div className='space-y-2'>
              <Label htmlFor='experience_level'>Experience Level</Label>
              <Input
                id='experience_level'
                value={formData.experience_level}
                onChange={(e) =>
                  setFormData({ ...formData, experience_level: e.target.value })
                }
              />
            </div>
          </div>
          <div className='space-y-2'>
            <Label htmlFor='skills'>Skills (comma separated)</Label>
            <Input
              id='skills'
              value={formData.skills}
              onChange={(e) =>
                setFormData({ ...formData, skills: e.target.value })
              }
              placeholder='skill1, skill2, skill3'
            />
          </div>
          <div className='space-y-2'>
            <Label htmlFor='benefits'>Benefits (comma separated)</Label>
            <Input
              id='benefits'
              value={formData.benefits}
              onChange={(e) =>
                setFormData({ ...formData, benefits: e.target.value })
              }
              placeholder='benefit1, benefit2'
            />
          </div>
          <div className='space-y-2'>
            <Label htmlFor='application_email'>Application Email</Label>
            <Input
              id='application_email'
              type='email'
              value={formData.application_email}
              onChange={(e) =>
                setFormData({ ...formData, application_email: e.target.value })
              }
            />
          </div>
          <div className='space-y-2'>
            <Label htmlFor='application_url'>Application URL</Label>
            <Input
              id='application_url'
              type='url'
              value={formData.application_url}
              onChange={(e) =>
                setFormData({ ...formData, application_url: e.target.value })
              }
            />
          </div>
          <div className='space-y-2'>
            <Label htmlFor='end_date'>End Date *</Label>
            <Input
              id='end_date'
              type='date'
              value={formData.end_date}
              onChange={(e) =>
                setFormData({ ...formData, end_date: e.target.value })
              }
              required
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
          <div className='space-y-2'>
            <Label htmlFor='description'>Description *</Label>
            <Textarea
              id='description'
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              rows={4}
              required
            />
          </div>
          <div className='space-y-2'>
            <Label htmlFor='requirements'>Requirements</Label>
            <Textarea
              id='requirements'
              value={formData.requirements}
              onChange={(e) =>
                setFormData({ ...formData, requirements: e.target.value })
              }
              rows={3}
            />
          </div>
          <div className='space-y-2'>
            <Label htmlFor='responsibilities'>Responsibilities</Label>
            <Textarea
              id='responsibilities'
              value={formData.responsibilities}
              onChange={(e) =>
                setFormData({ ...formData, responsibilities: e.target.value })
              }
              rows={3}
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
                : editingJob
                ? "Update Job Vacancy"
                : "Create Job Vacancy"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
