-- Migration: Add wastage calculation fields to drum_tracking table
-- Date: 2024-01-01
-- Description: Adds support for new wastage calculation methods and manual overrides

-- Add new columns to drum_tracking table
ALTER TABLE public.drum_tracking 
ADD COLUMN IF NOT EXISTS wastage_calculation_method text DEFAULT 'smart_segments' 
CHECK (wastage_calculation_method IN ('smart_segments', 'legacy_gaps', 'manual_override'));

ALTER TABLE public.drum_tracking 
ADD COLUMN IF NOT EXISTS manual_wastage_override numeric;

-- Update existing records to use smart_segments by default
UPDATE public.drum_tracking 
SET wastage_calculation_method = 'smart_segments' 
WHERE wastage_calculation_method IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.drum_tracking.wastage_calculation_method IS 'Method used for calculating cable wastage: smart_segments (recommended), legacy_gaps (original), or manual_override (user-defined)';
COMMENT ON COLUMN public.drum_tracking.manual_wastage_override IS 'Manual wastage value in meters when using manual_override method';