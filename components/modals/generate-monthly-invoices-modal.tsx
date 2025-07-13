"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FileText, Download, Eye, Calendar } from "lucide-react";
import { getSupabaseClient } from "@/lib/supabase";
import { useNotification } from "@/contexts/notification-context";

interface GenerateMonthlyInvoicesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface LineDetail {
  id: string;
  name: string;
  phone_number: string;
  total_calc: number;
  date: string;
  address: string;
}

interface InvoicePreview {
  type: "A" | "B" | "C";
  percentage: number;
  lines: LineDetail[];
  totalAmount: number;
  invoiceNumber: string;
}

export function GenerateMonthlyInvoicesModal({
  open,
  onOpenChange,
  onSuccess,
}: GenerateMonthlyInvoicesModalProps) {
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState("");
  const [selectedYear, setSelectedYear] = useState(
    new Date().getFullYear().toString()
  );
  const [lineDetails, setLineDetails] = useState<LineDetail[]>([]);
  const [invoicePreviews, setInvoicePreviews] = useState<InvoicePreview[]>([]);
  const [companySettings, setCompanySettings] = useState<any>(null);

  const supabase = getSupabaseClient();
  const { addNotification } = useNotification();

  const months = [
    { value: "01", label: "January" },
    { value: "02", label: "February" },
    { value: "03", label: "March" },
    { value: "04", label: "April" },
    { value: "05", label: "May" },
    { value: "06", label: "June" },
    { value: "07", label: "July" },
    { value: "08", label: "August" },
    { value: "09", label: "September" },
    { value: "10", label: "October" },
    { value: "11", label: "November" },
    { value: "12", label: "December" },
  ];

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) =>
    (currentYear - 2 + i).toString()
  );

  useEffect(() => {
    if (open) {
      fetchCompanySettings();
      // Set default to current month
      const currentMonth = new Date().getMonth() + 1;
      setSelectedMonth(currentMonth.toString().padStart(2, "0"));
    }
  }, [open]);

  useEffect(() => {
    if (selectedMonth && selectedYear) {
      fetchLineDetails();
    }
  }, [selectedMonth, selectedYear]);

  const fetchCompanySettings = async () => {
    try {
      const { data, error } = await supabase
        .from("company_settings")
        .select("*")
        .single();

      if (error && error.code !== "PGRST116") {
        throw error;
      }
      let parsedData = data;
      if (parsedData && typeof parsedData.pricing_tiers === "string") {
        try {
          parsedData.pricing_tiers = JSON.parse(parsedData.pricing_tiers);
        } catch {
          parsedData.pricing_tiers = [];
        }
      }
      setCompanySettings(parsedData);
    } catch (error) {
      console.error("Error fetching company settings:", error);
    }
  };

  const fetchLineDetails = async () => {
    setLoading(true);
    try {
      const startDate = `${selectedYear}-${selectedMonth}-01`;
      const lastDay = new Date(
        Number(selectedYear),
        Number(selectedMonth),
        0
      ).getDate();
      const endDate = `${selectedYear}-${selectedMonth}-${lastDay
        .toString()
        .padStart(2, "0")}`;

      const { data, error } = await supabase
        .from("line_details")
        .select("id, name, phone_number, total_calc, date, address")
        .gte("date", startDate)
        .lte("date", endDate)
        .not("telephone_no", "is", null)
        .not("total_cable", "is", null)
        .gt("total_cable", -1)
        .order("date");

      if (error) throw error;

      setLineDetails(data || []);
      generateInvoicePreviews(data || []);
    } catch (error: any) {
      addNotification({
        title: "Error",
        message: "Failed to fetch line details",
        type: "error",
        category: "system",
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateRate = (cableLength: number): number => {
    if (
      !companySettings?.pricing_tiers ||
      !Array.isArray(companySettings.pricing_tiers)
    ) {
      // Default pricing if no settings
      if (cableLength <= 100) return 6000;
      if (cableLength <= 200) return 6500;
      if (cableLength <= 300) return 7200;
      if (cableLength <= 400) return 7800;
      if (cableLength <= 500) return 8200;
      return 8400;
    }

    const tier = companySettings.pricing_tiers.find(
      (t: any) => cableLength >= t.min_length && cableLength <= t.max_length
    );

    return tier ? tier.rate : 8400;
  };

  const generateInvoicePreviews = (lines: LineDetail[]) => {
    if (lines.length === 0) {
      setInvoicePreviews([]);
      return;
    }

    // Calculate total amount for all lines
    const totalAmount = lines.reduce(
      (sum, line) => sum + calculateRate(line.total_calc),
      0
    );

    // Generate invoice numbers
    const monthName =
      months.find((m) => m.value === selectedMonth)?.label || "Unknown";
    const baseInvoiceNumber = `S/Southern/HR/NC/${selectedYear.slice(
      -2
    )}/${monthName}`;

    // Always generate 3 invoices: A (90%), B (5%), C (5%)
    const previews: InvoicePreview[] = [
      {
        type: "A" as const,
        percentage: 90,
        lines: lines, // All lines
        totalAmount: Math.round(totalAmount * 0.9),
        invoiceNumber: `${baseInvoiceNumber}/A`,
      },
      {
        type: "B" as const,
        percentage: 5,
        lines: lines, // All lines
        totalAmount: Math.round(totalAmount * 0.05),
        invoiceNumber: `${baseInvoiceNumber}/B`,
      },
      {
        type: "C" as const,
        percentage: 5,
        lines: lines, // All lines
        totalAmount:
          totalAmount -
          Math.round(totalAmount * 0.9) -
          Math.round(totalAmount * 0.05), // Remainder to ensure 100%
        invoiceNumber: `${baseInvoiceNumber}/C`,
      },
    ];

    setInvoicePreviews(previews);
  };

  const generateInvoiceNumber = (type: "A" | "B" | "C"): string => {
    const monthName =
      months.find((m) => m.value === selectedMonth)?.label || "Unknown";
    return `S/Southern/HR/NC/${selectedYear.slice(-2)}/${monthName}/${type}`;
  };

  const getInvoiceDate = (): string => {
    // Invoice date is always 2nd of next month
    const nextMonth = Number.parseInt(selectedMonth) + 1;
    const nextYear =
      nextMonth > 12
        ? Number.parseInt(selectedYear) + 1
        : Number.parseInt(selectedYear);
    const adjustedMonth = nextMonth > 12 ? 1 : nextMonth;

    return `${nextYear}-${adjustedMonth.toString().padStart(2, "0")}-02`;
  };

  const handleGenerateInvoices = async () => {
    setGenerating(true);
    try {
      const invoiceDate = getInvoiceDate();
      const jobMonth = `${
        months.find((m) => m.value === selectedMonth)?.label
      } ${selectedYear}`;

      // Delete any existing invoices for this month/year/type before inserting new ones
      for (const preview of invoicePreviews) {
        // Remove existing invoice if present
        await supabase
          .from("generated_invoices")
          .delete()
          .eq("invoice_number", preview.invoiceNumber)
          .eq("month", Number.parseInt(selectedMonth))
          .eq("year", Number.parseInt(selectedYear));

        // Create generated invoice record
        const invoiceData = {
          invoice_number: preview.invoiceNumber,
          invoice_type: preview.type,
          month: Number.parseInt(selectedMonth),
          year: Number.parseInt(selectedYear),
          job_month: jobMonth,
          invoice_date: invoiceDate,
          total_amount: preview.totalAmount,
          line_count: preview.lines.length,
          line_details_ids: preview.lines.map((line) => line.id),
          status: "generated",
        };

        const { error } = await supabase
          .from("generated_invoices")
          .insert([invoiceData]);
        if (error) throw error;
      }

      addNotification({
        title: "Success",
        message: `Generated ${invoicePreviews.length} invoices for ${
          months.find((m) => m.value === selectedMonth)?.label
        } ${selectedYear}`,
        type: "success",
        category: "invoice_generated",
      });

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      addNotification({
        title: "Error",
        message: error.message,
        type: "error",
        category: "system",
      });
    } finally {
      setGenerating(false);
    }
  };

  const handlePreviewInvoice = (preview: InvoicePreview) => {
    // This would open a PDF preview modal
    addNotification({
      title: "Preview",
      message: `Opening preview for Invoice ${preview.type}`,
      type: "info",
      category: "system",
    });
  };

  const handleDownloadInvoice = (preview: InvoicePreview) => {
    // This would generate and download the PDF
    addNotification({
      title: "Download",
      message: `Downloading Invoice ${preview.type}`,
      type: "info",
      category: "system",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-w-6xl max-h-[95vh] overflow-y-auto'>
        <DialogHeader>
          <DialogTitle>Generate Monthly Invoices</DialogTitle>
          <DialogDescription>
            Generate 3 monthly invoices (A=90%, B=5%, C=5%) based on completed
            line installations.
          </DialogDescription>
        </DialogHeader>

        <div className='space-y-6'>
          {/* Month/Year Selection */}
          <Card>
            <CardHeader>
              <CardTitle className='flex items-center gap-2'>
                <Calendar className='h-5 w-5' />
                Select Month & Year
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className='grid grid-cols-2 gap-4'>
                <div>
                  <Label>Month</Label>
                  <Select
                    value={selectedMonth}
                    onValueChange={setSelectedMonth}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder='Select month' />
                    </SelectTrigger>
                    <SelectContent>
                      {months.map((month) => (
                        <SelectItem key={month.value} value={month.value}>
                          {month.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Year</Label>
                  <Select value={selectedYear} onValueChange={setSelectedYear}>
                    <SelectTrigger>
                      <SelectValue placeholder='Select year' />
                    </SelectTrigger>
                    <SelectContent>
                      {years.map((year) => (
                        <SelectItem key={year} value={year}>
                          {year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Summary */}
          {lineDetails.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
                  <div>
                    <Label className='text-sm text-muted-foreground'>
                      Total Lines
                    </Label>
                    <div className='text-2xl font-bold'>
                      {lineDetails.length}
                    </div>
                  </div>
                  <div>
                    <Label className='text-sm text-muted-foreground'>
                      Total Amount
                    </Label>
                    <div className='text-2xl font-bold'>
                      LKR{" "}
                      {lineDetails
                        .reduce(
                          (sum, line) => sum + calculateRate(line.total_calc),
                          0
                        )
                        .toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <Label className='text-sm text-muted-foreground'>
                      Invoice Date
                    </Label>
                    <div className='text-lg font-medium'>
                      {new Date(getInvoiceDate()).toLocaleDateString()}
                    </div>
                  </div>
                  <div>
                    <Label className='text-sm text-muted-foreground'>
                      Job Month
                    </Label>
                    <div className='text-lg font-medium'>
                      {months.find((m) => m.value === selectedMonth)?.label}{" "}
                      {selectedYear}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Invoice Previews */}
          {invoicePreviews.length > 0 && (
            <div className='space-y-4'>
              <h3 className='text-lg font-medium'>Invoice Breakdown</h3>
              {invoicePreviews.map((preview) => (
                <Card key={preview.type}>
                  <CardHeader>
                    <CardTitle className='flex items-center justify-between'>
                      <div className='flex items-center gap-2'>
                        <Badge
                          variant={
                            preview.type === "A" ? "default" : "secondary"
                          }
                        >
                          Invoice {preview.type}
                        </Badge>
                        <span className='text-sm text-muted-foreground'>
                          {preview.percentage}% • {preview.lines.length} lines •
                          LKR {preview.totalAmount.toLocaleString()}
                        </span>
                      </div>
                      <div className='flex gap-2'>
                        <Button
                          size='sm'
                          variant='outline'
                          onClick={() => handlePreviewInvoice(preview)}
                        >
                          <Eye className='h-4 w-4' />
                        </Button>
                        <Button
                          size='sm'
                          variant='outline'
                          onClick={() => handleDownloadInvoice(preview)}
                        >
                          <Download className='h-4 w-4' />
                        </Button>
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className='space-y-2'>
                      <div className='text-sm font-medium'>
                        Invoice Number: {preview.invoiceNumber}
                      </div>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Customer</TableHead>
                            <TableHead>Phone</TableHead>
                            <TableHead>Cable Length</TableHead>
                            <TableHead>Rate</TableHead>
                            <TableHead>Amount</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {preview.lines.slice(0, 5).map((line) => (
                            <TableRow key={line.id}>
                              <TableCell>{line.name}</TableCell>
                              <TableCell>{line.phone_number}</TableCell>
                              <TableCell>
                                {line.total_calc.toFixed(2)}m
                              </TableCell>
                              <TableCell>
                                LKR{" "}
                                {calculateRate(
                                  line.total_calc
                                ).toLocaleString()}
                              </TableCell>
                              <TableCell>
                                LKR{" "}
                                {calculateRate(
                                  line.total_calc
                                ).toLocaleString()}
                              </TableCell>
                            </TableRow>
                          ))}
                          {preview.lines.length > 5 && (
                            <TableRow>
                              <TableCell
                                colSpan={5}
                                className='text-center text-muted-foreground'
                              >
                                ... and {preview.lines.length - 5} more lines
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {loading && (
            <div className='text-center py-8'>
              <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto'></div>
              <p className='mt-2 text-sm text-muted-foreground'>
                Loading line details...
              </p>
            </div>
          )}

          {!loading &&
            lineDetails.length === 0 &&
            selectedMonth &&
            selectedYear && (
              <div className='text-center py-8'>
                <FileText className='h-12 w-12 mx-auto mb-4 opacity-50' />
                <p className='text-muted-foreground'>
                  No completed line installations found for{" "}
                  {months.find((m) => m.value === selectedMonth)?.label}{" "}
                  {selectedYear}
                </p>
              </div>
            )}
        </div>

        <DialogFooter>
          <Button
            type='button'
            variant='outline'
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            onClick={handleGenerateInvoices}
            disabled={generating || invoicePreviews.length === 0}
            className='gap-2'
          >
            {generating ? (
              <>
                <div className='animate-spin rounded-full h-4 w-4 border-b-2 border-white'></div>
                Generating...
              </>
            ) : (
              <>
                <FileText className='h-4 w-4' />
                Generate {invoicePreviews.length} Invoices
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
