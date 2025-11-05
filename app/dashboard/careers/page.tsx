"use client";

import { useState, useEffect } from "react";
import {
  Plus,
  Search,
  Filter,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  Calendar,
  MapPin,
  Briefcase,
} from "lucide-react";
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
import { AddJobVacancyModal } from "@/components/modals/add-job-vacancy-modal";
import { supabase } from "@/lib/supabase";
import type { JobVacancy } from "@/types/content";

export default function CareersPage() {
  const [jobVacancies, setJobVacancies] = useState<JobVacancy[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "active" | "disabled"
  >("all");
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingJob, setEditingJob] = useState<JobVacancy | null>(null);
  const [deleteJobId, setDeleteJobId] = useState<number | null>(null);

  useEffect(() => {
    fetchJobVacancies();
  }, []);

  const fetchJobVacancies = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from("job_vacancies")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setJobVacancies(data || []);
    } catch (error) {
      console.error("Error fetching job vacancies:", error);
      toast({
        title: "Error",
        description: "Failed to fetch job vacancies",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleStatusToggle = async (id: number, currentStatus: string) => {
    try {
      const newStatus = currentStatus === "active" ? "disabled" : "active";

      const { error } = await supabase
        .from("job_vacancies")
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq("id", id);

      if (error) throw error;

      setJobVacancies(
        jobVacancies.map((job) =>
          job.id === id
            ? { ...job, status: newStatus as "active" | "disabled" }
            : job
        )
      );

      toast({
        title: "Success",
        description: "Job vacancy status updated successfully",
      });
    } catch (error) {
      console.error("Error updating status:", error);
      toast({
        title: "Error",
        description: "Failed to update job vacancy status",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async () => {
    if (!deleteJobId) return;

    try {
      const { error } = await supabase
        .from("job_vacancies")
        .delete()
        .eq("id", deleteJobId);

      if (error) throw error;

      setJobVacancies(jobVacancies.filter((job) => job.id !== deleteJobId));

      toast({
        title: "Success",
        description: "Job vacancy deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting job vacancy:", error);
      toast({
        title: "Error",
        description: "Failed to delete job vacancy",
        variant: "destructive",
      });
    } finally {
      setDeleteJobId(null);
    }
  };

  const isJobExpired = (endDate: string) => {
    return new Date(endDate) < new Date();
  };

  const filteredJobs = jobVacancies.filter((job) => {
    const matchesSearch =
      job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (job.department &&
        job.department.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = statusFilter === "all" || job.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className='space-y-6'>
      <div className='flex flex-col gap-4'>
        <div className='flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4'>
          <div>
            <h1 className='text-2xl sm:text-3xl font-bold tracking-tight'>
              Career Management
            </h1>
            <p className='text-muted-foreground'>
              Manage job vacancies and career opportunities
            </p>
          </div>
          <Button
            onClick={() => setShowAddModal(true)}
            className='w-full sm:w-auto'
          >
            <Plus className='mr-2 h-4 w-4' />
            Add Job Vacancy
          </Button>
        </div>

        <div className='flex flex-col sm:flex-row items-stretch sm:items-center gap-4'>
          <div className='relative flex-1 max-w-sm'>
            <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4' />
            <Input
              placeholder='Search job vacancies...'
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
              <DropdownMenuItem onClick={() => setStatusFilter("disabled")}>
                Disabled
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Job Vacancies ({jobVacancies.length})</CardTitle>
          <CardDescription>
            Manage your company&apos;s job openings and career opportunities
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className='text-center py-4'>Loading...</div>
          ) : filteredJobs.length === 0 ? (
            <div className='text-center py-8 text-muted-foreground'>
              No job vacancies found
            </div>
          ) : (
            <div className='overflow-x-auto'>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Job Title</TableHead>
                    <TableHead className='hidden sm:table-cell'>
                      Department
                    </TableHead>
                    <TableHead className='hidden md:table-cell'>
                      Location
                    </TableHead>
                    <TableHead className='hidden lg:table-cell'>Type</TableHead>
                    <TableHead className='hidden xl:table-cell'>
                      End Date
                    </TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredJobs.map((job) => (
                    <TableRow key={job.id}>
                      <TableCell className='font-medium'>
                        <div className='flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2'>
                          <div className='flex items-center space-x-2'>
                            <Briefcase className='h-4 w-4 text-muted-foreground flex-shrink-0' />
                            <span className='font-medium'>{job.title}</span>
                          </div>
                          <div className='sm:hidden text-xs text-muted-foreground'>
                            {job.department && `${job.department} • `}
                            {job.location && `${job.location} • `}
                            {job.employment_type}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className='hidden sm:table-cell'>
                        {job.department || "Not specified"}
                      </TableCell>
                      <TableCell className='hidden md:table-cell'>
                        <div className='flex items-center space-x-1'>
                          <MapPin className='h-3 w-3 text-muted-foreground' />
                          <span>{job.location || "Remote"}</span>
                        </div>
                      </TableCell>
                      <TableCell className='hidden lg:table-cell'>
                        <Badge variant='outline'>{job.employment_type}</Badge>
                      </TableCell>
                      <TableCell className='hidden xl:table-cell'>
                        <div className='flex flex-col items-start gap-1'>
                          <div className='flex items-center space-x-1'>
                            <Calendar className='h-3 w-3 text-muted-foreground' />
                            <span
                              className={
                                isJobExpired(job.end_date) ? "text-red-600" : ""
                              }
                            >
                              {new Date(job.end_date).toLocaleDateString()}
                            </span>
                          </div>
                          {isJobExpired(job.end_date) && (
                            <Badge variant='destructive' className='text-xs'>
                              Expired
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            job.status === "active" ? "default" : "secondary"
                          }
                        >
                          {job.status}
                        </Badge>
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
                              onClick={() => setEditingJob(job)}
                            >
                              <Edit className='mr-2 h-4 w-4' />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() =>
                                handleStatusToggle(job.id, job.status)
                              }
                            >
                              {job.status === "active" ? (
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
                              onClick={() => setDeleteJobId(job.id)}
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

      <AddJobVacancyModal
        open={showAddModal || !!editingJob}
        onOpenChange={(open) => {
          if (!open) {
            setShowAddModal(false);
            setEditingJob(null);
          }
        }}
        editingJob={editingJob}
        onSuccess={() => {
          fetchJobVacancies();
          setShowAddModal(false);
          setEditingJob(null);
        }}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!deleteJobId}
        onOpenChange={() => setDeleteJobId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the job
              vacancy.
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
    </div>
  );
}
