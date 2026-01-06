import prisma from "@/lib/prisma";
import { calculateSmartWastage } from "@/lib/drum-wastage-calculator";

/**
 * Create or update drum tracking record with history
 */
export async function upsertDrumWithHistory(params: {
  drumNumber: string;
  initialQuantity?: number;
  itemId?: string;
  syncConnectionId?: string;
  action: "created" | "usage_added" | "quantity_adjusted" | "status_changed";
  notes?: string;
}) {
  const {
    drumNumber,
    initialQuantity,
    itemId,
    syncConnectionId,
    action,
    notes,
  } = params;

  // Check if drum exists
  const existing = await prisma.drumTracking.findFirst({
    where: { drumNumber },
    select: {
      id: true,
      currentQuantity: true,
      status: true,
      itemId: true,
      initialQuantity: true,
    },
  });

  if (existing) {
    return {
      id: existing.id,
      drumNumber,
      isNew: false,
    };
  }

  // Create new drum with default values
  const drumSize = initialQuantity || 2000;

  // Try to find Drop Wire Cable item for default
  let defaultItemId = itemId;
  if (!defaultItemId) {
    const item = await prisma.inventoryItem.findFirst({
      where: { name: { contains: "Drop Wire Cable", mode: "insensitive" } },
      select: { id: true, drumSize: true },
    });
    defaultItemId = item?.id ?? undefined;
  }

  const created = await prisma.drumTracking.create({
    data: {
      drumNumber,
      itemId: defaultItemId,
      initialQuantity: drumSize,
      currentQuantity: drumSize,
      status: "active",
    },
  });

  // Create history record
  await prisma.drumTrackingHistory.create({
    data: {
      drumId: created.id,
      action: "created",
      previousQuantity: null,
      newQuantity: drumSize,
      quantityChange: drumSize,
      previousStatus: null,
      newStatus: "active",
      syncConnectionId,
      notes: notes || `Drum ${drumNumber} created during sync`,
    },
  });

  return {
    id: created.id,
    drumNumber: created.drumNumber,
    isNew: true,
  };
}

/**
 * Update drum quantity with history tracking
 */
export async function updateDrumQuantityWithHistory(params: {
  drumId: string;
  newQuantity: number;
  newStatus?: string;
  lineDetailsId?: string;
  syncConnectionId?: string;
  action: "usage_added" | "quantity_adjusted" | "status_changed";
  notes?: string;
}) {
  const {
    drumId,
    newQuantity,
    newStatus,
    lineDetailsId,
    syncConnectionId,
    action,
    notes,
  } = params;

  // Get current drum state
  const drum = await prisma.drumTracking.findUnique({
    where: { id: drumId },
    select: { currentQuantity: true, status: true },
  });

  if (!drum) {
    throw new Error(`Drum not found: ${drumId}`);
  }

  const previousQuantity = Number(drum.currentQuantity);
  const quantityChange = newQuantity - previousQuantity;

  // Update drum
  await prisma.drumTracking.update({
    where: { id: drumId },
    data: {
      currentQuantity: newQuantity,
      status: newStatus || drum.status,
    },
  });

  // Create history record
  await prisma.drumTrackingHistory.create({
    data: {
      drumId,
      action,
      previousQuantity,
      newQuantity,
      quantityChange,
      previousStatus: drum.status,
      newStatus: newStatus || drum.status,
      lineDetailsId,
      syncConnectionId,
      notes,
    },
  });

  return { success: true, quantityChange };
}

/**
 * Recalculate drum quantities using smart wastage calculation and update with history
 */
export async function recalculateDrumWithHistory(
  drumId: string,
  syncConnectionId?: string
): Promise<{ success: boolean; newQuantity: number; wastage: number }> {
  const drum = await prisma.drumTracking.findUnique({
    where: { id: drumId },
    include: {
      item: { select: { drumSize: true } },
      drumUsages: {
        select: {
          id: true,
          cableStartPoint: true,
          cableEndPoint: true,
          usageDate: true,
          quantityUsed: true,
        },
      },
    },
  });

  if (!drum) {
    throw new Error(`Drum not found: ${drumId}`);
  }

  const capacity = drum.item?.drumSize
    ? Number(drum.item.drumSize)
    : Number(drum.initialQuantity);
  const usages = (drum.drumUsages || []).map((u) => ({
    id: u.id,
    cable_start_point: Number(u.cableStartPoint || 0),
    cable_end_point: Number(u.cableEndPoint || 0),
    usage_date: u.usageDate?.toISOString() || new Date().toISOString(),
    quantity_used: Number(u.quantityUsed || 0),
  }));

  const result = calculateSmartWastage(
    usages,
    capacity,
    undefined,
    drum.status || "active"
  );

  const previousQuantity = Number(drum.currentQuantity);
  const newQuantity = result.calculatedCurrentQuantity;
  const quantityChange = newQuantity - previousQuantity;

  // Only update if there's a significant change (more than 0.01)
  if (Math.abs(quantityChange) > 0.01) {
    await prisma.drumTracking.update({
      where: { id: drumId },
      data: { currentQuantity: newQuantity },
    });

    await prisma.drumTrackingHistory.create({
      data: {
        drumId,
        action: "quantity_adjusted",
        previousQuantity,
        newQuantity,
        quantityChange,
        previousStatus: drum.status,
        newStatus: drum.status,
        syncConnectionId,
        notes: `Recalculated using smart wastage: ${
          usages.length
        } usages, ${result.totalWastage.toFixed(2)}m wastage`,
      },
    });
  }

  return {
    success: true,
    newQuantity,
    wastage: result.totalWastage,
  };
}

/**
 * Get drum history for audit purposes
 */
export async function getDrumHistory(drumId: string, limit = 50) {
  return await prisma.drumTrackingHistory.findMany({
    where: { drumId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

/**
 * Batch ensure drums exist and return map
 */
export async function ensureDrumsExistWithHistory(
  drumNumbers: string[],
  syncConnectionId?: string
): Promise<Map<string, { id: string; isNew: boolean }>> {
  const unique = Array.from(new Set(drumNumbers.filter(Boolean)));
  const result = new Map<string, { id: string; isNew: boolean }>();

  for (const drumNumber of unique) {
    const drum = await upsertDrumWithHistory({
      drumNumber,
      syncConnectionId,
      action: "created",
      notes: `Auto-created during Google Sheets sync`,
    });
    result.set(drumNumber, { id: drum.id, isNew: drum.isNew });
  }

  return result;
}
