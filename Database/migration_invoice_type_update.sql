-- Migration to update invoice_type constraint from A/B/C to A/B only
-- This migration is needed for the change from 3 invoices (90%/5%/5%) to 2 invoices (90%/10%)

-- First, drop the existing constraint
ALTER TABLE public.generated_invoices 
DROP CONSTRAINT IF EXISTS generated_invoices_invoice_type_check;

-- Add the new constraint allowing only 'A' and 'B'
ALTER TABLE public.generated_invoices 
ADD CONSTRAINT generated_invoices_invoice_type_check 
CHECK (invoice_type = ANY (ARRAY['A'::text, 'B'::text]));

-- Note: If there are existing 'C' type invoices in the database, 
-- they should be reviewed and potentially migrated or removed before applying this constraint
