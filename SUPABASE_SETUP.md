# Deprecated: Supabase Setup (Replaced by Prisma + NextAuth)

This document is kept for historical reference only. The project no longer uses Supabase.

Current stack:
- Database: PostgreSQL
- ORM: Prisma (`@prisma/client`)
- Auth: NextAuth v5 (Credentials + Google)

Please refer to `MIGRATION_GUIDE.md` and `README.md` for up-to-date setup instructions, environment variables, and APIs.

---
# NNS Enterprise - Supabase Setup Documentation

## Overview

This document contains all the necessary steps to recreate the Supabase project for NNS Enterprise telecom management system.

---

## 1. Environment Variables Required

Create a `.env.local` file in your project root with the following variables:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# Google Sheets Integration (Optional - for data import feature)
GOOGLE_SERVICE_ACCOUNT_EMAIL=your-service-account@project-id.iam.gserviceaccount.com
GOOGLE_SERVICE_ACCOUNT_KEY={"type":"service_account","project_id":"..."}

# Google OAuth (Optional)
GOOGLE_OAUTH_CLIENT_ID=your-google-oauth-client-id
GOOGLE_OAUTH_CLIENT_SECRET=your-google-oauth-client-secret
GOOGLE_OAUTH_REDIRECT_URI=http://localhost:3000/api/google/oauth/callback

# Resend Email (Optional)
RESEND_API_KEY=your-resend-api-key-here
```

---

## 2. Authentication Setup

### Enable Email/Password Authentication

1. Go to **Authentication** > **Providers** in Supabase Dashboard
2. Enable **Email** provider
3. Configure email templates if needed

### Enable Google OAuth (Optional)

1. Go to **Authentication** > **Providers**
2. Enable **Google** provider
3. Add your OAuth credentials
4. Add authorized redirect URLs:
   - `https://your-project.supabase.co/auth/v1/callback`
   - `http://localhost:3000/auth/callback` (for development)

---

## 3. Database Schema

Run these SQL statements in order in the Supabase SQL Editor:

### 3.1 Create Sequences for Integer IDs

```sql
-- Sequences for tables with integer primary keys
CREATE SEQUENCE IF NOT EXISTS blogs_id_seq;
CREATE SEQUENCE IF NOT EXISTS job_vacancies_id_seq;
CREATE SEQUENCE IF NOT EXISTS posts_id_seq;
```

### 3.2 Create Core Tables

