-- Create table to store Google Sheet connections for month-by-month sync
-- Run this in your Supabase database (via SQL editor or migration runner)

CREATE TABLE IF NOT EXISTS public.google_sheet_connections (
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

-- Optional: prevent duplicate sheet links for the same period (uncomment if desired)
-- CREATE UNIQUE INDEX IF NOT EXISTS ux_google_sheet_connections_year_month_sheet ON public.google_sheet_connections (year, month, sheet_id);

