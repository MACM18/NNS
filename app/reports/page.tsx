"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Download,
  FileText,
  CalendarIcon,
  TrendingUp,
  AlertTriangle,
  RefreshCw,
  BarChart3,
  FileSpreadsheet,
  FileImage,
} from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"

export default function ReportsPage() {
  const [dateRange, setDateRange] = useState<{
    from: Date | undefined
    to: Date | undefined
  }>({
    from: new Date(2024, 0, 1),
    to: new Date(),
  })
  const [exportFormat, setExportFormat] = useState("pdf")
  const [isGenerating, setIsGenerating] = useState(false)

  const reports = [
    {
      id: "material-usage",
      title: "Material Usage Per Line",
      description: "Detailed material consumption excluding rejected tasks",
      icon: BarChart3,
      color: "bg-blue-500",
    },
    {
      id: "daily-balance",
      title: "Daily Material Balance Sheet",
      description: "Previous balance, issued, usage, balance return",
      icon: FileSpreadsheet,
      color: "bg-green-500",
    },
    {
      id: "drum-numbers",
      title: "Drum Number Sheet",
      description: "Phone numbers with cable measurements and drum assignments",
      icon: FileText,
      color: "bg-purple-500",
    },
    {
      id: "material-balance",
      title: "Material Balance Sheet",
      description: "Opening balance, stock issue, wastage, in-hand, WIP material",
      icon: FileImage,
      color: "bg-orange-500",
    },
  ]

  const aiSuggestions = [
    {
      type: "dp-completion",
      title: "DP Auto-Completion",
      suggestions: [
        { dp: "DP-001-A", confidence: 95, reason: "Pattern match with nearby installations" },
        { dp: "DP-002-B", confidence: 87, reason: "Geographic clustering analysis" },
        { dp: "DP-003-C", confidence: 92, reason: "Historical data correlation" },
      ],
    },
    {
      type: "line-grouping",
      title: "Suggested Line Grouping",
      suggestions: [
        { group: "Sector A Lines", lines: ["L001", "L002", "L003"], efficiency: "+15%" },
        { group: "Sector B Lines", lines: ["L004", "L005"], efficiency: "+12%" },
      ],
    },
    {
      type: "error-detection",
      title: "Potential Issues",
      suggestions: [
        { issue: "High power reading on L007", severity: "high", action: "Immediate inspection required" },
        { issue: "Excessive wastage in Sector C", severity: "medium", action: "Review installation process" },
      ],
    },
  ]

  const handleGenerateReport = async (reportId: string) => {
    setIsGenerating(true)
    // Simulate report generation
    await new Promise((resolve) => setTimeout(resolve, 2000))
    setIsGenerating(false)

    // Trigger download based on format
    const filename = `${reportId}-${format(new Date(), "yyyy-MM-dd")}.${exportFormat}`
    console.log(`Generating ${filename}`)
  }

  const handleExportAll = async () => {
    setIsGenerating(true)
    await new Promise((resolve) => setTimeout(resolve, 3000))
    setIsGenerating(false)
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
          <TabsTrigger value="ai-insights">AI Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="reports" className="space-y-6">
          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle>Report Filters</CardTitle>
            </CardHeader>
            <CardContent className="flex gap-4">
              <div className="flex gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-[280px] justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateRange?.from ? (
                        dateRange.to ? (
                          <>
                            {format(dateRange.from, "LLL dd, y")} - {format(dateRange.to, "LLL dd, y")}
                          </>
                        ) : (
                          format(dateRange.from, "LLL dd, y")
                        )
                      ) : (
                        <span>Pick a date range</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      initialFocus
                      mode="range"
                      defaultMonth={dateRange?.from}
                      selected={dateRange}
                      onSelect={setDateRange}
                      numberOfMonths={2}
                    />
                  </PopoverContent>
                </Popover>
              </div>

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
            </CardContent>
          </Card>

          {/* Reports Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                  <Button onClick={() => handleGenerateReport(report.id)} disabled={isGenerating} className="w-full">
                    {isGenerating ? (
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Download className="mr-2 h-4 w-4" />
                    )}
                    Generate Report
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
                <CardTitle className="text-sm font-medium">Total Lines</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">1,234</div>
                <p className="text-xs text-muted-foreground">+12% from last month</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Material Usage</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">89.2%</div>
                <p className="text-xs text-muted-foreground">Efficiency rate</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Cost Savings</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">$12,450</div>
                <p className="text-xs text-muted-foreground">This month</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="ai-insights" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">AI-Powered Insights</h2>
            <Button variant="outline" size="sm">
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh Insights
            </Button>
          </div>

          <div className="space-y-6">
            {aiSuggestions.map((section, index) => (
              <Card key={index}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    {section.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {section.type === "dp-completion" &&
                    section.suggestions.map((suggestion: any, i: number) => (
                      <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <div className="font-medium">{suggestion.dp}</div>
                          <div className="text-sm text-muted-foreground">{suggestion.reason}</div>
                        </div>
                        <Badge variant="secondary">{suggestion.confidence}% confidence</Badge>
                      </div>
                    ))}

                  {section.type === "line-grouping" &&
                    section.suggestions.map((suggestion: any, i: number) => (
                      <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <div className="font-medium">{suggestion.group}</div>
                          <div className="text-sm text-muted-foreground">Lines: {suggestion.lines.join(", ")}</div>
                        </div>
                        <Badge variant="outline" className="text-green-600">
                          {suggestion.efficiency} efficiency
                        </Badge>
                      </div>
                    ))}

                  {section.type === "error-detection" &&
                    section.suggestions.map((suggestion: any, i: number) => (
                      <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-2">
                          <AlertTriangle
                            className={cn(
                              "h-4 w-4",
                              suggestion.severity === "high" ? "text-red-500" : "text-yellow-500",
                            )}
                          />
                          <div>
                            <div className="font-medium">{suggestion.issue}</div>
                            <div className="text-sm text-muted-foreground">{suggestion.action}</div>
                          </div>
                        </div>
                        <Badge variant={suggestion.severity === "high" ? "destructive" : "secondary"}>
                          {suggestion.severity}
                        </Badge>
                      </div>
                    ))}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
