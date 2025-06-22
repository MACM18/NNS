import { getSupabaseClient } from "./supabase"
import {
  ReportTemplates,
  type DrumNumberReportData,
  type MaterialBalanceReportData,
  type DailyMaterialBalanceReportData,
  type NewConnectionReportData,
} from "./report-templates"
import { format as formatDate } from "date-fns"

export interface ReportOptions {
  format: "pdf" | "csv" | "xlsx"
  month: Date
  filters?: Record<string, any>
}

export class EnhancedReportService {
  private supabase = getSupabaseClient()

  async generateDrumNumberReport(options: ReportOptions) {
    try {
      const startDate = new Date(options.month.getFullYear(), options.month.getMonth(), 1)
      const endDate = new Date(options.month.getFullYear(), options.month.getMonth() + 1, 0)

      const { data: lines } = await this.supabase
        .from("line_details")
        .select("*")
        .gte("date", startDate.toISOString().split("T")[0])
        .lte("date", endDate.toISOString().split("T")[0])
        .not("drum_number_new", "is", null)
        .order("phone_number")

      if (!lines) return null

      const reportData: DrumNumberReportData[] = lines.map((line, index) => ({
        no: index + 1,
        tpNumber: line.phone_number,
        pdw: line.cable_start_new || 0,
        dw: line.cable_middle_new || 0,
        cHook: line.c_hook_new || 0,
        dwCus: line.cable_end_new || 0,
        drumNumber: line.drum_number_new || "",
      }))

      const month = formatDate(options.month, "MMMM yyyy")

      switch (options.format) {
        case "pdf":
          return {
            html: ReportTemplates.generateDrumNumberHTML(reportData, month),
            filename: `drum-number-sheet-${formatDate(options.month, "yyyy-MM")}.pdf`,
          }
        case "csv":
          const headers = ["no", "tpNumber", "pdw", "dw", "cHook", "dwCus", "drumNumber"]
          return ReportTemplates.generateCSV(reportData, headers, `Drum Number Sheet - ${month}`)
        case "xlsx":
          const excelHeaders = ["No", "TP Number", "PDW", "DW", "C HOOK", "DW CUS", "DRUM NUMBER"]
          return ReportTemplates.generateExcelData(reportData, excelHeaders, `Drum Number Sheet - ${month}`)
        default:
          return null
      }
    } catch (error) {
      console.error("Error generating drum number report:", error)
      return null
    }
  }

