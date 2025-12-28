import prisma from "@/lib/prisma";

/**
 * Hardware field to inventory item name mapping
 * Used to translate line_details fields to inventory items
 */
export const HARDWARE_MAPPING: Record<string, string> = {
  retainers: "Retainers",
  l_hook: "L-Hook",
  top_bolt: "Top-Bolt",
  c_hook: "C-Hook",
  fiber_rosette: "Fiber-rosette",
  s_rosette: "S-Rosette",
  fac: "FAC",
  c_tie: "C-Tie",
  c_clip: "C-Clip",
  tag_tie: "Tag Tie",
  flexible: "Flexible",
  rj45: "RJ 45",
  cat5: "Cat 5",
  pole_67: "Pole-6.7",
  pole: "Pole-5.6",
  concrete_nail: "Concrete nail",
  roll_plug: "Roll Plug",
  u_clip: "U-Clip",
  socket: "Socket",
  bend: "Bend",
  rj11: "RJ 11",
  rj12: "RJ 12",
  nut_bolt: "Nut Bolt",
  screw_nail: "Screw Nail",
  internal_wire: "Internal Wire",
  conduit: "Conduit",
  casing: "Casing",
};

export interface InventoryUsageResult {
  itemsUpdated: number;
  itemsCreated: number;
  usageRecordsUpdated: number;
  errors: string[];
}

/**
 * Calculate the total hardware usage from sheet rows
 */
export function aggregateHardwareUsage(
  sheetRows: Record<string, any>[]
): Record<string, number> {
  const hardwareTotals: Record<string, number> = {};

  for (const row of sheetRows) {
    for (const [field, itemName] of Object.entries(HARDWARE_MAPPING)) {
      const qty = Number(row[field] || 0);
      if (qty > 0) {
        hardwareTotals[itemName] = (hardwareTotals[itemName] || 0) + qty;
      }
    }
  }

  return hardwareTotals;
}

/**
 * Get or create inventory item by name
 */
async function getOrCreateInventoryItem(
  itemName: string,
  initialStock: number = 1000
): Promise<{ id: string; currentStock: number; isNew: boolean }> {
  // Try to find existing item (case-insensitive)
  let item = await prisma.inventoryItem.findFirst({
    where: { name: { equals: itemName, mode: "insensitive" } },
    select: { id: true, currentStock: true, name: true },
  });

  if (item) {
    return {
      id: item.id,
      currentStock: Number(item.currentStock),
      isNew: false,
    };
  }

  // Create new inventory item
  const created = await prisma.inventoryItem.create({
    data: {
      name: itemName,
      unit: "pcs",
      currentStock: initialStock,
      reorderLevel: 100,
    },
  });

  return {
    id: created.id,
    currentStock: Number(created.currentStock),
    isNew: true,
  };
}

/**
 * Get existing monthly usage record for an item/month/year
 */
async function getMonthlyUsage(
  itemId: string,
  month: number,
  year: number
): Promise<{ id: string; totalUsed: number } | null> {
  const existing = await prisma.monthlyInventoryUsage.findUnique({
    where: {
      itemId_month_year: { itemId, month, year },
    },
    select: { id: true, totalUsed: true },
  });

  if (!existing) return null;

  return {
    id: existing.id,
    totalUsed: Number(existing.totalUsed),
  };
}

/**
 * Update or create monthly usage record and adjust inventory accordingly
 *
 * This function:
 * 1. Checks if there's an existing usage record for this item/month/year
 * 2. Calculates the difference between new usage and existing usage
 * 3. Only deducts the difference from inventory (prevents duplicate deductions)
 * 4. Updates or creates the monthly usage record
 */
