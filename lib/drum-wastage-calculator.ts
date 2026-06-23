/**
 * Enhanced drum wastage calculation utilities
 * Handles bidirectional cable usage and overlapping segments
 */

export interface UsageSegment {
  start: number
  end: number
  length: number
  usageId: string
  usageDate: string
}

export interface WastageCalculationResult {
  totalUsed: number
  totalWastage: number
  calculatedCurrentQuantity: number
  remainingCable: number
  usageSegments: UsageSegment[]
  wastedSegments: Array<{ start: number; end: number; length: number }>
  calculationMethod: 'smart_segments' | 'legacy_gaps' | 'manual_override'
  manualWastageOverride?: number
}

export interface DrumUsage {
  id: string
  cable_start_point: number
  cable_end_point: number
  usage_date: string
  quantity_used?: number
}

/**
 * Preprocesses usages to allocate sequential segments for unmapped records
 * (where cable_start_point and cable_end_point are both 0 or null, but quantity_used > 0)
 */
export function preprocessUsages(usages: DrumUsage[]): DrumUsage[] {
  const mapped: DrumUsage[] = []
  const unmapped: DrumUsage[] = []

  for (const usage of usages) {
    const start = Math.min(usage.cable_start_point || 0, usage.cable_end_point || 0)
    const end = Math.max(usage.cable_start_point || 0, usage.cable_end_point || 0)
    const length = end - start
    const qty = Number(usage.quantity_used || 0)

    if (length > 0) {
      mapped.push(usage)
    } else if (qty > 0) {
      unmapped.push(usage)
    }
  }

  // Sort mapped segments to find their layout
  const mappedSegments = mapped.map(usage => {
    const start = Math.min(usage.cable_start_point || 0, usage.cable_end_point || 0)
    const end = Math.max(usage.cable_start_point || 0, usage.cable_end_point || 0)
    return { start, end }
  })

  // Sort unmapped usages chronologically to allocate in order
  unmapped.sort((a, b) => new Date(a.usage_date).getTime() - new Date(b.usage_date).getTime())

  const processed: DrumUsage[] = [...mapped]
  const currentSegments = [...mappedSegments]

  for (const usage of unmapped) {
    const qty = Number(usage.quantity_used || 0)
    const currentHighest = currentSegments.length > 0
      ? Math.max(...currentSegments.map(seg => seg.end))
      : 0
    
    processed.push({
      ...usage,
      cable_start_point: currentHighest,
      cable_end_point: currentHighest + qty,
    })

    currentSegments.push({
      start: currentHighest,
      end: currentHighest + qty
    })
  }

  return processed
}

/**
 * Smart segment-based wastage calculation
 * This method tracks actual used segments and calculates waste as truly unused portions
 * Now includes remaining cable calculation from highest usage point to drum end
 */