  async generateMaterialBalanceReport(options: ReportOptions) {
    try {
      const { data: items } = await this.supabase.from("inventory_items").select(`
          *,
          inventory_invoice_items(quantity),
          waste_tracking(quantity)
        `)

      if (!items) return null

      const reportData: MaterialBalanceReportData[] = items.map((item, index) => {
        const totalIssued =
          item.inventory_invoice_items?.reduce((sum, invoice) => sum + (invoice.quantity || 0), 0) || 0
        const totalWastage = item.waste_tracking?.reduce((sum, waste) => sum + (waste.quantity || 0), 0) || 0

        return {
          no: index + 1,
          item: item.name,
          openingBalance: item.current_stock + totalIssued - totalWastage,
          stockIssued: totalIssued,
          wastage: totalWastage,
          inHand: item.current_stock,
          materialUsed: totalIssued - totalWastage,
          wipMaterial: Math.max(0, totalIssued - totalWastage - item.current_stock),
        }
      })

      const month = formatDate(options.month, "MMMM")
      const year = options.month.getFullYear()

      switch (options.format) {
        case "pdf":
          return {
            html: ReportTemplates.generateMaterialBalanceHTML(reportData, "NNS Enterprise", "Southern", month, year),
            filename: `material-balance-sheet-${formatDate(options.month, "yyyy-MM")}.pdf`,
          }
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
          ]
          return ReportTemplates.generateCSV(reportData, headers, `Material Balance Sheet - ${month} ${year}`)
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
          ]
          return ReportTemplates.generateExcelData(
            reportData,
            excelHeaders,
            `Material Balance Sheet - ${month} ${year}`,
          )
        default:
          return null
      }
    } catch (error) {
      console.error("Error generating material balance report:", error)
      return null
    }
  }

  async generateDailyMaterialBalanceReport(options: ReportOptions) {
    try {
      const startDate = new Date(options.month.getFullYear(), options.month.getMonth(), 1)
      const endDate = new Date(options.month.getFullYear(), options.month.getMonth() + 1, 0)

      // Get all inventory items
      const { data: items } = await this.supabase.from("inventory_items").select("*").order("name")

      if (!items) return null

      // Get daily usage data for the month
      const { data: dailyUsage } = await this.supabase
        .from("line_details")
        .select("*")
        .gte("date", startDate.toISOString().split("T")[0])
        .lte("date", endDate.toISOString().split("T")[0])
        .order("date")

      // Create daily balance sheet structure
      const daysInMonth = endDate.getDate()
      const dailyData = []

      for (let day = 1; day <= daysInMonth; day++) {
        const currentDate = new Date(options.month.getFullYear(), options.month.getMonth(), day)
        const dateStr = formatDate(currentDate, "d-MMM")

        const dayUsage =
          dailyUsage?.filter(
            (line) => formatDate(new Date(line.date), "yyyy-MM-dd") === formatDate(currentDate, "yyyy-MM-dd"),
          ) || []

        dailyData.push({
          date: dateStr,
          usage: dayUsage,
        })
      }

      const reportData: DailyMaterialBalanceReportData[] = items.map((item) => ({
        itemName: item.name,
        unit: item.unit || "NOS",
        dailyBalances: dailyData.map((day) => {
          const usage = this.calculateDailyUsage(item, day.usage)
          return {
            date: day.date,
            previousBalance: usage.previousBalance,
            issued: usage.issued,
            usage: usage.usage,
            balanceReturn: usage.balanceReturn,
          }
        }),
      }))

      const month = formatDate(options.month, "MMMM yyyy")

      switch (options.format) {
        case "pdf":
          return {
            html: ReportTemplates.generateDailyMaterialBalanceHTML(reportData, month),
            filename: `daily-material-balance-${formatDate(options.month, "yyyy-MM")}.pdf`,
          }
        case "csv":
          // For CSV, we'll flatten the daily data
          const csvData = []
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
              })
            })
          })
          const headers = ["itemName", "unit", "date", "previousBalance", "issued", "usage", "balanceReturn"]
          return ReportTemplates.generateCSV(csvData, headers, `Daily Material Balance - ${month}`)
        case "xlsx":
          const excelHeaders = ["Item Name", "Unit", "Date", "Previous Balance", "Issued", "Usage", "Balance Return"]
          const excelData = []
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
              })
            })
          })
          return ReportTemplates.generateExcelData(excelData, excelHeaders, `Daily Material Balance - ${month}`)
        default:
          return null
      }
    } catch (error) {
      console.error("Error generating daily material balance report:", error)
      return null
    }
  }

  async generateNewConnectionReport(options: ReportOptions) {
    try {
      const startDate = new Date(options.month.getFullYear(), options.month.getMonth(), 1)
      const endDate = new Date(options.month.getFullYear(), options.month.getMonth() + 1, 0)

      const { data: lines } = await this.supabase
        .from("line_details")
        .select("*")
        .gte("date", startDate.toISOString().split("T")[0])
        .lte("date", endDate.toISOString().split("T")[0])
        .order("date")

      if (!lines) return null

      const reportData: NewConnectionReportData[] = lines.map((line, index) => ({
        no: index + 1,
        tpNumber: line.phone_number,
        configs: line.dp || "OKR-HR",
        rtom: "OKR-HR",
        completeDate: formatDate(new Date(line.date), "d-MMM-yy"),
        f1: line.fiber_rosette_new || 0,
        g1: line.fac_new || 0,
        dwLh: line.l_hook_new || 0,
        dwCh: line.c_hook_new || 0,
        dwRt: line.retainers || 0,
        iwN: line.internal_wire_new || 0,
        cat5: 0, // Add if available in database
        fac: line.fac_new || 0,
        fiberRossette: line.fiber_rosette_new || 0,
        topBolt: 0, // Add if available
        conduit: 0, // Add if available
        casing: 0, // Add if available
        poleDetails: line.remarks || "",
      }))

      const totals = this.calculateMaterialTotals(lines)
      const invoiceNo = `NNS/WPS/HR/NC/24/${formatDate(options.month, "MMMM").toUpperCase()}`

      switch (options.format) {
        case "pdf":
          return {
            html: ReportTemplates.generateNewConnectionHTML(reportData, "NNS Enterprise", invoiceNo, totals),
            filename: `new-connection-report-${formatDate(options.month, "yyyy-MM")}.pdf`,
          }
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
          ]
          return ReportTemplates.generateCSV(
            reportData,
            headers,
            `FTTH New Connection Report - ${formatDate(options.month, "MMMM yyyy")}`,
          )
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
          ]
          return ReportTemplates.generateExcelData(
            reportData,
            excelHeaders,
            `FTTH New Connection Report - ${formatDate(options.month, "MMMM yyyy")}`,
          )
        default:
          return null
      }
    } catch (error) {
      console.error("Error generating new connection report:", error)
      return null
    }
  }

  private calculateDailyUsage(item: any, dayUsage: any[]) {
    let usage = 0

    dayUsage.forEach((line) => {
      switch (item.name.toLowerCase()) {
        case "c hook":
          usage += line.c_hook_new || 0
          break
        case "l hook":
          usage += line.l_hook_new || 0
          break
        case "retainers white":
          usage += line.retainers || 0
          break
        case "fiber drop wire":
          usage += line.total_calc || 0
          break
        case "fiber rosset box":
          usage += line.fiber_rosette_new || 0
          break
        case "fac connector":
          usage += line.fac_new || 0
          break
        case "internal wire":
          usage += line.internal_wire_new || 0
          break
        default:
          usage += 0
      }
    })

    return {
      previousBalance: item.current_stock,
      issued: 0, // Would need inventory issue tracking
      usage: usage,
      balanceReturn: item.current_stock - usage,
    }
  }

  private calculateMaterialTotals(lines: any[]) {
    return lines.reduce(
      (totals, line) => ({
        f1: totals.f1 + (line.fiber_rosette_new || 0),
        g1: totals.g1 + (line.fac_new || 0),
        dwLh: totals.dwLh + (line.l_hook_new || 0),
        dwCh: totals.dwCh + (line.c_hook_new || 0),
        dwRt: totals.dwRt + (line.retainers || 0),
        iwN: totals.iwN + (line.internal_wire_new || 0),
        cat5: totals.cat5 + 0,
        fac: totals.fac + (line.fac_new || 0),
        fiberRossette: totals.fiberRossette + (line.fiber_rosette_new || 0),
        topBolt: totals.topBolt + 0,
        conduit: totals.conduit + 0,
        casing: totals.casing + 0,
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
      },
    )
  }
}

export const enhancedReportService = new EnhancedReportService()
