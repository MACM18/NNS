"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MonthYearPicker } from "@/components/ui/month-year-picker";
import {
  Download,
  FileText,
  RefreshCw,
  BarChart3,
  FileSpreadsheet,
  FileImage,
  Clock,
  CheckCircle,
} from "lucide-react";
import { format as formatDate } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useNotification } from "@/contexts/notification-context";
import { NotificationService } from "@/lib/notification-service";
import {
  enhancedReportService,
  type ReportOptions,
} from "@/lib/enhanced-report-service";

export default function ReportsPage() {
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [exportFormat, setExportFormat] = useState<"pdf" | "csv" | "xlsx">(
    "pdf"
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const [autoGenerate, setAutoGenerate] = useState(true);
  const [generatingReports, setGeneratingReports] = useState<Set<string>>(
    new Set()
  );
  const { addNotification } = useNotification();

  const reports = [
    {
      id: "drum-numbers",
      title: "Drum Number Sheet",
      description: "Phone numbers with cable measurements and drum assignments",
      icon: FileText,
      color: "bg-purple-500",
      generator: enhancedReportService.generateDrumNumberReport.bind(
        enhancedReportService
      ),
    },
    {
      id: "material-balance",
      title: "Material Balance Sheet",
      description:
        "Opening balance, stock issue, wastage, in-hand, WIP material",
      icon: FileImage,
      color: "bg-orange-500",
      generator: enhancedReportService.generateMaterialBalanceReport.bind(
        enhancedReportService
      ),
    },
    {
      id: "daily-balance",
      title: "Daily Material Balance Sheet",
      description: "Previous balance, issued, usage, balance return",
      icon: FileSpreadsheet,
      color: "bg-green-500",
      generator: enhancedReportService.generateDailyMaterialBalanceReport.bind(
        enhancedReportService
      ),
    },
    {
      id: "new-connection",
      title: "New Connection Material Sheet",
      description: "FTTH installation details with material breakdown",
      icon: BarChart3,
      color: "bg-indigo-500",
      generator: enhancedReportService.generateNewConnectionReport.bind(
        enhancedReportService
      ),
    },
  ];

  const handleGenerateReport = async (reportId: string) => {
    setGeneratingReports((prev) => new Set(prev).add(reportId));
    try {
      const report = reports.find((r) => r.id === reportId);
      if (!report) {
        toast.error("Report not found");
        return;
      }

      const options: ReportOptions = {
        format: exportFormat,
        month: selectedMonth,
      };

      const reportData = await report.generator(options);

      if (reportData) {
        downloadReport(reportData, reportId, exportFormat);
        toast.success("Report generated successfully!");

        // Create notification for report generation
        await NotificationService.createReportReadyNotification(
          report.title,
          formatDate(selectedMonth, "MMMM yyyy")
        );
      } else {
        toast.error("Failed to generate report");
      }
    } catch (error) {
      console.error("Error generating report:", error);
      toast.error("Error generating report");
    } finally {
      setGeneratingReports((prev) => {
        const newSet = new Set(prev);
        newSet.delete(reportId);
        return newSet;
      });
    }
  };

  const downloadReport = (
    reportData: any,
    reportId: string,
    exportType: string
  ) => {
    const filename = `${reportId}-${formatDate(
      selectedMonth,
      "yyyy-MM"
    )}.${exportType}`;

    if (exportType === "pdf" && reportData.html) {
      // Create a new window for PDF generation
      const printWindow = window.open("", "_blank");
      if (printWindow) {
        printWindow.document.write(reportData.html);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
          printWindow.print();
        }, 250);
      }
    } else {
      // Download CSV/Excel
      let content = "";
      let mimeType = "";

      if (exportType === "csv") {
        content = reportData;
        mimeType = "text/csv;charset=utf-8;";
      } else if (exportType === "xlsx") {
        // For Excel, we'll use CSV format for now
        // In production, you would use a library like xlsx
        content =
          typeof reportData === "string"
            ? reportData
            : JSON.stringify(reportData, null, 2);
        mimeType =
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;";
      }

      const blob = new Blob([content], { type: mimeType });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", filename);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleExportAll = async () => {
    setIsGenerating(true);
    try {
      for (const report of reports) {
        await handleGenerateReport(report.id);
        // Add delay between reports
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
      toast.success("All reports generated successfully!");
    } catch (error) {
      toast.error("Error generating reports");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className='container mx-auto p-6 space-y-6'>
      <div className='flex justify-between items-center'>
        <div>
          <h1 className='text-3xl font-bold'>Reports & Analytics</h1>
          <p className='text-muted-foreground'>
            Generate monthly reports with professional templates
          </p>
        </div>
        <Button onClick={handleExportAll} disabled={isGenerating}>
          {isGenerating ? (
            <RefreshCw className='mr-2 h-4 w-4 animate-spin' />
          ) : (
            <Download className='mr-2 h-4 w-4' />
          )}
          Export All
        </Button>
      </div>

      <Tabs defaultValue='reports' className='space-y-6'>
        <TabsList>
          <TabsTrigger value='reports'>Monthly Reports</TabsTrigger>
          <TabsTrigger value='analytics'>Analytics</TabsTrigger>
          <TabsTrigger value='settings'>Settings</TabsTrigger>
        </TabsList>

        <TabsContent value='reports' className='space-y-6'>
          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle>Report Configuration</CardTitle>
            </CardHeader>
            <CardContent className='flex gap-4 items-center'>
              <div>
                <label className='text-sm font-medium mb-2 block'>
                  Select Month
                </label>
                <MonthYearPicker
                  date={selectedMonth}
                  onDateChange={setSelectedMonth}
                />
              </div>

              <div>
                <label className='text-sm font-medium mb-2 block'>
                  Export Format
                </label>
                <Select
                  value={exportFormat}
                  onValueChange={(value: "pdf" | "csv" | "xlsx") =>
                    setExportFormat(value)
                  }
                >
                  <SelectTrigger className='w-[180px]'>
                    <SelectValue placeholder='Export format' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='pdf'>PDF</SelectItem>
                    <SelectItem value='csv'>CSV</SelectItem>
                    <SelectItem value='xlsx'>Excel</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className='flex items-center space-x-2'>
                <input
                  type='checkbox'
                  id='auto-generate'
                  checked={autoGenerate}
                  onChange={(e) => setAutoGenerate(e.target.checked)}
                />
                <label htmlFor='auto-generate' className='text-sm font-medium'>
                  Auto-generate for current month
                </label>
              </div>
            </CardContent>
          </Card>

          {/* Reports Grid */}
          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6'>
            {reports.map((report) => (
              <Card key={report.id}>
                <CardHeader>
                  <div className='flex items-center gap-3'>
                    <div className={cn("p-2 rounded-lg", report.color)}>
                      <report.icon className='h-5 w-5 text-white' />
                    </div>
                    <div>
                      <CardTitle className='text-lg'>{report.title}</CardTitle>
                      <CardDescription>{report.description}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <Button
                    onClick={() => handleGenerateReport(report.id)}
                    disabled={generatingReports.has(report.id) || isGenerating}
                    className='w-full'
                  >
                    {generatingReports.has(report.id) ? (
                      <RefreshCw className='mr-2 h-4 w-4 animate-spin' />
                    ) : (
                      <Download className='mr-2 h-4 w-4' />
                    )}
                    Generate{" "}
                    {exportFormat.toUpperCase() === "XLSX"
                      ? "Excel"
                      : exportFormat.toUpperCase()}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value='analytics' className='space-y-6'>
          <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
            <Card>
              <CardHeader>
                <CardTitle className='text-sm font-medium'>
                  Reports Generated
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className='text-2xl font-bold'>24</div>
                <p className='text-xs text-muted-foreground'>This month</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className='text-sm font-medium'>
                  Auto-Generation
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className='flex items-center gap-2'>
                  <CheckCircle className='h-5 w-5 text-green-500' />
                  <span className='text-sm'>Active</span>
                </div>
                <p className='text-xs text-muted-foreground'>
                  Next: {formatDate(new Date(), "MMM dd")}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className='text-sm font-medium'>
                  Storage Used
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className='text-2xl font-bold'>2.4 GB</div>
                <p className='text-xs text-muted-foreground'>Report archives</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value='settings' className='space-y-6'>
          <Card>
            <CardHeader>
              <CardTitle>Report Generation Settings</CardTitle>
            </CardHeader>
            <CardContent className='space-y-4'>
              <div className='flex items-center justify-between'>
                <div>
                  <h4 className='font-medium'>Automatic Monthly Generation</h4>
                  <p className='text-sm text-muted-foreground'>
                    Generate all reports automatically on the 1st of each month
                  </p>
                </div>
                <input
                  type='checkbox'
                  checked={autoGenerate}
                  onChange={(e) => setAutoGenerate(e.target.checked)}
                />
              </div>

              <div>
                <h4 className='font-medium mb-2'>Default Export Format</h4>
                <Select
                  value={exportFormat}
                  onValueChange={(value: "pdf" | "csv" | "xlsx") =>
                    setExportFormat(value)
                  }
                >
                  <SelectTrigger className='w-[200px]'>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='pdf'>PDF</SelectItem>
                    <SelectItem value='csv'>CSV</SelectItem>
                    <SelectItem value='xlsx'>Excel</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className='pt-4'>
                <Button variant='outline'>
                  <Clock className='mr-2 h-4 w-4' />
                  Schedule Reports
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
