-- Add payment_type column to payroll_periods and worker_payments
-- default to 'per_line' for backwards compatibility

ALTER TABLE payroll_periods
ADD COLUMN IF NOT EXISTS payment_type VARCHAR NOT NULL DEFAULT 'per_line';

ALTER TABLE worker_payments
ADD COLUMN IF NOT EXISTS payment_type VARCHAR NOT NULL DEFAULT 'per_line';
