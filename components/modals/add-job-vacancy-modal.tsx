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

interface AddJobVacancyModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  editingJob?: any | null
  onSuccess: () => void
}

export function AddJobVacancyModal({ open, onOpenChange, editingJob, onSuccess }: AddJobVacancyModalProps) {
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [requirements, setRequirements] = useState("")
  const [location, setLocation] = useState("")
  const [salary, setSalary] = useState("")
  const [employment_type, setEmploymentType] = useState(
    "full-time" as "full-time" | "part-time" | "contract" | "internship",
  )
  const [skills, setSkills] = useState("")
  const [benefits, setBenefits] = useState("")
  const [application_email, setApplicationEmail] = useState("")
  const [application_url, setApplicationUrl] = useState("")
  const [end_date, setEndDate] = useState("")
  const [status, setStatus] = useState("active" as "active" | "disabled")
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (editingJob) {
      setTitle(editingJob.title)
      setDescription(editingJob.description)
      setRequirements(editingJob.requirements || "")
      setSkills(editingJob.skills?.join(", ") || "")
      setBenefits(editingJob.benefits?.join(", ") || "")
      setLocation(editingJob.location || "")
      setSalary(editingJob.salary_range || "")
      setEmploymentType(editingJob.employment_type)
      setApplicationEmail(editingJob.application_email || "")
      setApplicationUrl(editingJob.application_url || "")
      setEndDate(editingJob.end_date || "")
      setStatus(editingJob.status)
    } else {
      setTitle("")
      setDescription("")
      setRequirements("")
      setSkills("")
      setBenefits("")
      setLocation("")
      setSalary("")
      setEmploymentType("full-time")
      setApplicationEmail("")
      setApplicationUrl("")
      setEndDate("")
      setStatus("active")
    }
  }, [editingJob, open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const jobData = {
        title,
        description,
        requirements,
        location,
        salary_range: salary,
        employment_type,
        skills: skills ? skills.split(",").map((s) => s.trim()) : [],
        benefits: benefits ? benefits.split(",").map((b) => b.trim()) : [],
        application_email,
        application_url,
        end_date,
        status,
        updated_at: new Date().toISOString(),
      }
      if (editingJob) {
        const { error } = await supabase.from("job_vacancies").update(jobData).eq("id", editingJob.id)
        if (error) throw error
        toast({
          title: "Success",
          description: "Job vacancy updated successfully",
        })
      } else {
        const { error } = await supabase
          .from("job_vacancies")
          .insert([{ ...jobData, created_at: new Date().toISOString() }])
        if (error) throw error
        toast({
          title: "Success",
          description: "Job vacancy created successfully",
        })
      }
      onSuccess()
      onOpenChange(false)
    } catch (error) {
      console.error("Error saving job vacancy:", error)
      toast({
        title: "Error",
        description: "Failed to save job vacancy",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{editingJob ? "Edit Job Vacancy" : "Add New Job Vacancy"}</DialogTitle>
          <DialogDescription>
            {editingJob ? "Update the job vacancy details below." : "Create a new job vacancy for your company."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="title">Title *</Label>
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="requirements">Requirements *</Label>
            <Textarea
              id="requirements"
              value={requirements}
              onChange={(e) => setRequirements(e.target.value)}
              rows={3}
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="location">Location *</Label>
            <Input id="location" value={location} onChange={(e) => setLocation(e.target.value)} required />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="salary">Salary</Label>
            <Input
              id="salary"
              value={salary}
              onChange={(e) => setSalary(e.target.value)}
              placeholder="e.g., Competitive, $50,000 - $70,000"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="employment_type">Employment Type</Label>
              <Select value={employment_type} onValueChange={(value) => setEmploymentType(value as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="full-time">Full-time</SelectItem>
                  <SelectItem value="part-time">Part-time</SelectItem>
                  <SelectItem value="contract">Contract</SelectItem>
                  <SelectItem value="internship">Internship</SelectItem>
                </SelectContent>
              </Select>
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
            <Label htmlFor="skills">Skills (comma separated)</Label>
            <Input
              id="skills"
              value={skills}
              onChange={(e) => setSkills(e.target.value)}
              placeholder="skill1, skill2, skill3"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="benefits">Benefits (comma separated)</Label>
            <Input
              id="benefits"
              value={benefits}
              onChange={(e) => setBenefits(e.target.value)}
              placeholder="benefit1, benefit2"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="application_email">Application Email</Label>
            <Input
              id="application_email"
              type="email"
              value={application_email}
              onChange={(e) => setApplicationEmail(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="application_url">Application URL</Label>
            <Input
              id="application_url"
              type="url"
              value={application_url}
              onChange={(e) => setApplicationUrl(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="end_date">End Date *</Label>
            <Input id="end_date" type="date" value={end_date} onChange={(e) => setEndDate(e.target.value)} required />
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
              ) : editingJob ? (
                "Update Job Vacancy"
              ) : (
                "Create Job Vacancy"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
