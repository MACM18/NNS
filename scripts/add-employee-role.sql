-- Add 'employee' role option to profiles
-- This role is for workers who perform line installation jobs
-- Run this migration to enable employee role selection in user management

-- Note: Supabase uses text-based roles, so no schema change needed
-- Just update the check constraint if one exists

-- If you have a role check constraint, update it:
-- ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
-- ALTER TABLE profiles ADD CONSTRAINT profiles_role_check 
--   CHECK (role IN ('user', 'employee', 'moderator', 'admin'));

-- The profiles table already supports arbitrary role values
-- This script documents the new 'employee' role for reference
