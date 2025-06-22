"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { MonthYearPicker } from "@/components/ui/month-year-picker"
import { Download, FileText, RefreshCw, BarChart3, FileSpreadsheet, FileImage, Clock, CheckCircle } from "lucide-react"
import { format as formatDate } from "date-fns"
import { cn } from "@/lib/utils"
import { getSupabaseClient } from "@/lib/supabase"
import { toast } from "sonner"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { useNotification } from "@/contexts/notification-context"
import { NotificationService } from "@/lib/notification-service"

function ReportsPageContent() {
  const [selectedMonth, setSelectedMonth] = useState(new Date())
  const [exportFormat, setExportFormat] = useState("pdf")
  const [isGenerating, setIsGenerating] = useState(false)
  const [autoGenerate, setAutoGenerate] = useState(true)
  const supabase = getSupabaseClient()
  const [generatingReports, setGeneratingReports] = useState<Set<string>>(new Set())
  const { addNotification } = useNotification()

  const reports = [
    {
      id: "material-usage",
      title: "Material Usage Per Line",
      description: "Detailed material consumption excluding rejected tasks",
      icon: BarChart3,
      color: "bg-blue-500",
      template: "material-usage",
    },
    {
      id: "daily-balance",
      title: "Daily Material Balance Sheet",
      description: "Previous balance, issued, usage, balance return",
      icon: FileSpreadsheet,
      color: "bg-green-500",
      template: "daily-balance",
    },
    {
      id: "drum-numbers",
      title: "Drum Number Sheet",
      description: "Phone numbers with cable measurements and drum assignments",
      icon: FileText,
      color: "bg-purple-500",
      template: "drum-numbers",
    },
    {
      id: "material-balance",
      title: "Material Balance Sheet",
      description: "Opening balance, stock issue, wastage, in-hand, WIP material",
      icon: FileImage,
      color: "bg-orange-500",
      template: "material-balance",
    },
    {
      id: "new-connection",
      title: "New Connection Material Sheet",
      description: "FTTH installation details with material breakdown",
      icon: FileText,
      color: "bg-indigo-500",
      template: "new-connection",
    },
  ]

  // Auto-generate reports for current month
  useEffect(() => {
    if (autoGenerate) {
      const currentMonth = new Date()
      if (formatDate(currentMonth, "yyyy-MM") === formatDate(selectedMonth, "yyyy-MM")) {
        // Auto-generate reports for current month
        console.log("Auto-generating reports for current month")
      }
    }
  }, [selectedMonth, autoGenerate])

  const generateDailyMaterialBalanceReport = async (month: Date, exportType: string) => {
    try {
      const startDate = new Date(month.getFullYear(), month.getMonth(), 1)
      const endDate = new Date(month.getFullYear(), month.getMonth() + 1, 0)

      // Get all inventory items
      const { data: items } = await supabase.from("inventory_items").select("*").order("name")

      if (!items) return null

      // Get daily usage data for the month
      const { data: dailyUsage } = await supabase
        .from("line_details")
        .select("*")
        .gte("date", startDate.toISOString().split("T")[0])
        .lte("date", endDate.toISOString().split("T")[0])
        .order("date")

      // Create daily balance sheet structure
      const daysInMonth = endDate.getDate()
      const dailyData = []

      for (let day = 1; day <= daysInMonth; day++) {
        const currentDate = new Date(month.getFullYear(), month.getMonth(), day)
        const dateStr = formatDate(currentDate, "dd-MMM")

        const dayUsage =
          dailyUsage?.filter(
            (line) => formatDate(new Date(line.date), "yyyy-MM-dd") === formatDate(currentDate, "yyyy-MM-dd"),
          ) || []

        dailyData.push({
          date: dateStr,
          usage: dayUsage,
        })
      }

      const reportData = {
        title: "NNS Enterprise - Daily Material Balance",
        month: formatDate(month, "MMMM yyyy"),
        items: items.map((item) => ({
          name: item.name,
          unit: item.unit || "NOS",
          dailyBalances: dailyData.map((day) => {
            const usage = calculateDailyUsage(item, day.usage)
            return {
              date: day.date,
              previousBalance: usage.previousBalance,
              issued: usage.issued,
              usage: usage.usage,
              balanceReturn: usage.balanceReturn,
            }
          }),
        })),
      }

      return formatReportForExport(reportData, exportType, "daily-balance")
    } catch (error) {
      console.error("Error generating daily material balance report:", error)
      return null
    }
  }

  const generateDrumNumberReport = async (month: Date, exportType: string) => {
    try {
      const startDate = new Date(month.getFullYear(), month.getMonth(), 1)
      const endDate = new Date(month.getFullYear(), month.getMonth() + 1, 0)

      const { data: lines } = await supabase
        .from("line_details")
        .select("*")
        .gte("date", startDate.toISOString().split("T")[0])
        .lte("date", endDate.toISOString().split("T")[0])
        .not("drum_number_new", "is", null)
        .order("phone_number")

      if (!lines) return null

      const reportData = {
        title: "Drum Number Sheet",
        month: formatDate(month, "MMMM yyyy"),
        data: lines.map((line, index) => ({
          no: index + 1,
          tpNumber: line.phone_number,
          pdw: line.cable_start_new || 0,
          dw: line.cable_middle_new || 0,
          cHook: line.c_hook_new || 0,
          dwCus: line.cable_end_new || 0,
          drumNumber: line.drum_number_new || "",
        })),
      }

      return formatReportForExport(reportData, exportType, "drum-numbers")
    } catch (error) {
      console.error("Error generating drum number report:", error)
      return null
    }
  }

  const generateMaterialBalanceReport = async (month: Date, exportType: string) => {
    try {
      const startDate = new Date(month.getFullYear(), month.getMonth(), 1)
      const endDate = new Date(month.getFullYear(), month.getMonth() + 1, 0)

      const { data: items } = await supabase.from("inventory_items").select(`
          *,
          inventory_invoice_items(quantity),
          waste_tracking(quantity)
        `)

      if (!items) return null

      const reportData = {
        title: "Material Balance Sheet for New Connection",
        contractorName: "NNS Enterprise",
        area: "Southern",
        month: formatDate(month, "MMMM"),
        year: month.getFullYear(),
        data: items.map((item, index) => {
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
        }),
      }

      return formatReportForExport(reportData, exportType, "material-balance")
    } catch (error) {
      console.error("Error generating material balance report:", error)
      return null
    }
  }

  const generateNewConnectionReport = async (month: Date, exportType: string) => {
    try {
      const startDate = new Date(month.getFullYear(), month.getMonth(), 1)
      const endDate = new Date(month.getFullYear(), month.getMonth() + 1, 0)

      const { data: lines } = await supabase
        .from("line_details")
        .select("*")
        .gte("date", startDate.toISOString().split("T")[0])
        .lte("date", endDate.toISOString().split("T")[0])
        .order("date")

      if (!lines) return null

      const reportData = {
        title: "FTTH - (PH/HR)",
        contractorName: "NNS Enterprise",
        invoiceNo: `NNS/WPS/HR/NC/24/${formatDate(month, "MMMM").toUpperCase()}`,
        data: lines.map((line, index) => ({
          no: index + 1,
          tpNumber: line.phone_number,
          configs: line.dp || "OKR-HR",
          rtom: "OKR-HR",
          completeDate: formatDate(new Date(line.date), "dd-MMM-yy"),
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
        })),
        totals: calculateMaterialTotals(lines),
      }

      return formatReportForExport(reportData, exportType, "new-connection")
    } catch (error) {
      console.error("Error generating new connection report:", error)
      return null
    }
  }

  const calculateDailyUsage = (item: any, dayUsage: any[]) => {
    // Calculate usage based on item type and line installations
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

  const calculateMaterialTotals = (lines: any[]) => {
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

  const formatReportForExport = (data: any, exportType: string, template: string) => {
    switch (exportType) {
      case "csv":
        return generateCSV(data, template)
      case "xlsx":
        return generateExcel(data, template)
      case "pdf":
        return generatePDF(data, template)
      default:
        return null
    }
  }

  const generateCSV = (data: any, template: string) => {
    let csvContent = ""

    switch (template) {
      case "daily-balance":
        csvContent = generateDailyBalanceCSV(data)
        break
      case "drum-numbers":
        csvContent = generateDrumNumberCSV(data)
        break
      case "material-balance":
        csvContent = generateMaterialBalanceCSV(data)
        break
      case "new-connection":
        csvContent = generateNewConnectionCSV(data)
        break
    }

    return csvContent
  }

  const generateDailyBalanceCSV = (data: any) => {
    let csv = `${data.title}\n`
    csv += `Month: ${data.month}\n\n`

    // Header row
    csv += "Item Name,Unit,"
    data.items[0]?.dailyBalances.forEach((day: any) => {
      csv += `${day.date} Prev Balance,${day.date} Issued,${day.date} Usage,${day.date} Balance Return,`
    })
    csv += "\n"

    // Data rows
    data.items.forEach((item: any) => {
      csv += `${item.name},${item.unit},`
      item.dailyBalances.forEach((day: any) => {
        csv += `${day.previousBalance},${day.issued},${day.usage},${day.balanceReturn},`
      })
      csv += "\n"
    })

    return csv
  }

  const generateDrumNumberCSV = (data: any) => {
    let csv = `${data.title}\n`
    csv += `Month: ${data.month}\n\n`
    csv += "No,TP Number,PDW,DW,C HOOK,DW CUS,DRUM NUMBER\n"

    data.data.forEach((row: any) => {
      csv += `${row.no},${row.tpNumber},${row.pdw},${row.dw},${row.cHook},${row.dwCus},${row.drumNumber}\n`
    })

    return csv
  }

  const generateMaterialBalanceCSV = (data: any) => {
    let csv = `${data.title}\n`
    csv += `Contractor Name: ${data.contractorName}\n`
    csv += `Area: ${data.area}\n`
    csv += `Month: ${data.month}\n`
    csv += `Year: ${data.year}\n\n`
    csv += "No,Item,Opening Balance,Stock Issued,Wastage,In Hand,Material Used,WIP Material\n"

    data.data.forEach((row: any) => {
      csv += `${row.no},${row.item},${row.openingBalance},${row.stockIssued},${row.wastage},${row.inHand},${row.materialUsed},${row.wipMaterial}\n`
    })

    return csv
  }

  const generateNewConnectionCSV = (data: any) => {
    let csv = `${data.title}\n`
    csv += `Contractor Name: ${data.contractorName}\n`
    csv += `Invoice No: ${data.invoiceNo}\n\n`
    csv +=
      "No,TP Number,Configs,RTOM,Complete Date,F-1,G-1,DW-LH,DW-CH,DW-RT,IW-N,Cat 5,FAC,Fiber Rossette,Top Bolt,Conduit,Casing,Pole Details\n"

    data.data.forEach((row: any) => {
      csv += `${row.no},${row.tpNumber},${row.configs},${row.rtom},${row.completeDate},${row.f1},${row.g1},${row.dwLh},${row.dwCh},${row.dwRt},${row.iwN},${row.cat5},${row.fac},${row.fiberRossette},${row.topBolt},${row.conduit},${row.casing},"${row.poleDetails}"\n`
    })

    return csv
  }

  const generateExcel = (data: any, template: string) => {
    // For Excel generation, return CSV format for now
    // In production, you would use a library like xlsx
    return generateCSV(data, template)
  }

  const generatePDF = (data: any, template: string) => {
    // Return HTML structure for PDF generation
    return {
      html: generateHTMLForPDF(data, template),
      filename: `${template}-${formatDate(selectedMonth, "yyyy-MM")}.pdf`,
    }
  }

  const generateHTMLForPDF = (data: any, template: string) => {
    switch (template) {
      case "daily-balance":
        return generateDailyBalanceHTML(data)
      case "drum-numbers":
        return generateDrumNumberHTML(data)
      case "material-balance":
        return generateMaterialBalanceHTML(data)
      case "new-connection":
        return generateNewConnectionHTML(data)
      default:
        return "<html><body><h1>Report</h1></body></html>"
    }
  }

  const generateDailyBalanceHTML = (data: any) => {
    return `
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; font-size: 10px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            th, td { border: 1px solid #000; padding: 4px; text-align: center; }
            th { background-color: #f0f0f0; font-weight: bold; }
            .header { text-align: center; margin-bottom: 20px; }
            .rotate { writing-mode: vertical-lr; text-orientation: mixed; }
          </style>
        </head>
        <body>
          <div class="header">
            <h2>${data.title}</h2>
            <p>Month: ${data.month}</p>
          </div>
          <table>
            <thead>
              <tr>
                <th rowspan="2">Item Name</th>
                <th rowspan="2">Unit</th>
                ${data.items[0]?.dailyBalances
                  .map(
                    (day: any) => `
                  <th colspan="4">${day.date}</th>
                `,
                  )
                  .join("")}
              </tr>
              <tr>
                ${data.items[0]?.dailyBalances
                  .map(
                    () => `
                  <th>Prev Balance</th>
                  <th>Issued</th>
                  <th>Usage</th>
                  <th>Balance Return</th>
                `,
                  )
                  .join("")}
              </tr>
            </thead>
            <tbody>
              ${data.items
                .map(
                  (item: any) => `
                <tr>
                  <td>${item.name}</td>
                  <td>${item.unit}</td>
                  ${item.dailyBalances
                    .map(
                      (day: any) => `
                    <td>${day.previousBalance}</td>
                    <td>${day.issued}</td>
                    <td>${day.usage}</td>
                    <td>${day.balanceReturn}</td>
                  `,
                    )
                    .join("")}
                </tr>
              `,
                )
                .join("")}
            </tbody>
          </table>
        </body>
      </html>
    `
  }

  const generateDrumNumberHTML = (data: any) => {
    return `
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #000; padding: 8px; text-align: center; }
            th { background-color: #f0f0f0; }
            .header { text-align: center; margin-bottom: 20px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h2>${data.title}</h2>
            <p>Month: ${data.month}</p>
          </div>
          <table>
            <thead>
              <tr>
                <th>No</th>
                <th>TP Number</th>
                <th>PDW</th>
                <th>DW</th>
                <th>C HOOK</th>
                <th>DW CUS</th>
                <th>DRUM NUMBER</th>
              </tr>
            </thead>
            <tbody>
              ${data.data
                .map(
                  (row: any) => `
                <tr>
                  <td>${row.no}</td>
                  <td>${row.tpNumber}</td>
                  <td>${row.pdw}</td>
                  <td>${row.dw}</td>
                  <td>${row.cHook}</td>
                  <td>${row.dwCus}</td>
                  <td>${row.drumNumber}</td>
                </tr>
              `,
                )
                .join("")}
            </tbody>
          </table>
        </body>
      </html>
    `
  }

  const generateMaterialBalanceHTML = (data: any) => {
    return `
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #000; padding: 8px; text-align: center; }
            th { background-color: #f0f0f0; }
            .header { text-align: center; margin-bottom: 20px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h2>${data.title}</h2>
            <p>Contractor Name: ${data.contractorName}</p>
            <p>Area: ${data.area}</p>
            <p>Month: ${data.month}</p>
            <p>Year: ${data.year}</p>
          </div>
          <table>
            <thead>
              <tr>
                <th>No</th>
                <th>Item</th>
                <th>Opening Balance</th>
                <th>Stock Issued</th>
                <th>Wastage</th>
                <th>In Hand</th>
                <th>Material Used</th>
                <th>WIP Material</th>
              </tr>
            </thead>
            <tbody>
              ${data.data
                .map(
                  (row: any) => `
                <tr>
                  <td>${row.no}</td>
                  <td>${row.item}</td>
                  <td>${row.openingBalance}</td>
                  <td>${row.stockIssued}</td>
                  <td>${row.wastage}</td>
                  <td>${row.inHand}</td>
                  <td>${row.materialUsed}</td>
                  <td>${row.wipMaterial}</td>
                </tr>
              `,
                )
                .join("")}
            </tbody>
          </table>
        </body>
      </html>
    `
  }

  const generateNewConnectionHTML = (data: any) => {
    return `
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; font-size: 10px; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #000; padding: 4px; text-align: center; }
            th { background-color: #f0f0f0; }
            .header { text-align: center; margin-bottom: 20px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h2>${data.title}</h2>
            <p>Contractor Name: ${data.contractorName}</p>
            <p>Invoice No: ${data.invoiceNo}</p>
          </div>
          <table>
            <thead>
              <tr>
                <th>No</th>
                <th>TP Number</th>
                <th>Configs</th>
                <th>RTOM</th>
                <th>Complete Date</th>
                <th>F-1</th>
                <th>G-1</th>
                <th>DW-LH</th>
                <th>DW-CH</th>
                <th>DW-RT</th>
                <th>IW-N</th>
                <th>Cat 5</th>
                <th>FAC</th>
                <th>Fiber Rossette</th>
                <th>Top Bolt</th>
                <th>Conduit</th>
                <th>Casing</th>
                <th>Pole Details</th>
              </tr>
            </thead>
            <tbody>
              ${data.data
                .map(
                  (row: any) => `
                <tr>
                  <td>${row.no}</td>
                  <td>${row.tpNumber}</td>
                  <td>${row.configs}</td>
                  <td>${row.rtom}</td>
                  <td>${row.completeDate}</td>
                  <td>${row.f1}</td>
                  <td>${row.g1}</td>
                  <td>${row.dwLh}</td>
                  <td>${row.dwCh}</td>
                  <td>${row.dwRt}</td>
                  <td>${row.iwN}</td>
                  <td>${row.cat5}</td>
                  <td>${row.fac}</td>
                  <td>${row.fiberRossette}</td>
                  <td>${row.topBolt}</td>
                  <td>${row.conduit}</td>
                  <td>${row.casing}</td>
                  <td>${row.poleDetails}</td>
                </tr>
              `,
                )
                .join("")}
              <tr style="font-weight: bold; background-color: #f0f0f0;">
                <td colspan="5">Material Total</td>
                <td>${data.totals.f1}</td>
                <td>${data.totals.g1}</td>
                <td>${data.totals.dwLh}</td>
                <td>${data.totals.dwCh}</td>
                <td>${data.totals.dwRt}</td>
                <td>${data.totals.iwN}</td>
                <td>${data.totals.cat5}</td>
                <td>${data.totals.fac}</td>
                <td>${data.totals.fiberRossette}</td>
                <td>${data.totals.topBolt}</td>
                <td>${data.totals.conduit}</td>
                <td>${data.totals.casing}</td>
                <td></td>
              </tr>
            </tbody>
          </table>
          <div style="margin-top: 30px;">
            <table style="width: 50%; border: none;">
              <tr style="border: none;">
                <td style="border: none; text-align: left;">Prepared by</td>
                <td style="border: none; text-align: left;">Checked by<br/>(with rubber stamp)</td>
              </tr>
            </table>
          </div>
        </body>
      </html>
    `
  }

  const handleGenerateReport = async (reportId: string) => {
    setGeneratingReports((prev) => new Set(prev).add(reportId))
    try {
      let reportData = null

      switch (reportId) {
        case "daily-balance":
          reportData = await generateDailyMaterialBalanceReport(selectedMonth, exportFormat)
          break
        case "drum-numbers":
          reportData = await generateDrumNumberReport(selectedMonth, exportFormat)
          break
        case "material-balance":
          reportData = await generateMaterialBalanceReport(selectedMonth, exportFormat)
          break
        case "new-connection":
          reportData = await generateNewConnectionReport(selectedMonth, exportFormat)
          break
        default:
          // Use existing report generation for material-usage
          reportData = await generateMaterialUsageReport(selectedMonth, exportFormat)
      }

      if (reportData) {
        downloadReport(reportData, reportId, exportFormat)
        toast.success("Report generated successfully!")

        // Create notification for report generation
        const reportTitle = reports.find((r) => r.id === reportId)?.title || "Report"
        await NotificationService.createReportReadyNotification(reportTitle, formatDate(selectedMonth, "MMMM yyyy"))
      } else {
        toast.error("Failed to generate report")
      }
    } catch (error) {
      console.error("Error generating report:", error)
      toast.error("Error generating report")
    } finally {
      setGeneratingReports((prev) => {
        const newSet = new Set(prev)
        newSet.delete(reportId)
        return newSet
      })
    }
  }

  const generateMaterialUsageReport = async (month: Date, exportType: string) => {
    // Existing material usage report logic
    const startDate = new Date(month.getFullYear(), month.getMonth(), 1)
    const endDate = new Date(month.getFullYear(), month.getMonth() + 1, 0)

    const { data: lines } = await supabase
      .from("line_details")
      .select("*")
      .gte("date", startDate.toISOString().split("T")[0])
      .lte("date", endDate.toISOString().split("T")[0])
      .order("date")

    if (!lines) return null

    const reportData = {
      title: "Material Usage Per Line Report",
      month: formatDate(month, "MMMM yyyy"),
      data: lines.map((line) => ({
        phone_number: line.phone_number,
        customer_name: line.name,
        dp: line.dp,
        installation_date: line.date,
        cable_used: line.total_calc,
        retainers: line.retainers,
        l_hook: line.l_hook_new,
        c_hook: line.c_hook_new,
        fiber_rosette: line.fiber_rosette_new,
        fac: line.fac_new,
        internal_wire: line.internal_wire_new,
        wastage: line.wastage_input,
      })),
    }

    return formatReportForExport(reportData, exportType, "material-usage")
  }

  const downloadReport = (reportData: any, reportId: string, exportType: string) => {
    const filename = `${reportId}-${formatDate(selectedMonth, "yyyy-MM")}.${exportType}`

    if (exportType === "pdf" && reportData.html) {
      // Create a new window for PDF generation
      const printWindow = window.open("", "_blank")
      if (printWindow) {
        printWindow.document.write(reportData.html)
        printWindow.document.close()
        printWindow.focus()
        setTimeout(() => {
          printWindow.print()
        }, 250)
      }
    } else {
      // Download CSV/Excel
      const blob = new Blob([reportData], { type: "text/csv;charset=utf-8;" })
      const link = document.createElement("a")
      const url = URL.createObjectURL(blob)
      link.setAttribute("href", url)
      link.setAttribute("download", filename)
      link.style.visibility = "hidden"
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
  }

  const handleExportAll = async () => {
    setIsGenerating(true)
    try {
      for (const report of reports) {
        await handleGenerateReport(report.id)
        // Add delay between reports
        await new Promise((resolve) => setTimeout(resolve, 1000))
      }
      toast.success("All reports generated successfully!")
    } catch (error) {
      toast.error("Error generating reports")
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Reports & Analytics</h1>
          <p className="text-muted-foreground">Generate monthly reports and AI insights</p>
        </div>
        <Button onClick={handleExportAll} disabled={isGenerating}>
          {isGenerating ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
          Export All
        </Button>
      </div>

      <Tabs defaultValue="reports" className="space-y-6">
        <TabsList>
          <TabsTrigger value="reports">Monthly Reports</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="reports" className="space-y-6">
          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle>Report Configuration</CardTitle>
            </CardHeader>
            <CardContent className="flex gap-4 items-center">
              <div>
                <label className="text-sm font-medium mb-2 block">Select Month</label>
                <MonthYearPicker date={selectedMonth} onDateChange={setSelectedMonth} />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Export Format</label>
                <Select value={exportFormat} onValueChange={setExportFormat}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Export format" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pdf">PDF</SelectItem>
                    <SelectItem value="csv">CSV</SelectItem>
                    <SelectItem value="xlsx">Excel</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="auto-generate"
                  checked={autoGenerate}
                  onChange={(e) => setAutoGenerate(e.target.checked)}
                />
                <label htmlFor="auto-generate" className="text-sm font-medium">
                  Auto-generate for current month
                </label>
              </div>
            </CardContent>
          </Card>

          {/* Reports Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {reports.map((report) => (
              <Card key={report.id}>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className={cn("p-2 rounded-lg", report.color)}>
                      <report.icon className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{report.title}</CardTitle>
                      <CardDescription>{report.description}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <Button
                    onClick={() => handleGenerateReport(report.id)}
                    disabled={generatingReports.has(report.id) || isGenerating}
                    className="w-full"
                  >
                    {generatingReports.has(report.id) ? (
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Download className="mr-2 h-4 w-4" />
                    )}
                    Generate {exportFormat.toUpperCase() === "XLSX" ? "Excel" : exportFormat.toUpperCase()}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Reports Generated</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">24</div>
                <p className="text-xs text-muted-foreground">This month</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Auto-Generation</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span className="text-sm">Active</span>
                </div>
                <p className="text-xs text-muted-foreground">Next: {formatDate(new Date(), "MMM dd")}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Storage Used</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">2.4 GB</div>
                <p className="text-xs text-muted-foreground">Report archives</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Report Generation Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Automatic Monthly Generation</h4>
                  <p className="text-sm text-muted-foreground">
                    Generate all reports automatically on the 1st of each month
                  </p>
                </div>
                <input type="checkbox" checked={autoGenerate} onChange={(e) => setAutoGenerate(e.target.checked)} />
              </div>

              <div>
                <h4 className="font-medium mb-2">Default Export Format</h4>
                <Select value={exportFormat} onValueChange={setExportFormat}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pdf">PDF</SelectItem>
                    <SelectItem value="csv">CSV</SelectItem>
                    <SelectItem value="xlsx">Excel</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="pt-4">
                <Button variant="outline">
                  <Clock className="mr-2 h-4 w-4" />
                  Schedule Reports
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default function ReportsPage() {
  return (
    <DashboardLayout>
      <ReportsPageContent />
    </DashboardLayout>
  )
}
