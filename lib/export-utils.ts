export interface ExportOptions {
  format: "pdf" | "csv" | "excel";
  reportType: string;
  dateRange: {
    start: string;
    end: string;
  };
  filters?: Record<string, any>;
}

export interface CompanyInfo {
  company_name: string;
  address: string;
  contact_numbers: string[];
  website: string;
  registered_number: string;
}

export class ExportService {
  async getCompanyInfo(): Promise<CompanyInfo> {
    try {
      const response = await fetch("/api/settings/company");
      if (!response.ok) {
        throw new Error("Failed to fetch company info");
      }
      const result = await response.json();
      const data = result.data ?? {};

      return {
        company_name:
          typeof data.company_name === "string" &&
          data.company_name.trim() !== ""
            ? data.company_name
            : "NNS Enterprise",
        address: typeof data.address === "string" ? data.address : "",
        contact_numbers: Array.isArray(data.contact_numbers)
          ? ((data.contact_numbers as unknown[])
              .filter((n) => typeof n === "string")
              .map((n) => String(n)) as string[])
          : [],
        website: typeof data.website === "string" ? data.website : "nns.lk",
        registered_number:
          typeof data.registered_number === "string"
            ? data.registered_number
            : "",
      };
    } catch (error) {
      console.error("Error fetching company info:", error);
      return {
        company_name: "NNS Enterprise",
        address: "",
        contact_numbers: [],
        website: "nns.lk",
        registered_number: "",
      };
    }
  }

  async generateMaterialUsageReport(options: ExportOptions) {
    try {
      // Get line details from API
      const params = new URLSearchParams({
        startDate: options.dateRange.start,
        endDate: options.dateRange.end,
        excludeRejected: "true",
      });

      const response = await fetch(`/api/lines?${params}`);
      if (!response.ok) {
        throw new Error("Failed to fetch lines");
      }
      const result = await response.json();
      const lines = result.data || [];

      if (!lines.length) return null;

      const reportData = lines.map((line: any) => ({
        phone_number: line.phone_number,
        customer_name: line.name,
        dp: line.dp,
        installation_date: line.date,
        cable_used: line.total_cable,
        retainers: line.retainers,
        l_hook: line.l_hook_new,
        c_hook: line.c_hook_new,
        fiber_rosette: line.fiber_rosette_new,
        fac: line.fac_new,
        internal_wire: line.internal_wire_new,
        wastage: line.wastage_input,
      }));

      return this.formatExport(reportData, options, "Material Usage Report");
    } catch (error) {
      console.error("Error generating material usage report:", error);
      return null;
    }
  }

  async generateDailyMaterialBalanceReport(options: ExportOptions) {
    try {
      const params = new URLSearchParams({
        startDate: options.dateRange.start,
        endDate: options.dateRange.end,
      });

      const response = await fetch(`/api/drum-usage?${params}`);
      if (!response.ok) {
        throw new Error("Failed to fetch drum usage");
      }
      const result = await response.json();
      const drumUsage = result.data || [];

      if (!drumUsage.length) return null;

      const reportData = drumUsage.map((usage: any) => ({
        date: usage.usage_date,
        drum_number: usage.drum_tracking?.drum_number,
        previous_balance: usage.drum_tracking?.initial_quantity,
        issued: 0,
        usage: usage.quantity_used,
        balance_return: usage.drum_tracking?.current_quantity,
        customer: usage.line_details?.name,
        phone: usage.line_details?.phone_number,
      }));

      return this.formatExport(
        reportData,
        options,
        "Daily Material Balance Report"
      );
    } catch (error) {
      console.error("Error generating daily material balance report:", error);
      return null;
    }
  }

  async generateDrumNumberReport(options: ExportOptions) {
    try {
      const params = new URLSearchParams({
        startDate: options.dateRange.start,
        endDate: options.dateRange.end,
        hasDrumNumber: "true",
      });

      const response = await fetch(`/api/lines?${params}`);
      if (!response.ok) {
        throw new Error("Failed to fetch lines");
      }
      const result = await response.json();
      const lines = result.data || [];

      if (!lines.length) return null;

      const reportData = lines.map((line: any) => ({
        phone_number: line.phone_number,
        customer_name: line.name,
        dp: line.dp,
        cable_start: line.cable_start_new,
        cable_middle: line.cable_middle_new,
        cable_end: line.cable_end_new,
        drum_number: line.drum_number_new,
      }));

      return this.formatExport(reportData, options, "Drum Number Sheet");
    } catch (error) {
      console.error("Error generating drum number report:", error);
      return null;
    }
  }

  async generateMaterialBalanceReport(options: ExportOptions) {
    try {
      const response = await fetch("/api/inventory");
      if (!response.ok) {
        throw new Error("Failed to fetch inventory");
      }
      const result = await response.json();
      const items = result.data || [];

      if (!items.length) return null;

      const reportData = items.map((item: any) => {
        const totalIssued =
          item.inventory_invoice_items?.reduce(
            (sum: number, invoice: any) => sum + (invoice.quantity || 0),
            0
          ) || 0;
        const totalWastage =
          item.waste_tracking?.reduce(
            (sum: number, waste: any) => sum + (waste.quantity || 0),
            0
          ) || 0;

        return {
          item_name: item.name,
          opening_balance: item.current_stock + totalIssued - totalWastage,
          stock_issue: totalIssued,
          wastage: totalWastage,
          in_hand: item.current_stock,
          material_used_invoice: totalIssued - totalWastage,
          wip_material: Math.max(
            0,
            totalIssued - totalWastage - item.current_stock
          ),
        };
      });

      return this.formatExport(reportData, options, "Material Balance Sheet");
    } catch (error) {
      console.error("Error generating material balance report:", error);
      return null;
    }
  }

  private async formatExport(
    data: any[],
    options: ExportOptions,
    reportTitle: string
  ) {
    const companyInfo = await this.getCompanyInfo();

    switch (options.format) {
      case "csv":
        return this.generateCSV(data, reportTitle, companyInfo);
      case "excel":
        return this.generateExcel(data, reportTitle, companyInfo);
      case "pdf":
        return this.generatePDF(data, reportTitle, companyInfo);
      default:
        throw new Error("Unsupported export format");
    }
  }

  private generateCSV(
    data: any[],
    reportTitle: string,
    companyInfo: CompanyInfo
  ) {
    if (data.length === 0) return "";

    const headers = Object.keys(data[0]);
    const csvContent = [
      `# ${reportTitle}`,
      `# ${companyInfo.company_name}`,
      `# ${companyInfo.address}`,
      `# Contact: ${companyInfo.contact_numbers.join(", ")}`,
      `# Website: ${companyInfo.website}`,
      "",
      headers.join(","),
      ...data.map((row) =>
        headers.map((header) => `"${row[header] || ""}"`).join(",")
      ),
    ].join("\n");

    return csvContent;
  }

  private generateExcel(
    data: any[],
    reportTitle: string,
    companyInfo: CompanyInfo
  ) {
    // For Excel generation, you would typically use a library like xlsx
    // For now, we'll return CSV format as a placeholder
    return this.generateCSV(data, reportTitle, companyInfo);
  }

  private generatePDF(
    data: any[],
    reportTitle: string,
    companyInfo: CompanyInfo
  ) {
    // For PDF generation, you would typically use a library like jsPDF or Puppeteer
    // For now, we'll return a structured object that can be used by a PDF generator
    return {
      title: reportTitle,
      company: companyInfo,
      data: data,
      generatedAt: new Date().toISOString(),
    };
  }
}

export const exportService = new ExportService();