async function updateInventoryWithUsage(
  itemId: string,
  itemName: string,
  month: number,
  year: number,
  newTotalUsed: number,
  connectionId?: string
): Promise<{ inventoryDelta: number; usageUpdated: boolean }> {
  // Get existing monthly usage
  const existingUsage = await getMonthlyUsage(itemId, month, year);
  const previousTotalUsed = existingUsage?.totalUsed || 0;

  // Calculate the difference (what needs to be deducted from inventory)
  const usageDelta = newTotalUsed - previousTotalUsed;

  // Update or create the monthly usage record
  if (existingUsage) {
    await prisma.monthlyInventoryUsage.update({
      where: { id: existingUsage.id },
      data: {
        totalUsed: newTotalUsed,
        lastSyncedAt: new Date(),
        connectionId: connectionId || undefined,
      },
    });
  } else {
    await prisma.monthlyInventoryUsage.create({
      data: {
        itemId,
        month,
        year,
        totalUsed: newTotalUsed,
        connectionId: connectionId || undefined,
      },
    });
  }

  // Only update inventory if there's a positive delta (usage increased)
  // Negative delta means items were removed from sheet - we don't auto-refund
  if (usageDelta > 0) {
    await prisma.inventoryItem.update({
      where: { id: itemId },
      data: {
        currentStock: {
          decrement: usageDelta,
        },
      },
    });

    // Ensure stock doesn't go negative
    const item = await prisma.inventoryItem.findUnique({
      where: { id: itemId },
      select: { currentStock: true },
    });

    if (item && Number(item.currentStock) < 0) {
      await prisma.inventoryItem.update({
        where: { id: itemId },
        data: { currentStock: 0 },
      });
    }
  }

  return {
    inventoryDelta: usageDelta,
    usageUpdated: true,
  };
}

/**
 * Main function to update inventory based on hardware usage from Google Sheets sync
 *
 * This prevents duplicate deductions by:
 * 1. Tracking total usage per item per month in monthly_inventory_usage table
 * 2. Only deducting the difference between new and previous usage totals
 */
export async function updateInventoryFromSheetSync(
  sheetRows: Record<string, any>[],
  month: number,
  year: number,
  connectionId?: string
): Promise<InventoryUsageResult> {
  const result: InventoryUsageResult = {
    itemsUpdated: 0,
    itemsCreated: 0,
    usageRecordsUpdated: 0,
    errors: [],
  };

  // Aggregate hardware usage from all rows
  const hardwareTotals = aggregateHardwareUsage(sheetRows);

  console.log(
    `[updateInventoryFromSheetSync] Processing ${
      Object.keys(hardwareTotals).length
    } items for ${month}/${year}`
  );

  // Process each hardware item
  for (const [itemName, totalUsed] of Object.entries(hardwareTotals)) {
    if (totalUsed <= 0) continue;

    try {
      // Get or create the inventory item
      const { id: itemId, isNew } = await getOrCreateInventoryItem(
        itemName,
        Math.max(1000, totalUsed * 10)
      );

      if (isNew) {
        result.itemsCreated++;
        // For new items, we already set the initial stock minus usage during creation
        // Create the monthly usage record
        await prisma.monthlyInventoryUsage.create({
          data: {
            itemId,
            month,
            year,
            totalUsed,
            connectionId: connectionId || undefined,
          },
        });

        // Deduct from the new item's stock
        await prisma.inventoryItem.update({
          where: { id: itemId },
          data: {
            currentStock: {
              decrement: totalUsed,
            },
          },
        });

        result.usageRecordsUpdated++;
        continue;
      }

      // Update inventory with usage (handles delta calculation)
      const { inventoryDelta, usageUpdated } = await updateInventoryWithUsage(
        itemId,
        itemName,
        month,
        year,
        totalUsed,
        connectionId
      );

      if (inventoryDelta !== 0) {
        result.itemsUpdated++;
      }
      if (usageUpdated) {
        result.usageRecordsUpdated++;
      }

      console.log(
        `[updateInventoryFromSheetSync] ${itemName}: totalUsed=${totalUsed}, delta=${inventoryDelta}`
      );
    } catch (err) {
      const errorMsg = `Failed to update ${itemName}: ${
        err instanceof Error ? err.message : String(err)
      }`;
      console.error(`[updateInventoryFromSheetSync] ${errorMsg}`);
      result.errors.push(errorMsg);
    }
  }

  return result;
}

