// @ts-nocheck

type DPLineLike = { dp?: string | null };
type GroupLineLike = {
  id: string;
  address?: string | null;
  total_cable?: number | null;
};

type ErrorLineLike = {
  id: string;
  dp?: string | null;
  phone_number?: string | null;
  power_dp_new?: number | null;
  power_inbox_new?: number | null;
  wastage_input?: number | null;
  total_cable?: number | null;
};

export interface DPSuggestion {
  dp: string;
  confidence: number;
  reason: string;
}

export interface LineGroupSuggestion {
  group_id: string;
  lines: string[];
  reason: string;
  estimated_savings: number;
}

export interface ErrorSuggestion {
  line_id: string;
  error_type: string;
  description: string;
  severity: "low" | "medium" | "high";
  suggested_fix: string;
}

export class AIService {
  async getDPSuggestions(partialDP: string): Promise<DPSuggestion[]> {
    try {
      // Get existing DPs for pattern analysis
      const response = await fetch(
        `/api/lines?dpPrefix=${encodeURIComponent(partialDP)}&limit=20`
      );
      if (!response.ok) {
        throw new Error("Failed to fetch lines");
      }
      const result = await response.json();
      const existingDPs = result.data || [];

      if (!existingDPs.length) return [];

      // Analyze patterns and generate suggestions
      const suggestions: DPSuggestion[] = [];
      const dpCounts: Record<string, number> = {};

      // Count frequency of DP patterns
      existingDPs.forEach((item: DPLineLike) => {
        if (item?.dp) {
          const parts = item.dp.split("-");
          if (parts.length >= 4) {
            const basePattern = parts.slice(0, 4).join("-");
            dpCounts[basePattern] = (dpCounts[basePattern] || 0) + 1;
          }
        }
      });

      // Generate suggestions based on patterns
      Object.entries(dpCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .forEach(([pattern, count]) => {
          for (let i = 1; i <= 8; i++) {
            const suggestedDP = `${pattern}-0${i}`;
            suggestions.push({
              dp: suggestedDP,
              confidence: Math.min(0.9, count / 10),
              reason: `Common pattern in area (${count} similar installations)`,
            });
          }
        });

      return suggestions.slice(0, 8);
    } catch (error) {
      console.error("Error generating DP suggestions:", error);
      return [];
    }
  }

  async getLineGroupingSuggestions(): Promise<LineGroupSuggestion[]> {
    try {
      const thirtyDaysAgo = new Date(
        Date.now() - 30 * 24 * 60 * 60 * 1000
      ).toISOString();
      const response = await fetch(
        `/api/lines?createdAfter=${encodeURIComponent(thirtyDaysAgo)}`
      );
      if (!response.ok) {
        throw new Error("Failed to fetch lines");
      }
      const result = await response.json();
      const lines = result.data || [];

      if (!lines.length) return [];

      const suggestions: LineGroupSuggestion[] = [];
      const addressGroups: Record<string, GroupLineLike[]> = {};

      // Group by similar addresses
      lines.forEach((line: GroupLineLike) => {
        const addressKey =
          line.address?.toLowerCase().split(" ").slice(0, 3).join(" ") ||
          "unknown";
        if (!addressGroups[addressKey]) {
          addressGroups[addressKey] = [];
        }
        addressGroups[addressKey].push(line);
      });

      // Generate suggestions for groups with multiple lines
      Object.entries(addressGroups).forEach(([address, groupLines]) => {
        if (groupLines.length >= 2) {
          const totalCable = groupLines.reduce(
            (sum, line) => sum + (line.total_cable || 0),
            0
          );
          const estimatedSavings = Math.floor(totalCable * 0.1) * 50; // Estimate 10% cable savings

          suggestions.push({
            group_id: `group_${address.replace(/\s+/g, "_")}`,
            lines: groupLines.map((line) => line.id),
            reason: `${groupLines.length} installations in similar area: ${address}`,
            estimated_savings: estimatedSavings,
          });
        }
      });

      return suggestions.slice(0, 5);
    } catch (error) {
      console.error("Error generating line grouping suggestions:", error);
      return [];
    }
  }

  async getErrorSuggestions(): Promise<ErrorSuggestion[]> {
    try {
      const sevenDaysAgo = new Date(
        Date.now() - 7 * 24 * 60 * 60 * 1000
      ).toISOString();
      const response = await fetch(
        `/api/lines?createdAfter=${encodeURIComponent(sevenDaysAgo)}`
      );
      if (!response.ok) {
        throw new Error("Failed to fetch lines");
      }
      const result = await response.json();
      const lines = result.data || [];

      if (!lines.length) return [];

      const suggestions: ErrorSuggestion[] = [];

      lines.forEach((line: ErrorLineLike) => {
        // Check for high power values
        if (line.power_dp_new >= 20 || line.power_inbox_new >= 20) {
          suggestions.push({
            line_id: line.id,
            error_type: "high_power",
            description: `High power reading detected (DP: ${line.power_dp_new}, Inbox: ${line.power_inbox_new})`,
            severity: "high",
            suggested_fix: "Check fiber connections and splicing quality",
          });
        }

        // Check for excessive wastage
        if (
          line.wastage_input &&
          line.total_cable &&
          line.wastage_input > line.total_cable * 0.2
        ) {
          suggestions.push({
            line_id: line.id,
            error_type: "high_wastage",
            description: `Wastage (${line.wastage_input}m) exceeds 20% of total cable (${line.total_cable}m)`,
            severity: "medium",
            suggested_fix: "Review installation process and cable handling",
          });
        }

        // Check for invalid DP format
        if (
          line.dp &&
          !/^[A-Z]{1,4}-[A-Z]{1,4}-\d{4}-\d{3}-0[1-8]$/.test(line.dp)
        ) {
          suggestions.push({
            line_id: line.id,
            error_type: "invalid_dp",
            description: `DP format may be incorrect: ${line.dp}`,
            severity: "medium",
            suggested_fix: "Verify DP format: XX-XXXX-XXXX-XXX-0X",
          });
        }

        // Check for duplicate phone numbers
        if (!line.phone_number || line.phone_number.length < 10) {
          suggestions.push({
            line_id: line.id,
            error_type: "invalid_phone",
            description: "Phone number appears to be invalid or missing",
            severity: "low",
            suggested_fix: "Verify and update customer phone number",
          });
        }
      });

      return suggestions.slice(0, 10);
    } catch (error) {
      console.error("Error generating error suggestions:", error);
      return [];
    }
  }
}

export const aiService = new AIService();
