# Debugging Google Sheets Sync - Quick Reference

## Check if Sync is Working

### 1. View Console Logs (During Sync)

Open browser DevTools (F12) and watch for these log messages:

```
[syncConnection] Hardware totals aggregated: { Retainers: 45, L-Hook: 30, ... }
[syncConnection] Updated Retainers: 950 -> 905 (used: 45)
[syncConnection] Created L-Hook: initial 1000, after usage: 970
[syncConnection] Found 15 lines with drum numbers for 2024-12
[syncConnection] Unique drum numbers: ["DR-001", "DR-002", ...]
[syncConnection] Created 3 new drum tracking entries: ["DR-001", "DR-002", "DR-003"]
[syncConnection] Updated drum usage for line abc123, drum DR-001: 45m
[syncConnection] Drum summary: 15 usages processed, 3 drums recalculated
```

### 2. Check Toast Message

After sync completes, you should see:

```
✅ Sync Completed Successfully
Lines: 12 updated, 5 added • Hardware: 3 updated, 8 created • Drums: 5 updated, 15 usages
```

**If you see "0" for hardware:**

- Check if sheet has hardware columns (Retainers, L-Hook, etc.)
- Check if values are numbers (not text)
- Check console for error messages

### 3. Verify Database (PostgreSQL)

#### Check inventory items:

```sql
-- List all inventory items with stock
SELECT name, current_stock, unit, reorder_level, created_at
FROM inventory_items
ORDER BY created_at DESC;

-- Check specific hardware items
SELECT name, current_stock
FROM inventory_items
WHERE name IN ('Retainers', 'L-Hook', 'C-Hook', 'Fiber-rosette');
```

#### Check line details:

```sql
-- Count lines synced this month
SELECT COUNT(*),
       DATE_TRUNC('month', date) as month
FROM line_details
WHERE date >= '2024-12-01'
GROUP BY DATE_TRUNC('month', date);

-- Check if hardware columns populated
SELECT
  COUNT(*) as total_lines,
  COUNT(NULLIF(retainers, 0)) as lines_with_retainers,
  COUNT(NULLIF(l_hook, 0)) as lines_with_l_hook,
  SUM(retainers) as total_retainers,
  SUM(l_hook) as total_l_hook
FROM line_details
WHERE date >= '2024-12-01';
```

#### Check drum tracking:

```sql
-- List all drums with usage
SELECT
  dt.drum_number,
  dt.initial_quantity,
  dt.current_quantity,
  dt.quantity_used,
  COUNT(du.id) as usage_records
FROM drum_tracking dt
LEFT JOIN drum_usage du ON du.drum_id = dt.id
GROUP BY dt.id, dt.drum_number, dt.initial_quantity, dt.current_quantity, dt.quantity_used
ORDER BY dt.drum_number;

-- Check drum usages for specific month
SELECT
  du.usage_date,
  dt.drum_number,
  du.quantity_used,
  ld.number as line_number
FROM drum_usage du
JOIN drum_tracking dt ON dt.id = du.drum_id
JOIN line_details ld ON ld.id = du.line_details_id
WHERE du.usage_date >= '2024-12-01'
ORDER BY du.usage_date DESC;
```

## Common Issues & Solutions

### Issue 1: Hardware shows "0 items"

**Symptoms:**

- Toast shows `Hardware: 0 items`
- Console shows: `Hardware totals aggregated: {}`

**Causes:**

1. Sheet doesn't have hardware columns
2. Column names don't match (should be: "Retainers", "L-Hook", etc.)
3. Values are text instead of numbers

**Fix:**

- Verify sheet has required headers (case-insensitive)
- Ensure values are numbers (not "5 pcs" - just "5")
- Check `headerIndex()` function has correct column mappings

### Issue 2: Items created but stock is wrong

**Symptoms:**

- Items appear in database
- Stock values don't match expected

**Causes:**

1. Initial stock calculation issue
2. Multiple syncs decrementing twice
3. Manual changes to stock not accounted for

**Fix:**

- Check initial stock logic: `Math.max(1000, totalUsed * 10)`
- Verify sync only runs once per session
- Use database query to see stock history:
  ```sql
  SELECT name, current_stock, created_at, updated_at
  FROM inventory_items
  WHERE name = 'Retainers'
  ORDER BY updated_at DESC;
  ```

