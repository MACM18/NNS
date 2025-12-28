-- Migration: Create monthly_inventory_usage table
-- Purpose: Track inventory usage per item per month/year to prevent duplicate deductions 
--          when syncing from Google Sheets multiple times
-- Date: 2024-12-28

-- Create the monthly_inventory_usage table
CREATE TABLE IF NOT EXISTS monthly_inventory_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
    month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
    year INTEGER NOT NULL CHECK (year >= 2000 AND year <= 2100),
    total_used DECIMAL NOT NULL DEFAULT 0,
    last_synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    connection_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure one record per item per month/year
    CONSTRAINT monthly_inventory_usage_item_month_year_unique UNIQUE (item_id, month, year)
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_monthly_inventory_usage_month_year 
    ON monthly_inventory_usage(month, year);

CREATE INDEX IF NOT EXISTS idx_monthly_inventory_usage_item_id 
    ON monthly_inventory_usage(item_id);

-- Add comment to table
COMMENT ON TABLE monthly_inventory_usage IS 'Tracks inventory usage per item per month/year to prevent duplicate deductions during Google Sheet syncs';

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_monthly_inventory_usage_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_monthly_inventory_usage_updated_at ON monthly_inventory_usage;
CREATE TRIGGER trigger_monthly_inventory_usage_updated_at
    BEFORE UPDATE ON monthly_inventory_usage
    FOR EACH ROW
    EXECUTE FUNCTION update_monthly_inventory_usage_updated_at();

-- Enable RLS (Row Level Security) if needed
-- ALTER TABLE monthly_inventory_usage ENABLE ROW LEVEL SECURITY;

-- Grant appropriate permissions (adjust based on your setup)
-- GRANT ALL ON monthly_inventory_usage TO authenticated;
-- GRANT ALL ON monthly_inventory_usage TO service_role;
