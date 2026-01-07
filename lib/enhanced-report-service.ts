// @ts-nocheck
import {
  ReportTemplates,
  type DrumNumberReportData,
  type MaterialBalanceReportData,
  type DailyMaterialBalanceReportData,
  type NewConnectionReportData,
} from "./report-templates";
import { format as formatDate } from "date-fns";

export interface ReportOptions {
  format: "pdf" | "csv" | "xlsx";
  month: Date;
  filters?: Record<string, unknown>;
}

export class EnhancedReportService {
  async generateDrumNumberReport(options: ReportOptions) {
    try {
      const startDate = new Date(
        options.month.getFullYear(),
        options.month.getMonth(),
        1
      );
      const endDate = new Date(
        options.month.getFullYear(),
        options.month.getMonth() + 1,
        0
      );

      const params = new URLSearchParams({
        startDate: startDate.toISOString().split("T")[0],
        endDate: endDate.toISOString().split("T")[0],
        hasDrumNumber: "true",
      });

      const response = await fetch(`/api/lines?${params}`);
      if (!response.ok) {
        throw new Error("Failed to fetch lines");
      }
      const result = await response.json();
      const lines = result.data || [];

      if (!lines.length) return null;

      const reportData: DrumNumberReportData[] = lines.map((line, index) => ({
        no: index + 1,
        tpNumber: line.telephone_no,
        pdw: line.cable_start || 0,
        dw: line.cable_middle || 0,
        dwCus: line.cable_end || 0,
        drumNumber: line.drum_number || "",
      }));

      const month = formatDate(options.month, "MMMM yyyy");

      switch (options.format) {
        case "pdf":
          return {
            html: ReportTemplates.generateDrumNumberHTML(reportData, month),
            filename: `drum-number-sheet-${formatDate(
              options.month,
              "yyyy-MM"
            )}.pdf`,
          };
        case "csv":
          const headers = [
            "no",
            "tpNumber",
            "pdw",
            "dw",
            "dwCus",
            "drumNumber",
          ];
          return ReportTemplates.generateCSV(
            reportData,
            headers,
            `Drum Number Sheet - ${month}`
          );
        case "xlsx":
          const excelHeaders = [
            "No",
            "TP Number",
            "PDW",
            "DW",
            "DW CUS",
            "DRUM NUMBER",
          ];
          return ReportTemplates.generateExcelData(
            reportData,
            excelHeaders,
            `Drum Number Sheet - ${month}`
          );
        default:
          return null;
      }
    } catch (error) {
      console.error("Error generating drum number report:", error);
      return null;
    }
  }

