-- Create workers table to manage technicians and field workers
-- This table stores worker information separate from user profiles
-- Workers can optionally be linked to user profiles for system access

CREATE TABLE IF NOT EXISTS public.workers (
	id uuid NOT NULL DEFAULT gen_random_uuid(),
	full_name text NOT NULL,
	phone_number text,
	email text,
	role text DEFAULT 'technician',
	status text DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
	profile_id uuid,
	notes text,
	created_by uuid,
	created_at timestamp with time zone DEFAULT now(),
	updated_at timestamp with time zone DEFAULT now(),
	CONSTRAINT workers_pkey PRIMARY KEY (id),
	CONSTRAINT workers_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id),
	CONSTRAINT workers_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id)
);

-- Create work_assignments table to track which workers worked on which lines
-- This table links workers to specific line installations for tracking and payroll

CREATE TABLE IF NOT EXISTS public.work_assignments (
	id uuid NOT NULL DEFAULT gen_random_uuid(),
	line_id uuid NOT NULL,
	worker_id uuid NOT NULL,
	assigned_date date NOT NULL,
	created_by uuid,
	created_at timestamp with time zone DEFAULT now(),
	CONSTRAINT work_assignments_pkey PRIMARY KEY (id),
	CONSTRAINT work_assignments_line_id_fkey FOREIGN KEY (line_id) REFERENCES public.line_details(id) ON DELETE CASCADE,
	CONSTRAINT work_assignments_worker_id_fkey FOREIGN KEY (worker_id) REFERENCES public.workers(id) ON DELETE CASCADE,
	CONSTRAINT work_assignments_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id)
);

-- Create unique constraint to prevent duplicate assignments
CREATE UNIQUE INDEX IF NOT EXISTS ux_work_assignments_line_worker_date 
ON public.work_assignments (line_id, worker_id, assigned_date);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_workers_status ON public.workers (status);
CREATE INDEX IF NOT EXISTS idx_workers_profile_id ON public.workers (profile_id);
CREATE INDEX IF NOT EXISTS idx_work_assignments_worker_id ON public.work_assignments (worker_id);
CREATE INDEX IF NOT EXISTS idx_work_assignments_line_id ON public.work_assignments (line_id);
CREATE INDEX IF NOT EXISTS idx_work_assignments_assigned_date ON public.work_assignments (assigned_date);

-- Enable Row Level Security
ALTER TABLE public.workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_assignments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for workers table
-- Admins and moderators can do everything
CREATE POLICY "Admins can manage workers" ON public.workers
	FOR ALL
	USING (
		EXISTS (
			SELECT 1 FROM public.profiles
			WHERE profiles.id = auth.uid()
			AND profiles.role IN ('admin', 'moderator')
		)
	);

-- All authenticated users can view active workers
CREATE POLICY "Authenticated users can view active workers" ON public.workers
	FOR SELECT
	USING (
		auth.role() = 'authenticated'
		AND status = 'active'
	);

-- RLS Policies for work_assignments table
-- Admins and moderators can manage assignments
CREATE POLICY "Admins can manage work assignments" ON public.work_assignments
	FOR ALL
	USING (
		EXISTS (
			SELECT 1 FROM public.profiles
			WHERE profiles.id = auth.uid()
			AND profiles.role IN ('admin', 'moderator')
		)
	);

-- All authenticated users can view assignments
CREATE POLICY "Authenticated users can view work assignments" ON public.work_assignments
	FOR SELECT
	USING (auth.role() = 'authenticated');