```sql
-- ==========================================
-- PROFILES TABLE (Links to auth.users)
-- ==========================================
CREATE TABLE public.profiles (
  id uuid NOT NULL,
  email text,
  full_name text,
  role text DEFAULT 'user'::text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- ==========================================
-- COMPANY SETTINGS
-- ==========================================
CREATE TABLE public.company_settings (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  company_name text DEFAULT 'NNS Enterprise'::text,
  address text,
  contact_numbers text[],
  website text DEFAULT 'nns.lk'::text,
  registered_number text,
  bank_details jsonb,
  pricing_tiers jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT company_settings_pkey PRIMARY KEY (id)
);

-- ==========================================
-- INVENTORY MANAGEMENT
-- ==========================================
CREATE TABLE public.inventory_items (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name text NOT NULL UNIQUE,
  unit text NOT NULL,
  current_stock numeric DEFAULT 0,
  drum_size numeric,
  reorder_level numeric DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT inventory_items_pkey PRIMARY KEY (id)
);

CREATE TABLE public.inventory_invoices (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  invoice_number text NOT NULL UNIQUE,
  warehouse text,
  date date DEFAULT CURRENT_DATE,
  issued_by text,
  drawn_by text,
  invoice_image_url text,
  created_by uuid,
  auto_invoice_number text UNIQUE,
  ocr_processed boolean DEFAULT false,
  ocr_image_url text,
  total_items integer DEFAULT 0,
  status text DEFAULT 'draft'::text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT inventory_invoices_pkey PRIMARY KEY (id),
  CONSTRAINT inventory_invoices_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id)
);

CREATE TABLE public.inventory_invoice_items (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  invoice_id uuid,
  item_id uuid,
  description text,
  unit text,
  quantity_requested numeric,
  quantity_issued numeric,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT inventory_invoice_items_pkey PRIMARY KEY (id),
  CONSTRAINT inventory_invoice_items_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.inventory_items(id),
  CONSTRAINT inventory_invoice_items_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES public.inventory_invoices(id)
);

-- ==========================================
-- DRUM TRACKING
-- ==========================================
CREATE TABLE public.drum_tracking (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  drum_number text NOT NULL,
  item_id uuid,
  initial_quantity numeric NOT NULL,
  current_quantity numeric NOT NULL,
  status text DEFAULT 'active'::text,
  received_date date DEFAULT CURRENT_DATE,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT drum_tracking_pkey PRIMARY KEY (id),
  CONSTRAINT drum_tracking_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.inventory_items(id)
);

-- ==========================================
-- LINE DETAILS (Main fiber line installation records)
-- ==========================================
CREATE TABLE public.line_details (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  task_id uuid,
  date date DEFAULT CURRENT_DATE,
  telephone_no text NOT NULL,
  dp text NOT NULL,
  power_dp numeric CHECK (power_dp >= 0::numeric),
  power_inbox numeric CHECK (power_inbox >= 0::numeric),
  name text,
  address text,
  cable_start numeric DEFAULT 0,
  cable_middle numeric DEFAULT 0,
  cable_end numeric DEFAULT 0,
  f1 numeric GENERATED ALWAYS AS (abs(cable_start - cable_middle)) STORED,
  g1 numeric GENERATED ALWAYS AS (abs(cable_middle - cable_end)) STORED,
  total_cable numeric GENERATED ALWAYS AS (abs(cable_start - cable_middle) + abs(cable_middle - cable_end)) STORED,
  wastage numeric DEFAULT 0,
  retainers integer DEFAULT 0,
  l_hook integer DEFAULT 0,
  top_bolt integer DEFAULT 0,
  c_hook integer DEFAULT 1,
  fiber_rosette integer DEFAULT 1,
  internal_wire numeric DEFAULT 0,
  s_rosette integer DEFAULT 0,
  fac integer DEFAULT 2,
  casing numeric DEFAULT 0,
  c_tie integer DEFAULT 0,
  c_clip integer DEFAULT 0,
  conduit numeric DEFAULT 0,
  tag_tie integer DEFAULT 1,
  ont text,
  voice_test_no text,
  stb text,
  flexible integer DEFAULT 2,
  rj45 integer DEFAULT 0,
  cat5 numeric DEFAULT 0,
  pole_67 integer DEFAULT 0,
  pole integer DEFAULT 0,
  concrete_nail integer DEFAULT 0,
  roll_plug integer DEFAULT 0,
  u_clip integer DEFAULT 0,
  socket integer DEFAULT 0,
  bend integer DEFAULT 0,
  rj11 integer DEFAULT 0,
  rj12 integer DEFAULT 0,
  drum_number text,
  phone_number text,
  wastage_input numeric,
  ont_serial text,
  voice_test_no_new text,
  stb_serial text,
  drum_number_new text,
  completed_date date,
  status text,
  nut_bolt integer DEFAULT 0,
  screw_nail integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT line_details_pkey PRIMARY KEY (id)
);

-- Create unique constraint for telephone_no + date
CREATE UNIQUE INDEX IF NOT EXISTS line_details_telephone_no_date_key ON public.line_details (telephone_no, date);

-- ==========================================
-- TASKS (Work order management)
-- ==========================================
CREATE TABLE public.tasks (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  added_date date DEFAULT CURRENT_DATE,
  telephone_no text NOT NULL,
  dp text NOT NULL,
  contact_no text,
  customer_name text,
  address text,
  status text DEFAULT 'pending'::text,
  connection_types text[],
  connection_type_main text DEFAULT 'new'::text,
  rejection_reason text,
  rejected_by uuid,
  rejected_at timestamp with time zone,
  completed_at timestamp with time zone,
  created_by uuid,
  task_date date DEFAULT CURRENT_DATE,
  connection_type_new text DEFAULT 'New'::text,
  connection_services text[] DEFAULT '{}'::text[],
  assigned_to uuid,
  completed_by uuid,
  line_details_id uuid,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT tasks_pkey PRIMARY KEY (id),
  CONSTRAINT tasks_line_details_id_fkey FOREIGN KEY (line_details_id) REFERENCES public.line_details(id),
  CONSTRAINT tasks_rejected_by_fkey FOREIGN KEY (rejected_by) REFERENCES public.profiles(id),
  CONSTRAINT tasks_completed_by_fkey FOREIGN KEY (completed_by) REFERENCES public.profiles(id),
  CONSTRAINT tasks_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public.profiles(id),
  CONSTRAINT tasks_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id)
);

-- Add foreign key to line_details after tasks table is created
ALTER TABLE public.line_details
ADD CONSTRAINT line_details_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.tasks(id);

-- ==========================================
-- DRUM USAGE (Track cable consumption)
-- ==========================================
CREATE TABLE public.drum_usage (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  drum_id uuid,
  line_details_id uuid,
  quantity_used numeric NOT NULL,
  usage_date date DEFAULT CURRENT_DATE,
  cable_start_point numeric DEFAULT 0,
  cable_end_point numeric DEFAULT 0,
  wastage_calculated numeric DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT drum_usage_pkey PRIMARY KEY (id),
  CONSTRAINT drum_usage_line_details_id_fkey FOREIGN KEY (line_details_id) REFERENCES public.line_details(id),
  CONSTRAINT drum_usage_drum_id_fkey FOREIGN KEY (drum_id) REFERENCES public.drum_tracking(id)
);

-- ==========================================
-- WORKERS & WORK ASSIGNMENTS
-- ==========================================
CREATE TABLE public.workers (
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

CREATE TABLE public.work_assignments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  line_id uuid NOT NULL,
  worker_id uuid NOT NULL,
  assigned_date date NOT NULL,
  created_by uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT work_assignments_pkey PRIMARY KEY (id),
  CONSTRAINT work_assignments_line_id_fkey FOREIGN KEY (line_id) REFERENCES public.line_details(id) ON DELETE CASCADE,
  CONSTRAINT work_assignments_worker_id_fkey FOREIGN KEY (worker_id) REFERENCES public.workers(id) ON DELETE CASCADE,
  CONSTRAINT work_assignments_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id)
);

CREATE TABLE public.line_assignees (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  line_id uuid NOT NULL,
  user_id uuid NOT NULL,
  assigned_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT line_assignees_pkey PRIMARY KEY (id),
  CONSTRAINT line_assignees_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id),
  CONSTRAINT line_assignees_line_id_fkey FOREIGN KEY (line_id) REFERENCES public.line_details(id)
);

-- ==========================================
-- INVOICING
-- ==========================================
CREATE TABLE public.generated_invoices (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  invoice_number text NOT NULL,
  month integer CHECK (month >= 1 AND month <= 12),
  year integer,
  invoice_type text CHECK (invoice_type = ANY (ARRAY['A'::text, 'B'::text])),
  total_amount numeric,
  pdf_url text,
  invoice_date date,
  job_month text,
  line_count numeric,
  status text,
  line_details_ids jsonb,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT generated_invoices_pkey PRIMARY KEY (id)
);

-- ==========================================
-- WASTAGE TRACKING
-- ==========================================
CREATE TABLE public.monthly_wastage (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  month integer CHECK (month >= 1 AND month <= 12),
  year integer,
  item_id uuid,
  quantity numeric,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT monthly_wastage_pkey PRIMARY KEY (id),
  CONSTRAINT monthly_wastage_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id),
  CONSTRAINT monthly_wastage_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.inventory_items(id)
);

CREATE TABLE public.waste_tracking (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  item_id uuid,
  quantity numeric NOT NULL,
  waste_reason text,
  waste_date date DEFAULT CURRENT_DATE,
  reported_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT waste_tracking_pkey PRIMARY KEY (id),
  CONSTRAINT waste_tracking_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.inventory_items(id),
  CONSTRAINT waste_tracking_reported_by_fkey FOREIGN KEY (reported_by) REFERENCES public.profiles(id)
);

-- ==========================================
-- NOTIFICATIONS
-- ==========================================
CREATE TABLE public.notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  title character varying NOT NULL,
  message text NOT NULL,
  type character varying DEFAULT 'info'::character varying CHECK (type::text = ANY (ARRAY['info'::character varying, 'success'::character varying, 'warning'::character varying, 'error'::character varying]::text[])),
  category character varying DEFAULT 'system'::character varying CHECK (category::text = ANY (ARRAY['line_added'::character varying, 'task_completed'::character varying, 'invoice_generated'::character varying, 'report_ready'::character varying, 'inventory_low'::character varying, 'system'::character varying]::text[])),
  is_read boolean DEFAULT false,
  action_url character varying,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT notifications_pkey PRIMARY KEY (id),
  CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- ==========================================
-- CONTENT MANAGEMENT (Blog & Posts)
-- ==========================================
CREATE TABLE public.blogs (
  id integer NOT NULL DEFAULT nextval('blogs_id_seq'::regclass),
  title character varying NOT NULL,
  content text NOT NULL,
  excerpt text,
  author character varying NOT NULL,
  category character varying,
  tags text[],
  featured_image_url text,
  slug character varying UNIQUE,
  meta_description text,
  reading_time integer,
  status character varying DEFAULT 'active'::character varying CHECK (status::text = ANY (ARRAY['active'::character varying, 'disabled'::character varying]::text[])),
  published_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT blogs_pkey PRIMARY KEY (id)
);

CREATE TABLE public.posts (
  id integer NOT NULL DEFAULT nextval('posts_id_seq'::regclass),
  title character varying NOT NULL,
  content text NOT NULL,
  excerpt text,
  author character varying NOT NULL,
  category character varying,
  tags text[],
  featured_image_url text,
  status character varying DEFAULT 'active'::character varying CHECK (status::text = ANY (ARRAY['active'::character varying, 'disabled'::character varying]::text[])),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT posts_pkey PRIMARY KEY (id)
);

-- ==========================================
-- JOB VACANCIES
-- ==========================================
CREATE TABLE public.job_vacancies (
  id integer NOT NULL DEFAULT nextval('job_vacancies_id_seq'::regclass),
  title character varying NOT NULL,
  description text NOT NULL,
  requirements text,
  responsibilities text,
  department character varying,
  location character varying,
  employment_type character varying DEFAULT 'full-time'::character varying CHECK (employment_type::text = ANY (ARRAY['full-time'::character varying, 'part-time'::character varying, 'contract'::character varying, 'internship'::character varying]::text[])),
  salary_range character varying,
  experience_level character varying,
  skills text[],
  benefits text[],
  application_email character varying,
  application_url text,
  end_date date NOT NULL,
  status character varying DEFAULT 'active'::character varying CHECK (status::text = ANY (ARRAY['active'::character varying, 'disabled'::character varying]::text[])),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT job_vacancies_pkey PRIMARY KEY (id)
);

-- ==========================================
-- GOOGLE SHEETS INTEGRATION
-- ==========================================
CREATE TABLE public.google_sheet_connections (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  month integer NOT NULL CHECK (month >= 1 AND month <= 12),
  year integer NOT NULL,
  sheet_url text NOT NULL,
  sheet_id text,
  sheet_name text,
  sheet_tab text,
  created_by uuid,
  last_synced timestamp with time zone,
  status text DEFAULT 'active',
  record_count integer DEFAULT 0,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT google_sheet_connections_pkey PRIMARY KEY (id),
  CONSTRAINT google_sheet_connections_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id)
);

CREATE INDEX IF NOT EXISTS idx_google_sheet_connections_period ON public.google_sheet_connections (year, month);

-- ==========================================
-- LEGACY TABLE (May not be actively used)
-- ==========================================
CREATE TABLE public.line_entries (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  date date NOT NULL,
  phone_number text NOT NULL,
  dp text NOT NULL,
  power_dp numeric NOT NULL,
  power_inbox numeric NOT NULL,
  name text NOT NULL,
  address text NOT NULL,
  cable_start numeric NOT NULL,
  cable_middle numeric NOT NULL,
  cable_end numeric NOT NULL,
  f1 numeric NOT NULL,
  g1 numeric NOT NULL,
  total numeric NOT NULL,
  wastage numeric NOT NULL,
  user_id uuid,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT line_entries_pkey PRIMARY KEY (id),
  CONSTRAINT line_entries_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);
```