  async generateMaterialBalanceReport(options: ReportOptions) {
    try {
      const startDate = new Date(
        options.month.getFullYear(),
        options.month.getMonth(),
        1
      );
      const endDate = new Date(
        options.month.getFullYear(),
        options.month.getMonth() + 1,
        0
      );

      // Fetch all inventory items with issued and wastage info
      const itemsResponse = await fetch("/api/inventory?includeRelations=true");
      if (!itemsResponse.ok) {
        throw new Error("Failed to fetch inventory items");
      }
      const itemsResult = await itemsResponse.json();
      const items = itemsResult.data || [];

      if (!items.length) return null;

      // Fetch all line_details for the month
      const linesParams = new URLSearchParams({
        startDate: startDate.toISOString().split("T")[0],
        endDate: endDate.toISOString().split("T")[0],
      });
      const linesResponse = await fetch(`/api/lines?${linesParams}`);
      if (!linesResponse.ok) {
        throw new Error("Failed to fetch lines");
      }
      const linesResult = await linesResponse.json();
      const lineDetails = linesResult.data || [];

      // Helper: calculate material used from line_details for each item
      function getMaterialUsedForItem(item: unknown, lines: unknown[]): number {
        const name = String(
          (item as { name?: unknown })?.name ?? ""
        ).toLowerCase();
        switch (name) {
          case "c-hook":
            return lines.reduce(
              (sum, line) =>
                sum + (((line as { c_hook?: unknown })?.c_hook as number) || 0),
              0
            );
          case "l-hook":
            return lines.reduce(
              (sum, line) =>
                sum + (((line as { l_hook?: unknown })?.l_hook as number) || 0),
              0
            );
          case "retainers":
            return lines.reduce(
              (sum, line) =>
                sum +
                (((line as { retainers?: unknown })?.retainers as number) || 0),
              0
            );
          case "drop wire cable":
            return lines.reduce(
              (sum, line) =>
                sum +
                (((line as { total_cable?: unknown })?.total_cable as number) ||
                  0),
              0
            );
          case "fiber rossette":
            return lines.reduce(
              (sum, line) =>
                sum +
                (((line as { fiber_rosette?: unknown })
                  ?.fiber_rosette as number) || 0),
              0
            );
          case "fac connector":
            return lines.reduce(
              (sum, line) =>
                sum + (((line as { fac?: unknown })?.fac as number) || 0),
              0
            );
          case "internal wire":
            return lines.reduce(
              (sum, line) =>
                sum +
                (((line as { internal_wire?: unknown })
                  ?.internal_wire as number) || 0),
              0
            );
          case "cat 5 cable":
            return lines.reduce(
              (sum, line) =>
                sum + (((line as { cat5?: unknown })?.cat5 as number) || 0),
              0
            );
          case "top bolt":
            return lines.reduce(
              (sum, line) =>
                sum +
                (((line as { top_bolt?: unknown })?.top_bolt as number) || 0),
              0
            );
          case "conduit":
            return lines.reduce(
              (sum, line) =>
                sum +
                (((line as { conduit?: unknown })?.conduit as number) || 0),
              0
            );
          case "casing":
            return lines.reduce(
              (sum, line) =>
                sum + (((line as { casing?: unknown })?.casing as number) || 0),
              0
            );
          case "rj-45":
            return lines.reduce(
              (sum, line) =>
                sum + (((line as { rj45?: unknown })?.rj45 as number) || 0),
              0
            );
          case "rj-11":
            return lines.reduce(
              (sum, line) =>
                sum + (((line as { rj11?: unknown })?.rj11 as number) || 0),
              0
            );
          case "rj-12":
            return lines.reduce(
              (sum, line) =>
                sum + (((line as { rj12?: unknown })?.rj12 as number) || 0),
              0
            );
          case "nut & bolt":
            return lines.reduce(
              (sum, line) =>
                sum +
                (((line as { nut_bolt?: unknown })?.nut_bolt as number) || 0),
              0
            );
          case "s-rosette":
            return lines.reduce(
              (sum, line) =>
                sum +
                (((line as { s_rosette?: unknown })?.s_rosette as number) || 0),
              0
            );
          case "c-clip":
            return lines.reduce(
              (sum, line) =>
                sum + (((line as { c_clip?: unknown })?.c_clip as number) || 0),
              0
            );
          case "socket":
            return lines.reduce(
              (sum, line) =>
                sum + (((line as { socket?: unknown })?.socket as number) || 0),
              0
            );
          case "pole":
            return lines.reduce(
              (sum, line) =>
                sum + (((line as { pole?: unknown })?.pole as number) || 0),
              0
            );
          case "roll plug":
            return lines.reduce(
              (sum, line) =>
                sum +
                (((line as { roll_plug?: unknown })?.roll_plug as number) || 0),
              0
            );
          case "u-clip":
            return lines.reduce(
              (sum, line) =>
                sum + (((line as { u_clip?: unknown })?.u_clip as number) || 0),
              0
            );
          case "screw nail":
            return lines.reduce(
              (sum, line) =>
                sum +
                (((line as { screw_nail?: unknown })?.screw_nail as number) ||
                  0),
              0
            );
          case "flexible":
            return lines.reduce(
              (sum, line) =>
                sum +
                (((line as { flexible?: unknown })?.flexible as number) || 0),
              0
            );
          case "pole 6.7m":
            return lines.reduce(
              (sum, line) =>
                sum +
                (((line as { pole_67?: unknown })?.pole_67 as number) || 0),
              0
            );
          case "concrete nail":
            return lines.reduce(
              (sum, line) =>
                sum +
                (((line as { concrete_nail?: unknown })
                  ?.concrete_nail as number) || 0),
              0
            );
          case "tag tie":
            return lines.reduce(
              (sum, line) =>
                sum +
                (((line as { tag_tie?: unknown })?.tag_tie as number) || 0),
              0
            );
          case "c-tie":
            return lines.reduce(
              (sum, line) =>
                sum + (((line as { c_tie?: unknown })?.c_tie as number) || 0),
              0
            );
          case "bend":
            return lines.reduce(
              (sum, line) =>
                sum + (((line as { bend?: unknown })?.bend as number) || 0),
              0
            );
          default:
            return 0;
        }
      }

      const reportData: MaterialBalanceReportData[] = items.map(
        (item, index) => {
          const totalIssued = Array.isArray(item.inventory_invoice_items)
            ? item.inventory_invoice_items.reduce(
                (sum, invoice) => sum + (invoice.quantity_issued || 0),
                0
              )
            : 0;
          const totalWastage = Array.isArray(item.waste_tracking)
            ? item.waste_tracking.reduce(
                (sum, waste) => sum + (waste.quantity || 0),
                0
              )
            : 0;
          const materialUsed = getMaterialUsedForItem(item, lineDetails || []);

          return {
            no: index + 1,
            item: String(item.name),
            openingBalance:
              Number(item.current_stock) + totalIssued - totalWastage,
            stockIssued: totalIssued,
            wastage: totalWastage,
            inHand: Number(item.current_stock),
            materialUsed,
            wipMaterial: Math.max(
              0,
              totalIssued - totalWastage - Number(item.current_stock)
            ),
          };
        }
      );

      const month = formatDate(options.month, "MMMM");
      const year = options.month.getFullYear();

      switch (options.format) {
        case "pdf":
          return {
            html: ReportTemplates.generateMaterialBalanceHTML(
              reportData,
              "NNS Enterprise",
              "Southern",
              month,
              year
            ),
            filename: `material-balance-sheet-${formatDate(
              options.month,
              "yyyy-MM"
            )}.pdf`,
          };
        case "csv":
          const headers = [
            "no",
            "item",
            "openingBalance",
            "stockIssued",
            "wastage",
            "inHand",
            "materialUsed",
            "wipMaterial",
          ];
          return ReportTemplates.generateCSV(
            reportData,
            headers,
            `Material Balance Sheet - ${month} ${year}`
          );
        case "xlsx":
          const excelHeaders = [
            "No",
            "Item",
            "Opening Balance",
            "Stock Issued",
            "Wastage",
            "In Hand",
            "Material Used",
            "WIP Material",
          ];
          return ReportTemplates.generateExcelData(
            reportData,
            excelHeaders,
            `Material Balance Sheet - ${month} ${year}`
          );
        default:
          return null;
      }
    } catch (error) {
      console.error("Error generating material balance sheet report:", error);
      return null;
    }
  }

