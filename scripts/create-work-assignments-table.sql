-- Create work_assignments table to track which workers handled each line on a given date
CREATE TABLE IF NOT EXISTS work_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  line_id UUID NOT NULL REFERENCES line_details(id) ON DELETE CASCADE,
  worker_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  assigned_date DATE NOT NULL,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Prevent duplicate assignments for the same worker/line/date combination
CREATE UNIQUE INDEX IF NOT EXISTS idx_work_assignments_unique ON work_assignments(line_id, worker_id, assigned_date);

-- Helpful indexes for querying by date/line
CREATE INDEX IF NOT EXISTS idx_work_assignments_date ON work_assignments(assigned_date);
CREATE INDEX IF NOT EXISTS idx_work_assignments_line ON work_assignments(line_id);
