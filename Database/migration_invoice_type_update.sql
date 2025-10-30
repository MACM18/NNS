-- Migration to update invoice_type constraint from A/B/C to A/B only
-- This migration is needed for the change from 3 invoices (90%/5%/5%) to 2 invoices (90%/10%)

-- Step 1: Check if there are any existing 'C' type invoices
-- Run this query first to verify if any 'C' type invoices exist:
-- SELECT COUNT(*) FROM public.generated_invoices WHERE invoice_type = 'C';

-- Step 2: Handle existing 'C' type invoices (if any)
-- Option 1: Delete all 'C' type invoices (use if these are test/invalid data)
-- DELETE FROM public.generated_invoices WHERE invoice_type = 'C';

-- Option 2: Update 'C' type invoices to 'B' type (use if you want to preserve the data)
-- UPDATE public.generated_invoices SET invoice_type = 'B' WHERE invoice_type = 'C';

-- Step 3: Drop the existing constraint
ALTER TABLE public.generated_invoices 
DROP CONSTRAINT IF EXISTS generated_invoices_invoice_type_check;

-- Step 4: Add the new constraint allowing only 'A' and 'B'
ALTER TABLE public.generated_invoices 
ADD CONSTRAINT generated_invoices_invoice_type_check 
CHECK (invoice_type = ANY (ARRAY['A'::text, 'B'::text]));

-- Note: Make sure to complete Step 2 before running Steps 3 and 4,
-- otherwise the constraint addition will fail if 'C' type records exist.