  async generateDailyMaterialBalanceReport(options: ReportOptions) {
    try {
      const startDate = new Date(
        options.month.getFullYear(),
        options.month.getMonth(),
        1
      );
      const endDate = new Date(
        options.month.getFullYear(),
        options.month.getMonth() + 1,
        0
      );

      // Get all inventory items
      const itemsResponse = await fetch("/api/inventory");
      if (!itemsResponse.ok) {
        throw new Error("Failed to fetch inventory items");
      }
      const itemsResult = await itemsResponse.json();
      const items = itemsResult.data || [];
      if (!items.length) return null;

      // Get daily usage data for the month
      const linesParams = new URLSearchParams({
        startDate: startDate.toISOString().split("T")[0],
        endDate: endDate.toISOString().split("T")[0],
      });
      const linesResponse = await fetch(`/api/lines?${linesParams}`);
      if (!linesResponse.ok) {
        throw new Error("Failed to fetch lines");
      }
      const linesResult = await linesResponse.json();
      const dailyUsage = linesResult.data || [];

      // Fetch all issued items for the month
      const invoiceParams = new URLSearchParams({
        startDate: startDate.toISOString().split("T")[0],
        endDate: endDate.toISOString().split("T")[0],
        includeItems: "true",
      });
      const invoiceResponse = await fetch(
        `/api/inventory/invoice-items?${invoiceParams}`
      );
      const issuedItems = invoiceResponse.ok
        ? (await invoiceResponse.json()).data || []
        : [];

      // Type guard for InventoryItem
      function isInventoryItem(obj: unknown): obj is InventoryItem {
        return (
          obj &&
          typeof obj.id === "string" &&
          typeof obj.name === "string" &&
          typeof obj.current_stock === "number"
        );
      }
      // Type guard for InventoryInvoiceItem
      function isInventoryInvoiceItem(
        obj: unknown
      ): obj is InventoryInvoiceItem {
        return (
          obj &&
          typeof obj.id === "string" &&
          typeof obj.item_id === "string" &&
          typeof obj.quantity_issued === "number" &&
          obj.inventory_invoices &&
          typeof obj.inventory_invoices.date === "string"
        );
      }
      // Type guard for LineDetail
      function isLineDetail(obj: unknown): obj is LineDetail {
        return obj && typeof obj.date === "string";
      }

      // Use only the new, type-guarded variables
      const typedItems = Array.isArray(items)
        ? items.filter(isInventoryItem)
        : [];
      const typedDailyUsage: LineDetail[] = Array.isArray(dailyUsage)
        ? dailyUsage.filter(isLineDetail)
        : [];
      // issuedItems may be an error object if join fails, so check for array and for query error
      let typedIssuedItems: InventoryInvoiceItem[] = [];
      if (Array.isArray(issuedItems)) {
        // Filter out items where inventory_invoices is an error object
        typedIssuedItems = issuedItems
          .filter(
            (ii) =>
              ii.inventory_invoices &&
              typeof ii.inventory_invoices === "object" &&
              !("code" in ii.inventory_invoices) // Exclude error objects
          )
          .filter(isInventoryInvoiceItem);
      }

      // Create daily balance sheet structure
      const daysInMonth = endDate.getDate();
      const dailyData: Array<{
        date: string;
        isoDate: string;
        usage: LineDetail[];
        issuedForDay: (itemId: string) => InventoryInvoiceItem[];
      }> = [];

      for (let day = 1; day <= daysInMonth; day++) {
        const currentDate = new Date(
          options.month.getFullYear(),
          options.month.getMonth(),
          day
        );
        const dateStr = formatDate(currentDate, "d-MMM");
        const isoDate = formatDate(currentDate, "yyyy-MM-dd");

        const dayUsage =
          typedDailyUsage?.filter(
            (line: LineDetail) =>
              line.date &&
              formatDate(new Date(line.date as string), "yyyy-MM-dd") ===
                isoDate
          ) || [];

        // For each item, filter issuedItems for this date
        const issuedForDay = (itemId: string): InventoryInvoiceItem[] => {
          return (
            typedIssuedItems?.filter(
              (ii: InventoryInvoiceItem) =>
                ii.item_id === itemId &&
                ii.inventory_invoices &&
                ii.inventory_invoices.date &&
                formatDate(
                  new Date(ii.inventory_invoices.date),
                  "yyyy-MM-dd"
                ) === isoDate
            ) || []
          );
        };

        dailyData.push({
          date: dateStr,
          isoDate,
          usage: dayUsage,
          issuedForDay,
        });
      }

      const reportData: DailyMaterialBalanceReportData[] = typedItems.map(
        (item) => ({
          itemName: String(item.name),
          unit: item.unit || "NOS",
          dailyBalances: dailyData.map((day) => {
            const issued = day
              .issuedForDay(item.id)
              .reduce(
                (sum: number, ii: InventoryInvoiceItem) =>
                  sum + (ii.quantity_issued || 0),
                0
              );
            const usage = this.calculateDailyUsage(item, day.usage, issued);
            return {
              date: day.date,
              previousBalance: usage.previousBalance,
              issued: usage.issued,
              usage: usage.usage,
              balanceReturn: usage.balanceReturn,
            };
          }),
        })
      );

      // Explicitly type csvData and excelData
      type CsvRow = {
        itemName: string;
        unit: string;
        date: string;
        previousBalance: number;
        issued: number;
        usage: number;
        balanceReturn: number;
      };
      type ExcelRow = {
        "Item Name": string;
        Unit: string;
        Date: string;
        "Previous Balance": number;
        Issued: number;
        Usage: number;
        "Balance Return": number;
      };

      const month = formatDate(options.month, "MMMM yyyy");

      switch (options.format) {
        case "pdf":
          return {
            html: ReportTemplates.generateDailyMaterialBalanceHTML(
              reportData,
              month
            ),
            filename: `daily-material-balance-${formatDate(
              options.month,
              "yyyy-MM"
            )}.pdf`,
          };
        case "csv":
          // For CSV, we'll flatten the daily data
          const csvData: CsvRow[] = [];
          reportData.forEach((item) => {
            item.dailyBalances.forEach((day) => {
              csvData.push({
                itemName: item.itemName,
                unit: item.unit,
                date: day.date,
                previousBalance: day.previousBalance,
                issued: day.issued,
                usage: day.usage,
                balanceReturn: day.balanceReturn,
              });
            });
          });
          const headers = [
            "itemName",
            "unit",
            "date",
            "previousBalance",
            "issued",
            "usage",
            "balanceReturn",
          ];
          return ReportTemplates.generateCSV(
            csvData,
            headers,
            `Daily Material Balance - ${month}`
          );
        case "xlsx":
          const excelHeaders = [
            "Item Name",
            "Unit",
            "Date",
            "Previous Balance",
            "Issued",
            "Usage",
            "Balance Return",
          ];
          const excelData: ExcelRow[] = [];
          reportData.forEach((item) => {
            item.dailyBalances.forEach((day) => {
              excelData.push({
                "Item Name": item.itemName,
                Unit: item.unit,
                Date: day.date,
                "Previous Balance": day.previousBalance,
                Issued: day.issued,
                Usage: day.usage,
                "Balance Return": day.balanceReturn,
              });
            });
          });
          return ReportTemplates.generateExcelData(
            excelData,
            excelHeaders,
            `Daily Material Balance - ${month}`
          );
        default:
          return null;
      }
    } catch (error) {
      console.error("Error generating daily material balance report:", error);
      return null;
    }
  }

