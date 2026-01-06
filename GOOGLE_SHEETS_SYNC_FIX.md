# Google Sheets Sync - Hardware Inventory Fix

## Problem

The hardware inventory items were **not being updated** during Google Sheets sync despite the code running without errors. The sync would complete successfully but show "0 items" for hardware updates.

## Root Cause

The original code only tried to **UPDATE** existing inventory items but **never created them if they didn't exist**. The logic was:

1. Search for item by name
2. If found → Update stock
3. If NOT found → **Skip it silently** ❌

## Solution Implemented

### 1. Auto-Create Missing Inventory Items

Changed the hardware inventory logic to:

1. Search for item by name
2. If found → Update stock (decrement)
3. If NOT found → **CREATE the item with initial stock** ✅

**Code changes** in `actions.ts` lines 347-449:

```typescript
if (item) {
  // Update existing item - decrement stock
  const currentStock = Number(item.currentStock);
  const newStock = Math.max(0, currentStock - totalUsed);
  await prisma.inventoryItem.update({
    where: { id: item.id },
    data: { currentStock: newStock },
  });
  hardwareUpdated++;
} else {
  // ✅ NEW: Create inventory item if it doesn't exist
  const initialStock = Math.max(1000, totalUsed * 10); // Start with 10x usage or 1000
  const newStock = initialStock - totalUsed;

  const created = await prisma.inventoryItem.create({
    data: {
      name: itemName,
      unit: "pcs",
      currentStock: newStock,
      reorderLevel: 100,
    },
  });
  hardwareCreated++; // Track created items
}
```

### 2. Comprehensive Logging

Added detailed console logging at every step to debug issues:

```typescript
// Log aggregated totals
console.log(`[syncConnection] Hardware totals aggregated:`, hardwareTotals);

// Log each update
console.log(
  `[syncConnection] Updated ${item.name}: ${currentStock} -> ${newStock} (used: ${totalUsed})`
);

// Log each creation
console.log(
  `[syncConnection] Created ${created.name}: initial ${initialStock}, after usage: ${newStock}`
);

// Log failures
console.error(
  `[syncConnection] Failed to update/create inventory for ${itemName}:`,
  err
);
```

### 3. Enhanced Drum Tracking Logging

Added comprehensive logging for drum tracking to debug future issues:

```typescript
console.log(
  `[syncConnection] Found ${monthLines.length} lines with drum numbers for ${year}-${month}`
);
console.log(`[syncConnection] Unique drum numbers:`, drumNumbers);
console.log(
  `[syncConnection] Created ${createdNumbers.length} new drum tracking entries:`,
  createdNumbers
);
console.log(
  `[syncConnection] Updated drum usage for line ${line.id}, drum ${line.drumNumber}: ${quantityUsed}m`
);
```

### 4. Updated Toast Message

Modified `SyncSheetButton.tsx` to show both updated AND created hardware:

**Before:**

```
Hardware: 0 items
```

**After:**

```
Hardware: 5 updated, 12 created
```

## Hardware Items Tracked

The sync now tracks these 28 hardware types:

- Retainers
- L-Hook
- Top-Bolt
- C-Hook
- Fiber-rosette
- S-Rosette
- FAC
- C-Tie
- C-Clip
- Tag Tie
- Flexible
- RJ 45
- Cat 5
- Pole-6.7
- Pole-5.6
- Concrete nail
- Roll Plug
- U-Clip
- Socket
- Bend
- RJ 11
- RJ 12
- Nut Bolt
- Screw Nail
- Internal Wire
- Conduit
- Casing

## How It Works Now

### Sync Flow:

1. **Sheet Data Import**

   - Read Google Sheet rows
   - Extract hardware quantities from each row
   - Aggregate totals per hardware type

2. **Inventory Processing**

   - For each hardware type with usage:
     - Search for item in `inventory_items` table
     - **If exists**: Decrement stock, increment `hardwareUpdated`
     - **If missing**: Create with initial stock (10x usage or 1000), increment `hardwareCreated`
   - Log all operations with detailed info

3. **Toast Notification**
   - Show: `Hardware: X updated, Y created`
   - User sees exactly what happened

## Testing Checklist

✅ Run a sync with new hardware types (should create them)
✅ Run a second sync (should update existing items)  
✅ Check console logs for detailed operation info
✅ Verify `inventory_items` table has correct stock values
✅ Confirm toast shows created/updated counts correctly

## Files Modified

1. **`/app/dashboard/integrations/google-sheets/actions.ts`**

   - Lines 347-449: Hardware inventory auto-creation
   - Lines 450-565: Enhanced drum tracking logging
   - Lines 600-650: Helper function logging

2. **`/components/integrations/SyncSheetButton.tsx`**
   - Lines 45-60: Updated toast to show `hardwareCreated` count

## Initial Stock Logic

When creating a new inventory item:

```typescript
const initialStock = Math.max(1000, totalUsed * 10);
const newStock = initialStock - totalUsed;
```

- **Initial stock**: 10x the first usage OR 1000 (whichever is higher)
- **After sync**: Deduct the usage from initial stock
- **Example**: If 50 items used → Initial: 1000, After: 950

This prevents items from immediately showing as "low stock" after first sync.

## Future Enhancements

Consider these improvements:

1. **Admin notification** when new items are created
2. **Configurable initial stock** per item type
3. **Inventory report** showing all auto-created items
4. **Bulk stock adjustment** UI for setting proper initial values

---

**Date Fixed:** 2025-01-XX  
**Issue:** Hardware inventory items not being added to database  
**Status:** ✅ RESOLVED