/**
 * Get the monthly inventory usage summary for a given month/year
 */
export async function getMonthlyInventoryUsageSummary(
  month: number,
  year: number
): Promise<
  Array<{
    itemId: string;
    itemName: string;
    totalUsed: number;
    currentStock: number;
    lastSyncedAt: Date;
  }>
> {
  const usages = await prisma.monthlyInventoryUsage.findMany({
    where: { month, year },
    include: {
      item: {
        select: { id: true, name: true, currentStock: true },
      },
    },
    orderBy: { totalUsed: "desc" },
  });

  return usages.map((u) => ({
    itemId: u.item.id,
    itemName: u.item.name,
    totalUsed: Number(u.totalUsed),
    currentStock: Number(u.item.currentStock),
    lastSyncedAt: u.lastSyncedAt,
  }));
}

/**
 * Reset monthly usage for a specific month/year (admin function)
 * This will also restore the inventory amounts
 */
export async function resetMonthlyInventoryUsage(
  month: number,
  year: number
): Promise<{ itemsReset: number; inventoryRestored: number }> {
  const usages = await prisma.monthlyInventoryUsage.findMany({
    where: { month, year },
    select: { id: true, itemId: true, totalUsed: true },
  });

  let inventoryRestored = 0;

  // Restore inventory for each usage record
  for (const usage of usages) {
    const usedAmount = Number(usage.totalUsed);
    if (usedAmount > 0) {
      await prisma.inventoryItem.update({
        where: { id: usage.itemId },
        data: {
          currentStock: {
            increment: usedAmount,
          },
        },
      });
      inventoryRestored++;
    }
  }

  // Delete all usage records for this month/year
  await prisma.monthlyInventoryUsage.deleteMany({
    where: { month, year },
  });

  return {
    itemsReset: usages.length,
    inventoryRestored,
  };
}

/**
 * Recalculate inventory based on all monthly usage records
 * Useful for data recovery or consistency checks
 */
export async function recalculateInventoryFromUsage(): Promise<{
  itemsProcessed: number;
  totalUsageRecords: number;
}> {
  // Get all inventory items with their invoice additions and monthly usage
  const items = await prisma.inventoryItem.findMany({
    include: {
      inventoryInvoiceItems: {
        select: { quantityIssued: true },
      },
      monthlyInventoryUsages: {
        select: { totalUsed: true },
      },
      wasteTracking: {
        select: { quantity: true },
      },
    },
  });

  let itemsProcessed = 0;
  let totalUsageRecords = 0;

  for (const item of items) {
    // Calculate total received from invoices
    const totalReceived = item.inventoryInvoiceItems.reduce(
      (sum, ii) => sum + Number(ii.quantityIssued || 0),
      0
    );

    // Calculate total used from monthly usage
    const totalUsed = item.monthlyInventoryUsages.reduce(
      (sum, mu) => sum + Number(mu.totalUsed || 0),
      0
    );

    // Calculate total wasted
    const totalWasted = item.wasteTracking.reduce(
      (sum, wt) => sum + Number(wt.quantity || 0),
      0
    );

    // Calculate expected current stock
    const expectedStock = Math.max(0, totalReceived - totalUsed - totalWasted);

    // Update if different (with small tolerance for decimals)
    const currentStock = Number(item.currentStock);
    if (Math.abs(currentStock - expectedStock) > 0.01) {
      await prisma.inventoryItem.update({
        where: { id: item.id },
        data: { currentStock: expectedStock },
      });
      itemsProcessed++;
    }

    totalUsageRecords += item.monthlyInventoryUsages.length;
  }

  return { itemsProcessed, totalUsageRecords };
}