  async generateNewConnectionReport(options: ReportOptions) {
    try {
      const startDate = new Date(
        options.month.getFullYear(),
        options.month.getMonth(),
        1
      );
      const endDate = new Date(
        options.month.getFullYear(),
        options.month.getMonth() + 1,
        0
      );

      const params = new URLSearchParams({
        startDate: startDate.toISOString().split("T")[0],
        endDate: endDate.toISOString().split("T")[0],
      });

      const response = await fetch(`/api/lines?${params}`);
      if (!response.ok) {
        throw new Error("Failed to fetch lines");
      }
      const result = await response.json();
      const lines = result.data || [];

      if (!lines.length) return null;

      const reportData: NewConnectionReportData[] = Array.isArray(lines)
        ? (lines as LineDetail[]).map((line: LineDetail, index: number) => ({
            no: index + 1,
            tpNumber: String(line.telephone_no ?? ""),
            configs: String(line.configs ?? ""),
            rtom: String(line.rtom ?? ""),
            completeDate: line.date
              ? formatDate(new Date(String(line.date)), "d-MMM-yy")
              : "",
            f1: Number(line.fiber_rosette ?? 0),
            g1: Number(line.fac ?? 0),
            dwLh: Number(line.l_hook ?? 0),
            dwCh: Number(line.c_hook ?? 0),
            dwRt: Number(line.retainers ?? 0),
            iwN: Number(line.internal_wire ?? 0),
            cat5: Number(line.cat5 ?? 0),
            fac: Number(line.fac ?? 0),
            fiberRossette: Number(line.fiber_rosette ?? 0),
            topBolt: Number(line.top_bolt ?? 0),
            conduit: Number(line.conduit ?? 0),
            casing: Number(line.casing ?? 0),
            poleDetails: String(line.pole_details ?? ""),
          }))
        : [];

      const totals = this.calculateMaterialTotals(
        Array.isArray(lines) ? (lines as LineDetail[]) : []
      );
      const invoiceNo = `NNS/WPS/HR/NC/24/${formatDate(
        options.month,
        "MMMM"
      ).toUpperCase()}`;

      switch (options.format) {
        case "pdf":
          return {
            html: ReportTemplates.generateNewConnectionHTML(
              reportData,
              "NNS Enterprise",
              invoiceNo,
              totals
            ),
            filename: `new-connection-report-${formatDate(
              options.month,
              "yyyy-MM"
            )}.pdf`,
          };
        case "csv":
          const headers = [
            "no",
            "tpNumber",
            "configs",
            "rtom",
            "completeDate",
            "f1",
            "g1",
            "dwLh",
            "dwCh",
            "dwRt",
            "iwN",
            "cat5",
            "fac",
            "fiberRossette",
            "topBolt",
            "conduit",
            "casing",
            "poleDetails",
          ];
          return ReportTemplates.generateCSV(
            reportData,
            headers,
            `FTTH New Connection Report - ${formatDate(
              options.month,
              "MMMM yyyy"
            )}`
          );
        case "xlsx":
          const excelHeaders = [
            "No",
            "TP Number",
            "Configs",
            "RTOM",
            "Complete Date",
            "F-1",
            "G-1",
            "DW-LH",
            "DW-CH",
            "DW-RT",
            "IW-N",
            "Cat 5",
            "FAC",
            "Fiber Rossette",
            "Top Bolt",
            "Conduit",
            "Casing",
            "Pole Details",
          ];
          return ReportTemplates.generateExcelData(
            reportData,
            excelHeaders,
            `FTTH New Connection Report - ${formatDate(
              options.month,
              "MMMM yyyy"
            )}`
          );
        default:
          return null;
      }
    } catch (error) {
      console.error("Error generating new connection report:", error);
      return null;
    }
  }

