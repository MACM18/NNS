-- Migration: Add inactive status option to drum_tracking table
-- Date: 2024-01-01
-- Description: Adds support for inactive drum status

-- Add inactive status to the existing status check constraint
-- First, drop the existing constraint if it exists
DO $$ 
BEGIN
    -- Check if constraint exists and drop it
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'drum_tracking_status_check') THEN
        ALTER TABLE public.drum_tracking DROP CONSTRAINT drum_tracking_status_check;
    END IF;
END $$;

-- Add the new constraint with inactive status
ALTER TABLE public.drum_tracking 
ADD CONSTRAINT drum_tracking_status_check 
CHECK (status IN ('active', 'empty', 'maintenance', 'inactive'));

-- Update any existing records that might have invalid statuses
UPDATE public.drum_tracking 
SET status = 'active' 
WHERE status NOT IN ('active', 'empty', 'maintenance', 'inactive');

-- Add comment for documentation
COMMENT ON COLUMN public.drum_tracking.status IS 'Drum status: active (in use), empty (used up), maintenance (under repair), inactive (not in use - remaining cable added to wastage)';