---

## 4. Row Level Security (RLS) Policies

### Enable RLS on all tables:

```sql
-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drum_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drum_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.line_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.line_assignees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generated_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monthly_wastage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.waste_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blogs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_vacancies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.google_sheet_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.line_entries ENABLE ROW LEVEL SECURITY;
```

### Create RLS Policies:

```sql
-- ==========================================
-- PROFILES - Users can view and update their own profile
-- ==========================================
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- ==========================================
-- DRUM USAGE - Authenticated users can manage
-- ==========================================
CREATE POLICY "Users can view drum usage records" ON public.drum_usage
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can insert drum usage records" ON public.drum_usage
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update drum usage records" ON public.drum_usage
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Users can delete drum usage records" ON public.drum_usage
  FOR DELETE USING (auth.role() = 'authenticated');

-- ==========================================
-- NOTIFICATIONS - Users can view their own
-- ==========================================
CREATE POLICY "Users can view own notifications" ON public.notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications" ON public.notifications
  FOR UPDATE USING (auth.uid() = user_id);

-- ==========================================
-- GENERAL POLICIES - All authenticated users can access
-- ==========================================
-- Apply to most operational tables
CREATE POLICY "Authenticated users have full access" ON public.company_settings
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users have full access" ON public.inventory_items
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users have full access" ON public.inventory_invoices
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users have full access" ON public.inventory_invoice_items
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users have full access" ON public.drum_tracking
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users have full access" ON public.line_details
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users have full access" ON public.tasks
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users have full access" ON public.workers
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users have full access" ON public.work_assignments
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users have full access" ON public.line_assignees
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users have full access" ON public.generated_invoices
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users have full access" ON public.monthly_wastage
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users have full access" ON public.waste_tracking
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users have full access" ON public.google_sheet_connections
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users have full access" ON public.line_entries
  FOR ALL USING (auth.role() = 'authenticated');

-- ==========================================
-- PUBLIC CONTENT - Anyone can view
-- ==========================================
CREATE POLICY "Anyone can view active blogs" ON public.blogs
  FOR SELECT USING (status = 'active');

CREATE POLICY "Anyone can view active posts" ON public.posts
  FOR SELECT USING (status = 'active');

CREATE POLICY "Anyone can view active job vacancies" ON public.job_vacancies
  FOR SELECT USING (status = 'active');
```