export function calculateSmartWastage(
  usages: DrumUsage[], 
  drumCapacity: number,
  manualWastageOverride?: number,
  drumStatus?: string
): WastageCalculationResult {
  
  if (usages.length === 0) {
    const remainingCable = drumCapacity
    const totalWastage = drumStatus === 'inactive' 
      ? remainingCable 
      : (manualWastageOverride || 0)
    
    return {
      totalUsed: 0,
      totalWastage,
      calculatedCurrentQuantity: drumCapacity - totalWastage,
      remainingCable,
      usageSegments: [],
      wastedSegments: totalWastage > 0 ? [{ start: 0, end: totalWastage, length: totalWastage }] : [],
      calculationMethod: manualWastageOverride !== undefined ? 'manual_override' : 'smart_segments'
    }
  }

  // Preprocess usages to allocate sequential segments for unmapped records
  const preprocessed = preprocessUsages(usages)

  // Convert usages to segments (normalize start/end points)
  const usageSegments: UsageSegment[] = preprocessed.map(usage => {
    const start = Math.min(usage.cable_start_point || 0, usage.cable_end_point || 0)
    const end = Math.max(usage.cable_start_point || 0, usage.cable_end_point || 0)
    return {
      start,
      end,
      length: end - start,
      usageId: usage.id,
      usageDate: usage.usage_date
    }
  }).filter(seg => seg.length > 0) // Remove zero-length segments

  // Sort segments by start position
  usageSegments.sort((a, b) => a.start - b.start)

  // Merge overlapping segments to get actual used cable
  const mergedSegments = mergeOverlappingSegments(usageSegments)
  
  // Calculate total used length
  const totalUsed = mergedSegments.reduce((sum, seg) => sum + seg.length, 0)

  // Find the highest point of usage to calculate remaining cable
  const highestUsagePoint = mergedSegments.length > 0 
    ? Math.max(...mergedSegments.map(seg => seg.end))
    : 0
  
  // Calculate remaining cable from highest usage point to drum end
  const remainingCable = Math.max(0, drumCapacity - highestUsagePoint)

  // If manual override is provided, use it
  if (manualWastageOverride !== undefined) {
    const totalWastage = Math.max(0, Math.min(manualWastageOverride, drumCapacity - totalUsed))
    return {
      totalUsed,
      totalWastage,
      calculatedCurrentQuantity: Math.max(0, drumCapacity - totalUsed - totalWastage),
      remainingCable,
      usageSegments: mergedSegments,
      wastedSegments: totalWastage > 0 ? [{ start: 0, end: totalWastage, length: totalWastage }] : [],
      calculationMethod: 'manual_override',
      manualWastageOverride: totalWastage
    }
  }

  // Calculate wasted segments — ONLY gaps between consecutive used segments
  // Beginning (0 → first usage) and end (last usage → capacity) are remaining cable, NOT waste
  const wastedSegments = calculateGapSegments(mergedSegments)
  let totalWastage = wastedSegments.reduce((sum, seg) => sum + seg.length, 0)

  // For inactive drums, ALL remaining cable (beginning + end + gaps) is waste
  if (drumStatus === 'inactive') {
    const lowestUsagePoint = mergedSegments.length > 0
      ? Math.min(...mergedSegments.map(seg => seg.start))
      : 0
    // Add beginning portion as waste
    if (lowestUsagePoint > 0) {
      totalWastage += lowestUsagePoint
      wastedSegments.push({ start: 0, end: lowestUsagePoint, length: lowestUsagePoint })
    }
    // Add end portion as waste
    if (remainingCable > 0) {
      totalWastage += remainingCable
      wastedSegments.push({ start: highestUsagePoint, end: drumCapacity, length: remainingCable })
    }
  }

  return {
    totalUsed,
    totalWastage,
    calculatedCurrentQuantity: Math.max(0, drumCapacity - totalUsed - totalWastage),
    remainingCable,
    usageSegments: mergedSegments,
    wastedSegments,
    calculationMethod: 'smart_segments'
  }
}

/**
 * Legacy gap-based calculation (existing method)
 * Kept for backward compatibility
 */
export function calculateLegacyWastage(
  usages: DrumUsage[], 
  drumCapacity: number,
  drumStatus?: string
): WastageCalculationResult {
  
  if (usages.length === 0) {
    const remainingCable = drumCapacity
    const totalWastage = drumStatus === 'inactive' ? remainingCable : 0
    
    return {
      totalUsed: 0,
      totalWastage,
      calculatedCurrentQuantity: drumCapacity - totalWastage,
      remainingCable,
      usageSegments: [],
      wastedSegments: [],
      calculationMethod: 'legacy_gaps'
    }
  }

  // Preprocess usages to allocate sequential segments for unmapped records
  const preprocessed = preprocessUsages(usages)

  // Sort usages by date to process chronologically
  const sortedUsages = [...preprocessed].sort(
    (a, b) => new Date(a.usage_date).getTime() - new Date(b.usage_date).getTime()
  )

  let totalUsed = 0
  let totalWastage = 0
  let lastEndPoint = 0

  const usageSegments: UsageSegment[] = []
  const wastedSegments: Array<{ start: number; end: number; length: number }> = []

  sortedUsages.forEach((usage, index) => {
    const startPoint = usage.cable_start_point || 0
    const endPoint = usage.cable_end_point || 0

    // Calculate actual usage (absolute difference)
    const actualUsage = Math.abs(endPoint - startPoint)
    totalUsed += actualUsage

    usageSegments.push({
      start: Math.min(startPoint, endPoint),
      end: Math.max(startPoint, endPoint),
      length: actualUsage,
      usageId: usage.id,
      usageDate: usage.usage_date
    })

    // Calculate wastage based on gap from last usage
    if (index > 0) {
      const gap = Math.abs(startPoint - lastEndPoint)
      if (gap > 0) {
        totalWastage += gap
        wastedSegments.push({
          start: Math.min(startPoint, lastEndPoint),
          end: Math.max(startPoint, lastEndPoint),
          length: gap
        })
      }
    }

    // Update last end point (use the higher value to track cable progression)
    lastEndPoint = Math.max(startPoint, endPoint)
  })

  // Calculate remaining cable from highest usage point
  const highestUsagePoint = Math.max(...sortedUsages.map(usage => 
    Math.max(usage.cable_start_point || 0, usage.cable_end_point || 0)
  ))
  const remainingCable = Math.max(0, drumCapacity - highestUsagePoint)

  // For inactive drums, add remaining cable to wastage
  if (drumStatus === 'inactive' && remainingCable > 0) {
    totalWastage += remainingCable
    wastedSegments.push({
      start: highestUsagePoint,
      end: drumCapacity,
      length: remainingCable
    })
  }

  // Ensure totals don't exceed initial drum length
  const totalDeducted = totalUsed + totalWastage
  if (totalDeducted > drumCapacity) {
    // Cap the wastage to fit within capacity
    totalWastage = Math.max(0, drumCapacity - totalUsed)
  }

  return {
    totalUsed,
    totalWastage,
    calculatedCurrentQuantity: Math.max(0, drumCapacity - totalUsed - totalWastage),
    remainingCable,
    usageSegments,
    wastedSegments,
    calculationMethod: 'legacy_gaps'
  }
}

