-- Migration: create google_sheet_connections table for Supabase
-- Run this from your project migrations or directly in the Supabase SQL editor.

CREATE TABLE IF NOT EXISTS public.google_sheet_connections (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  month integer NOT NULL CHECK (month >= 1 AND month <= 12),
  year integer NOT NULL,
  sheet_url text NOT NULL,
  sheet_id text,
  sheet_name text,
  sheet_tab text,
  created_by uuid,
  oauth_user_id uuid, -- the Google OAuth owner whose tokens are used for this connection
  last_synced timestamp with time zone,
  status text DEFAULT 'active',
  record_count integer DEFAULT 0,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT google_sheet_connections_pkey PRIMARY KEY (id),
  CONSTRAINT google_sheet_connections_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id),
  CONSTRAINT google_sheet_connections_oauth_user_id_fkey FOREIGN KEY (oauth_user_id) REFERENCES public.profiles(id)
);

CREATE INDEX IF NOT EXISTS idx_google_sheet_connections_period ON public.google_sheet_connections (year, month);
CREATE INDEX IF NOT EXISTS idx_google_sheet_connections_oauth ON public.google_sheet_connections (oauth_user_id);

-- Optionally add RLS policies or grants here depending on your Supabase security model