---

## 5. Database Functions & Triggers

### Auto-update timestamps:

```sql
-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables with updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_company_settings_updated_at BEFORE UPDATE ON public.company_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_inventory_items_updated_at BEFORE UPDATE ON public.inventory_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_inventory_invoices_updated_at BEFORE UPDATE ON public.inventory_invoices
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_drum_tracking_updated_at BEFORE UPDATE ON public.drum_tracking
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_line_details_updated_at BEFORE UPDATE ON public.line_details
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON public.tasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_workers_updated_at BEFORE UPDATE ON public.workers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_blogs_updated_at BEFORE UPDATE ON public.blogs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_posts_updated_at BEFORE UPDATE ON public.posts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_job_vacancies_updated_at BEFORE UPDATE ON public.job_vacancies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notifications_updated_at BEFORE UPDATE ON public.notifications
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_google_sheet_connections_updated_at BEFORE UPDATE ON public.google_sheet_connections
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### Auto-create profile on user signup:

```sql
-- Function to create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    'user'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to call function on user creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

---

## 6. Indexes for Performance

```sql
-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_line_details_date ON public.line_details(date);
CREATE INDEX IF NOT EXISTS idx_line_details_telephone_no ON public.line_details(telephone_no);
CREATE INDEX IF NOT EXISTS idx_line_details_status ON public.line_details(status);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON public.tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_task_date ON public.tasks(task_date);
CREATE INDEX IF NOT EXISTS idx_drum_usage_drum_id ON public.drum_usage(drum_id);
CREATE INDEX IF NOT EXISTS idx_drum_usage_line_details_id ON public.drum_usage(line_details_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications(is_read);
```

