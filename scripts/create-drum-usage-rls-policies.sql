-- Enable RLS on drum_usage table
ALTER TABLE drum_usage ENABLE ROW LEVEL SECURITY;

-- Policy for authenticated users to select drum usage records
CREATE POLICY "Users can view drum usage records" ON drum_usage
    FOR SELECT USING (auth.role() = 'authenticated');

-- Policy for authenticated users to insert drum usage records
CREATE POLICY "Users can insert drum usage records" ON drum_usage
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Policy for authenticated users to update drum usage records
CREATE POLICY "Users can update drum usage records" ON drum_usage
    FOR UPDATE USING (auth.role() = 'authenticated');

-- Policy for authenticated users to delete drum usage records
CREATE POLICY "Users can delete drum usage records" ON drum_usage
    FOR DELETE USING (auth.role() = 'authenticated');

-- Grant necessary permissions to authenticated users
GRANT ALL ON drum_usage TO authenticated;
GRANT USAGE ON SEQUENCE drum_usage_id_seq TO authenticated;
