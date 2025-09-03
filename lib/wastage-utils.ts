import { getSupabaseClient } from "./supabase"

// Default wastage percentage (configurable)
export const DEFAULT_WASTAGE_PERCENTAGE = 0.05 // 5%
export const MAX_WASTAGE_PERCENTAGE = 0.20 // 20% as per business rules

export interface WastageCalculationOptions {
  totalCableLength: number
  customWastagePercentage?: number
  manualWastage?: number
}

export interface WastageSettings {
  id?: string
  default_wastage_percentage: number
  max_wastage_percentage: number
  auto_calculate_enabled: boolean
  created_at?: string
  updated_at?: string
}

/**
 * Calculate automatic wastage based on total cable length and percentage
 */
export function calculateAutoWastage(
  totalCableLength: number,
  wastagePercentage: number = DEFAULT_WASTAGE_PERCENTAGE
): number {
  if (totalCableLength <= 0) return 0
  return Math.round((totalCableLength * wastagePercentage) * 100) / 100 // Round to 2 decimal places
}

/**
 * Validate if wastage exceeds maximum allowed percentage
 */
export function validateWastage(totalCableLength: number, wastageAmount: number): {
  isValid: boolean
  wastagePercentage: number
  exceedsLimit: boolean
  message?: string
} {
  if (totalCableLength <= 0) {
    return {
      isValid: false,
      wastagePercentage: 0,
      exceedsLimit: false,
      message: "Total cable length must be greater than 0"
    }
  }

  const wastagePercentage = wastageAmount / totalCableLength
  const exceedsLimit = wastagePercentage > MAX_WASTAGE_PERCENTAGE

  return {
    isValid: !exceedsLimit,
    wastagePercentage: Math.round(wastagePercentage * 10000) / 100, // Convert to percentage with 2 decimal places
    exceedsLimit,
    message: exceedsLimit 
      ? `Wastage (${wastageAmount}m) exceeds maximum limit of ${(MAX_WASTAGE_PERCENTAGE * 100).toFixed(1)}% of total cable (${totalCableLength}m)`
      : undefined
  }
}

/**
 * Get wastage calculation with automatic and manual options
 */
export function getWastageCalculation(options: WastageCalculationOptions): {
  autoWastage: number
  finalWastage: number
  isManualOverride: boolean
  validation: ReturnType<typeof validateWastage>
} {
  const { totalCableLength, customWastagePercentage, manualWastage } = options
  
  const wastagePercentage = customWastagePercentage ?? DEFAULT_WASTAGE_PERCENTAGE
  const autoWastage = calculateAutoWastage(totalCableLength, wastagePercentage)
  
  // Use manual wastage if provided, otherwise use auto-calculated
  const finalWastage = manualWastage ?? autoWastage
  const isManualOverride = manualWastage !== undefined && manualWastage !== autoWastage
  
  const validation = validateWastage(totalCableLength, finalWastage)
  
  return {
    autoWastage,
    finalWastage,
    isManualOverride,
    validation
  }
}

/**
 * Fetch wastage settings from database
 */
export async function getWastageSettings(): Promise<WastageSettings> {
  const supabase = getSupabaseClient()
  
  try {
    const { data, error } = await supabase
      .from("wastage_settings")
      .select("*")
      .single()
    
    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error("Error fetching wastage settings:", error)
    }
    
    // Return default settings if no data found
    return data || {
      default_wastage_percentage: DEFAULT_WASTAGE_PERCENTAGE,
      max_wastage_percentage: MAX_WASTAGE_PERCENTAGE,
      auto_calculate_enabled: true
    }
  } catch (error) {
    console.error("Error fetching wastage settings:", error)
    return {
      default_wastage_percentage: DEFAULT_WASTAGE_PERCENTAGE,
      max_wastage_percentage: MAX_WASTAGE_PERCENTAGE,
      auto_calculate_enabled: true
    }
  }
}

/**
 * Update wastage settings in database
 */
export async function updateWastageSettings(settings: Partial<WastageSettings>): Promise<boolean> {
  const supabase = getSupabaseClient()
  
  try {
    // First try to update existing record
    const { data: existing } = await supabase
      .from("wastage_settings")
      .select("id")
      .single()
    
    if (existing) {
      const { error } = await supabase
        .from("wastage_settings")
        .update({
          ...settings,
          updated_at: new Date().toISOString()
        })
        .eq("id", existing.id)
      
      if (error) throw error
    } else {
      // Create new record if none exists
      const { error } = await supabase
        .from("wastage_settings")
        .insert([{
          ...settings,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])
      
      if (error) throw error
    }
    
    return true
  } catch (error) {
    console.error("Error updating wastage settings:", error)
    return false
  }
}

/**
 * Format wastage percentage for display
 */
export function formatWastagePercentage(percentage: number): string {
  return `${(percentage * 100).toFixed(1)}%`
}

/**
 * Format wastage amount for display
 */
export function formatWastageAmount(amount: number): string {
  return `${amount.toFixed(2)}m`
}