---

## 7. Storage Buckets (if needed)

If you plan to store files (invoices, images, etc.), create these buckets:

1. Go to **Storage** in Supabase Dashboard
2. Create the following buckets:
   - `invoice-images` - For inventory invoice images
   - `generated-invoices` - For PDF invoices
   - `blog-images` - For blog featured images (optional)

### Storage Policies:

```sql
-- Allow authenticated users to upload to invoice-images
CREATE POLICY "Authenticated users can upload invoice images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'invoice-images');

-- Allow authenticated users to view invoice images
CREATE POLICY "Authenticated users can view invoice images"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'invoice-images');

-- Similar policies for generated-invoices bucket
CREATE POLICY "Authenticated users can upload generated invoices"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'generated-invoices');

CREATE POLICY "Authenticated users can view generated invoices"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'generated-invoices');
```

---

## 8. Initial Data Setup

### Create first admin user:

After your first user signs up, run this to make them admin:

```sql
UPDATE public.profiles
SET role = 'admin'
WHERE email = 'your-admin-email@example.com';
```

### Add sample inventory items (optional):

```sql
INSERT INTO public.inventory_items (name, unit, current_stock, drum_size, reorder_level)
VALUES
  ('Drop Wire Cable', 'Meters', 0, 1000, 5000),
  ('Fiber Rosette', 'Pieces', 0, NULL, 50),
  ('C-Hook', 'Pieces', 0, NULL, 100),
  ('L-Hook', 'Pieces', 0, NULL, 100),
  ('FAC', 'Pieces', 0, NULL, 50);
```