### Issue 3: Drum numbers not tracked

**Symptoms:**

- Toast shows `Drums: 0 updated, 0 usages`
- Console shows: `No drum numbers found in lines`

**Causes:**

1. Sheet doesn't have "Drum Number" column
2. Column is empty
3. Drum numbers are in wrong format

**Fix:**

- Add "Drum Number" column to sheet (variants: "Drum No", "Drum", "Drum #")
- Fill in drum numbers for each line
- Verify `mapSheetRow()` extracts drum_number correctly

### Issue 4: Database errors during sync

**Symptoms:**

- Sync fails with error message
- Console shows Prisma errors

**Possible errors:**

**A) Foreign key constraint:**

```
Foreign key constraint failed on the field: `created_by_id`
```

**Fix:** Ensure user profile exists in `profiles` table

**B) Unique constraint:**

```
Unique constraint failed on the fields: (`name`)
```

**Fix:** Item already exists - should update instead of create

**C) Type error:**

```
Invalid type for field `current_stock`: expected Decimal
```

**Fix:** Ensure values are numbers, not strings

## Manual Testing Steps

### Test 1: New Hardware Items

1. Create test sheet with NEW hardware types
2. Run sync
3. ✅ Should see "Hardware: 0 updated, 5 created"
4. ✅ Check database - items should exist with initial stock

### Test 2: Existing Hardware Items

1. Run sync again with same data
2. ✅ Should see "Hardware: 5 updated, 0 created"
3. ✅ Stock should decrease by usage amount

### Test 3: Drum Tracking

1. Add "Drum Number" column to sheet
2. Fill with values: "DR-001", "DR-002", etc.
3. Run sync
4. ✅ Should see "Drums: X updated, Y usages"
5. ✅ Check `drum_tracking` and `drum_usage` tables

### Test 4: Date Handling

1. Verify dates in sheet (can be just day: "15", "20")
2. Run sync for December 2024
3. ✅ All dates should be "2024-12-XX"
4. ✅ NOT "2001-01-XX" or other wrong year

## Monitoring Queries

Save these for regular monitoring:

```sql
-- Daily sync summary
SELECT
  DATE(updated_at) as sync_date,
  COUNT(*) as items_synced
FROM line_details
WHERE updated_at >= NOW() - INTERVAL '7 days'
GROUP BY DATE(updated_at)
ORDER BY sync_date DESC;

-- Hardware inventory status
SELECT
  name,
  current_stock,
  reorder_level,
  CASE
    WHEN current_stock <= reorder_level THEN '⚠️ LOW STOCK'
    ELSE '✅ OK'
  END as status
FROM inventory_items
WHERE unit = 'pcs'
ORDER BY
  CASE WHEN current_stock <= reorder_level THEN 0 ELSE 1 END,
  current_stock ASC;

-- Drum usage by month
SELECT
  DATE_TRUNC('month', du.usage_date) as month,
  dt.drum_number,
  COUNT(du.id) as times_used,
  SUM(du.quantity_used) as total_meters
FROM drum_usage du
JOIN drum_tracking dt ON dt.id = du.drum_id
GROUP BY DATE_TRUNC('month', du.usage_date), dt.drum_number
ORDER BY month DESC, total_meters DESC;
```

## Environment Setup

Ensure these environment variables are set:

```env
# Google Sheets API
GOOGLE_SERVICE_ACCOUNT_EMAIL="your-service-account@project.iam.gserviceaccount.com"
GOOGLE_SERVICE_ACCOUNT_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# Database
DATABASE_URL="postgresql://user:password@host:5432/database"

# NextAuth
NEXTAUTH_SECRET="your-secret-key"
NEXTAUTH_URL="http://localhost:3000"
```

## Getting Help

If sync still not working after checking above:

1. **Copy console logs** (entire output)
2. **Run database queries** (share results)
3. **Export sheet structure** (share column names)
4. **Check environment vars** (make sure they're set)
5. **Restart dev server** (`npm run dev`)

---

**Quick Debug Command:**

```bash
# Check if Prisma can connect
npx prisma db pull

# Regenerate Prisma client
npx prisma generate

# View database schema
npx prisma studio
```