  private calculateDailyUsage(
    item: InventoryItem,
    dayUsage: LineDetail[],
    issued: number = 0
  ) {
    const name = String(item.name).toLowerCase();
    let usage = 0;
    switch (name) {
      case "c-hook":
        usage = dayUsage.reduce((sum, line) => sum + (line.c_hook || 0), 0);
        break;
      case "l-hook":
        usage = dayUsage.reduce((sum, line) => sum + (line.l_hook || 0), 0);
        break;
      case "retainers":
        usage = dayUsage.reduce((sum, line) => sum + (line.retainers || 0), 0);
        break;
      case "drop wire cable":
        usage = dayUsage.reduce(
          (sum, line) => sum + (line.total_cable || 0),
          0
        );
        break;
      case "fiber rossette":
        usage = dayUsage.reduce(
          (sum, line) => sum + (line.fiber_rosette || 0),
          0
        );
        break;
      case "fac connector":
        usage = dayUsage.reduce((sum, line) => sum + (line.fac || 0), 0);
        break;
      case "internal wire":
        usage = dayUsage.reduce(
          (sum, line) => sum + (line.internal_wire || 0),
          0
        );
        break;
      case "cat 5 cable":
        usage = dayUsage.reduce((sum, line) => sum + (line.cat5 || 0), 0);
        break;
      case "top bolt":
        usage = dayUsage.reduce((sum, line) => sum + (line.top_bolt || 0), 0);
        break;
      case "conduit":
        usage = dayUsage.reduce((sum, line) => sum + (line.conduit || 0), 0);
        break;
      case "casing":
        usage = dayUsage.reduce((sum, line) => sum + (line.casing || 0), 0);
        break;
      case "rj-45":
        usage = dayUsage.reduce((sum, line) => sum + (line.rj45 || 0), 0);
        break;
      case "rj-11":
        usage = dayUsage.reduce((sum, line) => sum + (line.rj11 || 0), 0);
        break;
      case "rj-12":
        usage = dayUsage.reduce((sum, line) => sum + (line.rj12 || 0), 0);
        break;
      case "nut & bolt":
        usage = dayUsage.reduce((sum, line) => sum + (line.nut_bolt || 0), 0);
        break;
      case "s-rosette":
        usage = dayUsage.reduce((sum, line) => sum + (line.s_rosette || 0), 0);
        break;
      case "c-clip":
        usage = dayUsage.reduce((sum, line) => sum + (line.c_clip || 0), 0);
        break;
      case "socket":
        usage = dayUsage.reduce((sum, line) => sum + (line.socket || 0), 0);
        break;
      case "pole":
        usage = dayUsage.reduce((sum, line) => sum + (line.pole || 0), 0);
        break;
      case "roll plug":
        usage = dayUsage.reduce((sum, line) => sum + (line.roll_plug || 0), 0);
        break;
      case "u-clip":
        usage = dayUsage.reduce((sum, line) => sum + (line.u_clip || 0), 0);
        break;
      case "screw nail":
        usage = dayUsage.reduce((sum, line) => sum + (line.screw_nail || 0), 0);
        break;
      case "flexible":
        usage = dayUsage.reduce((sum, line) => sum + (line.flexible || 0), 0);
        break;
      case "pole 6.7m":
        usage = dayUsage.reduce((sum, line) => sum + (line.pole_67 || 0), 0);
        break;
      case "concrete nail":
        usage = dayUsage.reduce(
          (sum, line) => sum + (line.concrete_nail || 0),
          0
        );
        break;
      case "tag tie":
        usage = dayUsage.reduce((sum, line) => sum + (line.tag_tie || 0), 0);
        break;
      case "c-tie":
        usage = dayUsage.reduce((sum, line) => sum + (line.c_tie || 0), 0);
        break;
      case "bend":
        usage = dayUsage.reduce((sum, line) => sum + (line.bend || 0), 0);
        break;
      default:
        usage = 0;
    }
    return {
      previousBalance: item.current_stock, // Could be improved to track running balance
      issued: issued,
      usage: usage,
      balanceReturn: item.current_stock - usage + issued, // Could be improved for running balance
    };
  }

