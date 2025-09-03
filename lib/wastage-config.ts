"use client"

import { getSupabaseClient } from "@/lib/supabase"

export interface WastageConfig {
  id?: string
  default_wastage_percentage: number
  max_wastage_percentage: number
  auto_calculate: boolean
  updated_at?: string
  created_at?: string
}

export const DEFAULT_WASTAGE_CONFIG: WastageConfig = {
  default_wastage_percentage: 8.0, // 8% default wastage
  max_wastage_percentage: 20.0, // 20% maximum allowable wastage
  auto_calculate: true,
}

export class WastageConfigService {
  private supabase = getSupabaseClient()

  /**
   * Get the current wastage configuration
   */
  async getWastageConfig(): Promise<WastageConfig> {
    try {
      const { data, error } = await this.supabase
        .from("wastage_config")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1)
        .single()

      if (error || !data) {
        // Return default config if no config exists
        return DEFAULT_WASTAGE_CONFIG
      }

      return data
    } catch (error) {
      console.warn("Error fetching wastage config, using defaults:", error)
      return DEFAULT_WASTAGE_CONFIG
    }
  }

  /**
   * Update or create wastage configuration
   */
  async updateWastageConfig(config: Partial<WastageConfig>): Promise<WastageConfig> {
    try {
      // First try to get existing config
      const { data: existing } = await this.supabase
        .from("wastage_config")
        .select("id")
        .order("created_at", { ascending: false })
        .limit(1)
        .single()

      const configData = {
        default_wastage_percentage: config.default_wastage_percentage || DEFAULT_WASTAGE_CONFIG.default_wastage_percentage,
        max_wastage_percentage: config.max_wastage_percentage || DEFAULT_WASTAGE_CONFIG.max_wastage_percentage,
        auto_calculate: config.auto_calculate !== undefined ? config.auto_calculate : DEFAULT_WASTAGE_CONFIG.auto_calculate,
        updated_at: new Date().toISOString(),
      }

      if (existing?.id) {
        // Update existing config
        const { data, error } = await this.supabase
          .from("wastage_config")
          .update(configData)
          .eq("id", existing.id)
          .select()
          .single()

        if (error) throw error
        return data
      } else {
        // Create new config
        const { data, error } = await this.supabase
          .from("wastage_config")
          .insert({
            ...configData,
            created_at: new Date().toISOString(),
          })
          .select()
          .single()

        if (error) throw error
        return data
      }
    } catch (error) {
      console.error("Error updating wastage config:", error)
      throw error
    }
  }

  /**
   * Calculate automatic wastage based on total cable length and config
   */
  calculateWastage(totalCable: number, config?: WastageConfig): number {
    const wastageConfig = config || DEFAULT_WASTAGE_CONFIG
    
    if (!wastageConfig.auto_calculate) {
      return 0
    }

    return (totalCable * wastageConfig.default_wastage_percentage) / 100
  }

  /**
   * Validate wastage amount against configuration limits
   */
  validateWastage(wastageAmount: number, totalCable: number, config?: WastageConfig): {
    isValid: boolean
    message?: string
    percentage: number
  } {
    const wastageConfig = config || DEFAULT_WASTAGE_CONFIG
    const percentage = totalCable > 0 ? (wastageAmount / totalCable) * 100 : 0

    if (percentage > wastageConfig.max_wastage_percentage) {
      return {
        isValid: false,
        message: `Wastage (${percentage.toFixed(1)}%) exceeds maximum allowed (${wastageConfig.max_wastage_percentage}%)`,
        percentage,
      }
    }

    return {
      isValid: true,
      percentage,
    }
  }
}

// Export singleton instance
export const wastageConfigService = new WastageConfigService()