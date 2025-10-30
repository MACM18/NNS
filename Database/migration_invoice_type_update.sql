-- Migration to update invoice_type constraint from A/B/C to A/B only
-- This migration is needed for the change from 3 invoices (90%/5%/5%) to 2 invoices (90%/10%)

-- IMPORTANT: Run this entire migration in a transaction to ensure atomicity

BEGIN;

-- Step 1: Check if there are any existing 'C' type invoices
-- Run this query first to verify if any 'C' type invoices exist:
DO $$
DECLARE
  c_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO c_count FROM public.generated_invoices WHERE invoice_type = 'C';
  RAISE NOTICE 'Found % invoice(s) with type C', c_count;
END $$;

-- Step 2: Handle existing 'C' type invoices (if any exist)
-- Choose ONE of the following options based on your business requirements:

-- Option A: Delete all 'C' type invoices
-- USE THIS IF: These invoices were from testing or are no longer needed
-- WARNING: This will permanently delete invoice records
-- Uncomment the following line to use this option:
-- DELETE FROM public.generated_invoices WHERE invoice_type = 'C';

-- Option B: Convert 'C' type invoices to 'B' type  
-- USE THIS IF: You want to preserve the invoice data and consolidate C invoices into B
-- This is the recommended option if you want to keep historical data
-- Uncomment the following line to use this option:
-- UPDATE public.generated_invoices SET invoice_type = 'B' WHERE invoice_type = 'C';

-- Step 3: Verify no 'C' type invoices remain (this will fail the transaction if any exist)
DO $$
DECLARE
  c_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO c_count FROM public.generated_invoices WHERE invoice_type = 'C';
  IF c_count > 0 THEN
    RAISE EXCEPTION 'Cannot proceed: % invoice(s) with type C still exist. Please choose Option A or B above.', c_count;
  END IF;
END $$;

-- Step 4: Drop the existing constraint
ALTER TABLE public.generated_invoices 
DROP CONSTRAINT IF EXISTS generated_invoices_invoice_type_check;

-- Step 5: Add the new constraint allowing only 'A' and 'B'
ALTER TABLE public.generated_invoices 
ADD CONSTRAINT generated_invoices_invoice_type_check 
CHECK (invoice_type = ANY (ARRAY['A'::text, 'B'::text]));

-- If everything succeeded, commit the transaction
COMMIT;

-- If any step fails, the entire migration will be rolled back automatically
