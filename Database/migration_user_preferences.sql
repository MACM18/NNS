-- Add preferences JSON column to profiles table for storing user settings
-- This column will store notification preferences, security settings, and appearance preferences

-- Add the column (nullable, JSON type)
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN profiles.preferences IS 'Stores user preferences including notifications, security, and appearance settings as JSON';

-- Create index for faster JSON queries (optional but recommended)
CREATE INDEX IF NOT EXISTS idx_profiles_preferences ON profiles USING GIN (preferences);
