-- Migration: Create drum_tracking_history table
-- Purpose: Audit trail for drum quantity changes and better tracking
-- Date: 2024-12-28

-- Create the drum_tracking_history table
CREATE TABLE IF NOT EXISTS drum_tracking_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    drum_id UUID NOT NULL REFERENCES drum_tracking(id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL,
    previous_quantity DECIMAL,
    new_quantity DECIMAL NOT NULL,
    quantity_change DECIMAL NOT NULL,
    previous_status VARCHAR(50),
    new_status VARCHAR(50),
    line_details_id UUID,
    sync_connection_id UUID,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_drum_tracking_history_drum_id 
    ON drum_tracking_history(drum_id);

CREATE INDEX IF NOT EXISTS idx_drum_tracking_history_created_at 
    ON drum_tracking_history(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_drum_tracking_history_action 
    ON drum_tracking_history(action);

-- Add comment
COMMENT ON TABLE drum_tracking_history IS 'Audit trail for drum quantity changes and usage tracking';

-- Grant permissions (adjust based on your setup)
-- GRANT ALL ON drum_tracking_history TO authenticated;
-- GRANT ALL ON drum_tracking_history TO service_role;