  private calculateMaterialTotals(lines: LineDetail[]) {
    return lines.reduce(
      (totals, line) => ({
        f1: totals.f1 + (line.fiber_rosette || 0),
        g1: totals.g1 + (line.fac || 0),
        dwLh: totals.dwLh + (line.l_hook || 0),
        dwCh: totals.dwCh + (line.c_hook || 0),
        dwRt: totals.dwRt + (line.retainers || 0),
        iwN: totals.iwN + (line.internal_wire || 0),
        cat5: totals.cat5 + (line.cat5 || 0),
        fac: totals.fac + (line.fac || 0),
        fiberRossette: totals.fiberRossette + (line.fiber_rosette || 0),
        topBolt: totals.topBolt + (line.top_bolt || 0),
        conduit: totals.conduit + (line.conduit || 0),
        casing: totals.casing + (line.casing || 0),
      }),
      {
        f1: 0,
        g1: 0,
        dwLh: 0,
        dwCh: 0,
        dwRt: 0,
        iwN: 0,
        cat5: 0,
        fac: 0,
        fiberRossette: 0,
        topBolt: 0,
        conduit: 0,
        casing: 0,
      }
    );
  }
}

export const enhancedReportService = new EnhancedReportService();

// Types for Supabase results
interface InventoryItem {
  id: string;
  name: string;
  unit?: string;
  current_stock: number;
}
interface LineDetail {
  date: string;
  c_hook?: number;
  l_hook?: number;
  retainers?: number;
  total_cable?: number;
  fiber_rosette?: number;
  fac?: number;
  internal_wire?: number;
  cat5?: number;
  top_bolt?: number;
  conduit?: number;
  casing?: number;
  rj45?: number;
  rj11?: number;
  rj12?: number;
  nut_bolt?: number;
  s_rosette?: number;
  c_clip?: number;
  socket?: number;
  pole?: number;
  roll_plug?: number;
  u_clip?: number;
  screw_nail?: number;
  flexible?: number;
  pole_67?: number;
  concrete_nail?: number;
  tag_tie?: number;
  c_tie?: number;
  bend?: number;
  dp?: string;
  phone_no?: string;
  name?: string;
  address?: string;
  port?: string;
  ont_no?: string;
  onu_no?: string;
  serial_no?: string;
  box?: string;
  f1?: number;
  g1?: number;
  wastage?: number;
  dp_power?: number;
  inbox_power?: number;
  [key: string]: unknown;
}
interface InventoryInvoiceItem {
  id: string;
  item_id: string;
  quantity_issued: number;
  inventory_invoices?: { date: string };
}
