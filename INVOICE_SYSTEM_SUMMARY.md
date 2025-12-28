# Invoice System Configuration Summary

## Overview

The NNS Telecom invoice system is fully integrated with company settings and properly configured for admin management.

## ✅ Company Settings (Admin Configurable)

### API Endpoint

- **Location**: `/app/api/settings/company/route.ts`
- **Access**: Admin/Moderator only
- **Methods**: GET, PUT

### Configuration Fields

Company settings are stored in the `company_settings` table and include:

```typescript
{
  company_name: string;      // e.g., "NNS Enterprise"
  address: string;           // Company address
  contact_numbers: string[]; // Array of phone numbers
  website: string;           // e.g., "nns.lk"
  registered_number: string; // e.g., "SLTS-OSP-2023-170"
  bank_details: {
    bank_name: string;       // e.g., "Sampath Bank"
    account_title: string;   // e.g., "M A N N Sanjeewa"
    account_number: string;  // e.g., "1057 5222 1967"
    branch_code: string;     // e.g., "Horana"
    iban?: string;           // Optional
  };
  pricing_tiers: Array<{
    min_length: number;      // Minimum cable length
    max_length: number;      // Maximum (999999 for unlimited)
    rate: number;            // Rate for this tier
  }>;
}
```

### Default Pricing Tiers

```javascript
[
  { min_length: 0, max_length: 100, rate: 6000 },
  { min_length: 101, max_length: 200, rate: 6500 },
  { min_length: 201, max_length: 300, rate: 7200 },
  { min_length: 301, max_length: 400, rate: 7800 },
  { min_length: 401, max_length: 500, rate: 8200 },
  { min_length: 501, max_length: 999999, rate: 8400 },
];
```

## ✅ Invoice Generation

### Invoice PDF Integration

- **Location**: `/components/modals/invoice-pdf-modal.tsx`
- **Company Settings Usage**:
  - Fetches settings via `/api/settings/company`
  - Uses `address`, `contact_numbers`, `company_name`
  - Displays `registered_number` on invoice
  - Shows bank details for payment
  - Applies pricing tiers for rate calculation

### PDF Content Includes

1. **Bill To**: SLTS address (hardcoded client info)
2. **Company Info**: From settings
   - Company name
   - Address (✅ from settings)
   - Contact numbers (✅ from settings)
   - Registered number (✅ from settings)
3. **Bank Details**: From settings
   - Bank name
   - Account title
   - Account number
   - Branch code
4. **Pricing**: Uses pricing_tiers from settings

## ✅ Distance Calculation Fix

### Previous Issue (FIXED)

❌ **Incorrect calculation** in `/app/api/lines/by-ids/route.ts`:

```typescript
// WRONG: Added all three points
total_cable: cableStart + cableMiddle + cableEnd;
```

### Current Implementation (CORRECT)

✅ **Proper calculation** using `computeCableMeasurements`:

```typescript
// CORRECT: Total of F1 + G1
const { totalCable } = computeCableMeasurements(
  Number(line.cableStart || 0),
  Number(line.cableMiddle || 0),
  Number(line.cableEnd || 0)
);
```

### Calculation Logic (`/lib/db.ts`)

```typescript
export function computeCableMeasurements(
  cableStart: number,
  cableMiddle: number,
  cableEnd: number
) {
  const f1 = Math.abs(cableStart - cableMiddle);
  const g1 = Math.abs(cableMiddle - cableEnd);
  const totalCable = f1 + g1;
  return { f1, g1, totalCable };
}
```

### Cable Measurements Explained

- **F1**: Distance from start point to middle point
  - `f1 = abs(cableStart - cableMiddle)`
- **G1**: Distance from middle point to end point
  - `g1 = abs(cableMiddle - cableEnd)`
- **Total Cable**: Sum of F1 and G1
  - `totalCable = f1 + g1`

### Example

If a line has:

- Cable Start: 1000m
- Cable Middle: 1200m
- Cable End: 1500m

Then:

- F1 = abs(1000 - 1200) = 200m
- G1 = abs(1200 - 1500) = 300m
- **Total Cable = 200m + 300m = 500m** ✅

## Admin Settings Management

### How to Update Company Settings

1. **Via Dashboard**:

   - Navigate to Settings → Company Settings
   - Edit fields (company name, address, contact numbers, etc.)
   - Update pricing tiers if needed
   - Save changes

2. **Via API** (Admin/Moderator only):

   ```typescript
   PUT /api/settings/company

   {
     company_name: "NNS Enterprise",
     address: "No 89, Welikala, Pokunuwita",
     contact_numbers: ["0789070440", "0724918351"],
     website: "nns.lk",
     registered_number: "SLTS-OSP-2023-170",
     bank_details: {
       bank_name: "Sampath Bank",
       account_title: "M A N N Sanjeewa",
       account_number: "1057 5222 1967",
       branch_code: "Horana"
     },
     pricing_tiers: [
       { min_length: 0, max_length: 100, rate: 6000 },
       // ... more tiers
     ]
   }
   ```

3. **Authorization**:
   - Only users with role `admin` or `moderator` can update
   - Session-based authentication via NextAuth

## Files Modified

### Fixed Distance Calculation

- ✅ `/app/api/lines/by-ids/route.ts`
  - Added import: `import { computeCableMeasurements } from "@/lib/db";`
  - Changed calculation to use `computeCableMeasurements()`
  - Now returns proper F1+G1 total

### Already Correct

- ✅ `/app/api/lines/enhanced/route.ts` - Uses correct calculation
- ✅ `/lib/db.ts` - Helper function defined
- ✅ `/app/api/settings/company/route.ts` - Settings API configured
- ✅ `/components/modals/invoice-pdf-modal.tsx` - Uses company settings
- ✅ `/app/dashboard/invoices/page.tsx` - Loads pricing tiers from settings

## Validation

### Distance Calculation Test

Run this query to verify correct calculations:

```sql
SELECT
  id,
  cable_start,
  cable_middle,
  cable_end,
  abs(cable_start - cable_middle) as f1,
  abs(cable_middle - cable_end) as g1,
  abs(cable_start - cable_middle) + abs(cable_middle - cable_end) as total_cable_correct
FROM line_details
LIMIT 10;
```

### Invoice Settings Check

```bash
# Test company settings API
curl -X GET http://localhost:3000/api/settings/company \
  -H "Authorization: Bearer <session-token>"
```

## Summary

✅ **All requested features are now properly configured**:

1. **Company Addresses**: Fully manageable from admin settings

   - Stored in `company_settings` table
   - Editable via `/api/settings/company` (admin only)
   - Displayed on all generated invoices

2. **Distance Calculation**: Fixed to use F1 + G1

   - Corrected in `/app/api/lines/by-ids/route.ts`
   - Uses `computeCableMeasurements()` helper
   - Properly calculates total cable length

3. **Pricing Tiers**: Admin-configurable
   - Stored with company settings
   - Loaded dynamically from database
   - Applied during invoice generation

**No further action needed** - the system is production-ready! 🎉