---

## 9. Verification Checklist

After setting up, verify:

- [ ] Can sign up new users
- [ ] Users get profile created automatically
- [ ] Can log in with email/password
- [ ] Google OAuth works (if enabled)
- [ ] Can create line details
- [ ] Can create tasks
- [ ] Can manage inventory
- [ ] Drum tracking works
- [ ] RLS policies prevent unauthorized access
- [ ] Timestamps update automatically

---

## 10. Google Sheets Integration Setup (Optional)

If you want the Google Sheets import feature:

1. **Create Google Cloud Project**

   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project

2. **Enable Google Sheets API**

   - In your project, enable "Google Sheets API"

3. **Create Service Account**

   - Go to IAM & Admin > Service Accounts
   - Create a service account
   - Download the JSON key file

4. **Add to Environment Variables**

   ```env
   GOOGLE_SERVICE_ACCOUNT_EMAIL=your-service-account@project.iam.gserviceaccount.com
   GOOGLE_SERVICE_ACCOUNT_KEY={"type":"service_account","project_id":"..."}
   ```

5. **Share Google Sheets**
   - Share your Google Sheets with the service account email
   - Give it "Viewer" or "Editor" access

---

## 11. Role-Based Access

The system uses these roles:

- `user` - Default role, basic access
- `admin` - Full access to all features
- `moderator` - Can manage content and some admin features
- `employee` - Can view and update line details

To change a user's role:

```sql
UPDATE public.profiles
SET role = 'admin' -- or 'moderator', 'employee'
WHERE email = 'user@example.com';
```

---

## Support & Troubleshooting

### Common Issues:

1. **Generated columns error**: If you get errors about f1/g1/total_cable, make sure they're defined as GENERATED ALWAYS AS
2. **RLS blocking queries**: Ensure user is authenticated and has proper role
3. **Foreign key errors**: Create tables in the order shown above
4. **Google Sheets not syncing**: Verify service account has access to the sheet

---

## Next Steps

1. Create your Supabase project at https://supabase.com
2. Copy the project URL and keys to `.env.local`
3. Run all SQL statements in order
4. Create your first admin user
5. Start the Next.js app: `npm run dev`
6. Log in and test the system

---

**Document Version**: 1.0  
**Last Updated**: December 9, 2025  
**Project**: NNS Enterprise Telecom Management System
