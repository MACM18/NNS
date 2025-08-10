"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DateRangePicker } from "@/components/ui/date-range-picker"
import { addDays } from "date-fns"
import type { DateRange } from "react-day-picker"
import { generateReport } from "@/lib/enhanced-report-service"
import { toast } from "@/hooks/use-toast"
import { Loader2, Download } from "lucide-react"

export default function ReportsPage() {
  const [reportType, setReportType] = useState<string>("")
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: new Date(),
    to: addDays(new Date(), 20),
  })
  const [loading, setLoading] = useState(false)

  const handleGenerateReport = async () => {
    if (!reportType || !dateRange?.from || !dateRange?.to) {
      toast({
        title: "Missing Information",
        description: "Please select a report type and a date range.",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    try {
      const reportData = await generateReport(reportType, dateRange.from, dateRange.to)
      console.log("Generated Report Data:", reportData)
      toast({
        title: "Report Generated",
        description: `Successfully generated ${reportType} report.`,
      })
      // In a real application, you might trigger a download or display the report
    } catch (error) {
      console.error("Error generating report:", error)
      toast({
        title: "Error",
        description: `Failed to generate ${reportType} report.`,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Reports</h2>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Generate Reports</CardTitle>
          <CardDescription>Select report type and date range to generate insights.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <label htmlFor="reportType" className="text-sm font-medium">
              Report Type
            </label>
            <Select value={reportType} onValueChange={setReportType}>
              <SelectTrigger id="reportType" className="w-full">
                <SelectValue placeholder="Select a report type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="monthly_revenue">Monthly Revenue</SelectItem>
                <SelectItem value="task_completion">Task Completion</SelectItem>
                <SelectItem value="inventory_summary">Inventory Summary</SelectItem>
                <SelectItem value="line_status">Telephone Line Status</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <label htmlFor="dateRange" className="text-sm font-medium">
              Date Range
            </label>
            <DateRangePicker date={dateRange} setDate={setDateRange} />
          </div>

          <Button onClick={handleGenerateReport} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" /> Generate Report
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* You can add a section here to display generated reports or a list of past reports */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Reports</CardTitle>
          <CardDescription>View and download your recently generated reports.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">No recent reports to display. Generate one above!</p>
        </CardContent>
      </Card>
    </div>
  )
}