/**
 * Merge overlapping segments to get actual used cable length
 */
function mergeOverlappingSegments(segments: UsageSegment[]): UsageSegment[] {
  if (segments.length === 0) return []

  const merged: UsageSegment[] = []
  let current = { ...segments[0] }

  for (let i = 1; i < segments.length; i++) {
    const next = segments[i]

    // Check if segments overlap or are adjacent
    if (next.start <= current.end) {
      // Merge segments
      current.end = Math.max(current.end, next.end)
      current.length = current.end - current.start
      // Keep the earliest usage ID and date for reference
      if (new Date(next.usageDate) < new Date(current.usageDate)) {
        current.usageId = next.usageId
        current.usageDate = next.usageDate
      }
    } else {
      // No overlap, add current to merged and start new current
      merged.push(current)
      current = { ...next }
    }
  }

  merged.push(current)
  return merged
}

/**
 * Calculate gap segments between consecutive used segments
 * Only gaps BETWEEN used segments are true waste.
 * The beginning (0 → first usage) and end (last usage → capacity) are
 * remaining available cable, NOT waste, for active drums.
 */
function calculateGapSegments(
  usedSegments: UsageSegment[]
): Array<{ start: number; end: number; length: number }> {
  
  const gapSegments: Array<{ start: number; end: number; length: number }> = []

  if (usedSegments.length <= 1) {
    return []
  }

  // Only check for gaps between consecutive used segments
  for (let i = 0; i < usedSegments.length - 1; i++) {
    const currentEnd = usedSegments[i].end
    const nextStart = usedSegments[i + 1].start

    if (nextStart > currentEnd) {
      gapSegments.push({
        start: currentEnd,
        end: nextStart,
        length: nextStart - currentEnd
      })
    }
  }

  return gapSegments
}

/**
 * Legacy: Calculate wasted segments including beginning and end
 * Kept for backward compatibility with legacy calculation method
 */
function calculateWastedSegments(
  usedSegments: UsageSegment[], 
  drumCapacity: number
): Array<{ start: number; end: number; length: number }> {
  
  const wastedSegments: Array<{ start: number; end: number; length: number }> = []

  if (usedSegments.length === 0) {
    return []
  }

  // Check for waste at the beginning
  if (usedSegments[0].start > 0) {
    wastedSegments.push({
      start: 0,
      end: usedSegments[0].start,
      length: usedSegments[0].start
    })
  }

  // Check for gaps between used segments
  for (let i = 0; i < usedSegments.length - 1; i++) {
    const currentEnd = usedSegments[i].end
    const nextStart = usedSegments[i + 1].start

    if (nextStart > currentEnd) {
      wastedSegments.push({
        start: currentEnd,
        end: nextStart,
        length: nextStart - currentEnd
      })
    }
  }

  // Check for waste at the end
  const lastUsedEnd = usedSegments[usedSegments.length - 1].end
  if (lastUsedEnd < drumCapacity) {
    wastedSegments.push({
      start: lastUsedEnd,
      end: drumCapacity,
      length: drumCapacity - lastUsedEnd
    })
  }

  return wastedSegments
}

/**
 * Validate manual wastage override
 */
export function validateManualWastage(
  wastageValue: number,
  totalUsed: number,
  drumCapacity: number
): { isValid: boolean; error?: string; adjustedValue?: number } {
  
  if (wastageValue < 0) {
    return { isValid: false, error: "Wastage cannot be negative" }
  }

  if (wastageValue + totalUsed > drumCapacity) {
    const maxWastage = drumCapacity - totalUsed
    return { 
      isValid: false, 
      error: `Wastage cannot exceed ${maxWastage}m (remaining capacity after usage)`,
      adjustedValue: Math.max(0, maxWastage)
    }
  }

  // Warn if wastage seems unusually high (>20% of total capacity)
  const wastagePercentage = (wastageValue / drumCapacity) * 100
  if (wastagePercentage > 20) {
    return { 
      isValid: true, 
      error: `Warning: Wastage is ${wastagePercentage.toFixed(1)}% of drum capacity, which seems high` 
    }
  }

  return { isValid: true }
}