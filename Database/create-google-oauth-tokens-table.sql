-- Google OAuth tokens table for user-scoped Sheets/Drive access
-- Run this in Supabase. Stores access and refresh tokens per user.

CREATE TABLE IF NOT EXISTS public.google_oauth_tokens (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  access_token text NOT NULL,
  refresh_token text,
  scope text,
  token_type text,
  expires_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_google_oauth_tokens_expires_at
  ON public.google_oauth_tokens (expires_at);

-- Optional RLS (enable if you are enforcing row-level security globally)
ALTER TABLE public.google_oauth_tokens ENABLE ROW LEVEL SECURITY;

-- Read (SELECT)
CREATE POLICY tokens_owner_read
  ON public.google_oauth_tokens
  FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- Insert
CREATE POLICY tokens_owner_write
  ON public.google_oauth_tokens
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- Update
CREATE POLICY tokens_owner_update
  ON public.google_oauth_tokens
  FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);