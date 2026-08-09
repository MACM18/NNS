"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Download } from "lucide-react";
import { useNotification } from "@/contexts/notification-context";

interface GeneratedInvoice {
  id: string;
  invoice_number: string;
  invoice_type: "A" | "B";
  month: number;
  year: number;
  job_month: string;
  invoice_date: string;
  total_amount: number;
  line_count: number;
  line_details_ids: string[];
  line_details_snapshot?: Array<{
    lineId: string;
    customerName: string;
    telephoneNo: string;
    address: string;
    serviceDate: string;
    cableLength: number;
    baseRate: number;
    invoiceAmount: number;
  }> | null;
  pricing_snapshot?: unknown;
  status: string;
  created_at: string;
}

interface InvoicePDFModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: GeneratedInvoice | null;
}

interface LineDetail {
  id: string;
  name: string;
  phone_number: string;
  total_cable: number;
  date: string;
  address: string;
  base_rate?: number | null;
  invoice_amount?: number | null;
}

interface CompanySettings {
  company_name: string;
  address: string;
  contact_numbers: string[];
  website: string;
  registered_number: string;
  bank_details: {
    bank_name: string;
    account_title: string;
    account_number: string;
    branch_code: string;
  };
  pricing_tiers: Array<{
    min_length: number;
    max_length: number;
    rate: number;
  }>;
}

export function InvoicePDFModal({
  open,
  onOpenChange,
  invoice,
}: InvoicePDFModalProps) {
  const [loading, setLoading] = useState(false);
  const [lineDetails, setLineDetails] = useState<LineDetail[]>([]);
  const [companySettings, setCompanySettings] =
    useState<CompanySettings | null>(null);

  const { addNotification } = useNotification();

  useEffect(() => {
    if (open && invoice) {
      fetchInvoiceData();
    }
  }, [open, invoice]);

  const fetchInvoiceData = async () => {
    if (!invoice) return;

    setLoading(true);
    try {
      let lines: LineDetail[] = [];
      if (Array.isArray(invoice.line_details_snapshot) && invoice.line_details_snapshot.length > 0) {
        lines = invoice.line_details_snapshot.map((line) => ({
          id: line.lineId,
          name: line.customerName,
          phone_number: line.telephoneNo,
          total_cable: line.cableLength,
          date: line.serviceDate,
          address: line.address,
          base_rate: line.baseRate,
          invoice_amount: line.invoiceAmount,
        }));
      } else if (Array.isArray(invoice.line_details_ids) && invoice.line_details_ids.length > 0) {
        // Legacy invoices may still show current operational line details, but
        // never invent a historical rate from today's pricing.
        const linesResponse = await fetch("/api/lines/by-ids", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids: invoice.line_details_ids }),
        });
        if (!linesResponse.ok) throw new Error("Failed to fetch line details");
        const linesData = await linesResponse.json();
        lines = (linesData.data || []).map((line: LineDetail) => ({ ...line, base_rate: null, invoice_amount: null }));
      }

      // Fetch company settings
      const settingsResponse = await fetch("/api/settings/company");
      let settings = null;

      if (settingsResponse.ok) {
        const settingsData = await settingsResponse.json();
        settings = settingsData.data;
      }

      setLineDetails(lines as LineDetail[]);

      if (settings) {
        setCompanySettings(settings as CompanySettings);
      } else {
        setCompanySettings(getDefaultCompanySettings());
      }
      setLineDetails(lines);
    } catch (error: any) {
      console.error("Error fetching invoice data:", error);
      addNotification({
        title: "Error",
        message: "Failed to load invoice data",
        type: "error",
        category: "system",
      });
    } finally {
      setLoading(false);
    }
  };

  const getDefaultCompanySettings = (): CompanySettings => ({
    company_name: "NNS Enterprise",
    address: "No 89, Welikala, Pokunuwita",
    contact_numbers: ["0789070440", "0724918351", "0942263642"],
    website: "nns.lk",
    registered_number: "SLTS-OSP-2023-170",
    bank_details: {
      bank_name: "",
      account_title: "",
      account_number: "",
      branch_code: "",
    },
    pricing_tiers: [],
  });

  const groupLinesByRate = () => {
    const groups: {
      [key: string]: { count: number; rate: number | null; amount: number | null };
    } = {};

    lineDetails.forEach((line) => {
      const rate = line.base_rate == null ? 0 : Number(line.base_rate);
      let rangeKey = "";

      if (line.base_rate == null) rangeKey = "Historical rate unavailable";
      else if (line.total_cable <= 100) rangeKey = "0-100";
      else if (line.total_cable <= 200) rangeKey = "101-200";
      else if (line.total_cable <= 300) rangeKey = "201-300";
      else if (line.total_cable <= 400) rangeKey = "301-400";
      else if (line.total_cable <= 500) rangeKey = "401-500";
      else rangeKey = "Over 500";

      if (!groups[rangeKey]) {
        groups[rangeKey] = { count: 0, rate: line.base_rate == null ? null : rate, amount: line.invoice_amount == null ? null : 0 };
      }

      groups[rangeKey].count += 1;
      if (line.invoice_amount != null) groups[rangeKey].amount = (groups[rangeKey].amount || 0) + Number(line.invoice_amount);
    });

    return groups;
  };

  const handleDownload = () => {
    if (!invoice || !companySettings) return;

    // Generate PDF content
    const pdfContent = generatePDFContent();

    // Create and download PDF
    const element = document.createElement("a");
    const file = new Blob([pdfContent], { type: "text/html" });
    element.href = URL.createObjectURL(file);
    element.download = `${invoice.invoice_number.replace(/\//g, "_")}.html`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);

    addNotification({
      title: "Download Started",
      message: `Invoice ${invoice.invoice_number} downloaded`,
      type: "success",
      category: "invoice_generated",
    });
  };

  const generatePDFContent = () => {
    if (!invoice || !companySettings) return "";

    const groupedLines = groupLinesByRate();
    const totalAmount = invoice.total_amount;

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Invoice ${invoice.invoice_number}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { text-align: center; margin-bottom: 20px; }
        .invoice-details { display: flex; justify-content: space-between; margin-bottom: 20px; }
        .bill-to { margin-bottom: 20px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        th, td { border: 1px solid #000; padding: 8px; text-align: left; }
        th { background-color: #f0f0f0; }
        .amount { text-align: right; }
        .total-row { font-weight: bold; }
        .signatures { display: flex; justify-content: space-between; margin-top: 30px; }
        .company-info { margin-top: 20px; }
    </style>
</head>
<body>
    <div class="bill-to">
        <strong>Bill to:</strong><br>
        Sri Lanka Telecom (Services) Limited<br>
        OSP Division, 50/21, Gamunupura.<br>
        Kothalawala, Kaduwela.
    </div>
    
    <div class="invoice-details">
        <div>
            <strong>Invoice Number:</strong> ${invoice.invoice_number}<br>
            <strong>Registered Number:</strong> ${
              companySettings.registered_number
            }<br>
            <strong>Invoice Date:</strong> ${new Date(
              invoice.invoice_date
            ).toLocaleDateString()}<br>
            <strong>Job Related Month:</strong> ${invoice.job_month}<br>
            <strong>Invoice:</strong> ${invoice.invoice_type}
        </div>
    </div>

    <table>
        <thead>
            <tr>
                <th>Ser.No</th>
                <th>Description</th>
                <th>RTO</th>
                <th>M</th>
                <th>Qty</th>
                <th>Unit Rate</th>
                <th>Amount</th>
            </tr>
        </thead>
        <tbody>
            ${Object.entries(groupedLines)
              .map(
                ([range, data], index) => `
                <tr>
                    <td>${index + 1}</td>
                    <td>FTTH Wirings-DW Length- (${range})</td>
                    <td></td>
                    <td></td>
                    <td>${data.count}</td>
                    <td>${Number(data.rate || 0).toLocaleString()}.00</td>
                    <td class="amount">${data.amount == null ? "—" : `${Number(data.amount).toLocaleString()}.00`}</td>
                </tr>
            `
              )
              .join("")}
            <tr>
                <td>7</td>
                <td>5.6m Pole Installations</td>
                <td></td>
                <td></td>
                <td>0</td>
                <td>700.00</td>
                <td class="amount">-</td>
            </tr>
            <tr>
                <td>8</td>
                <td>6.7m Pole Installations</td>
                <td></td>
                <td></td>
                <td>0</td>
                <td>800.00</td>
                <td class="amount">-</td>
            </tr>
            <tr class="total-row">
                <td colspan="6"><strong>Grand Total (Rs.)</strong></td>
                <td class="amount"><strong>${Number(
                  totalAmount || 0
                ).toLocaleString()}.00</strong></td>
            </tr>
        </tbody>
    </table>

    <p><em>I do hereby certify that the above details are true and correct</em></p>

    <div class="signatures">
        <div>
            <strong>Prepared By:</strong><br>
            ${companySettings.company_name}<br><br>
            Account No: ${companySettings.bank_details.account_number}<br>
            Bank: ${companySettings.bank_details.bank_name}<br>
            Branch: ${companySettings.bank_details.branch_code}
        </div>
        <div>
            <strong>Received By: (Sign/Date)</strong><br>
            Should be Sign by SLTS officer<br><br>
            <strong>SLTS Use Only:</strong><br>
            Regional Signature: ___________<br>
            Finance: ___________
        </div>
    </div>

    <div style="margin-top: 20px;">
        <div style="display: flex; justify-content: space-between;">
            <div>
                Checked by: ___________<br>
                Certified By: ___________<br>
                Approved By: ___________
            </div>
            <div>
                <strong>Office Use Only</strong> Yes/No<br>
                Material Balance Sheet's received: Yes<br>
                Sign/Date: ___________
            </div>
        </div>
    </div>

    <div class="company-info">
        <p><strong>Cheque should be drawn in favour of "${
          companySettings.bank_details.account_title
        }"</strong></p>
        <p><strong>${companySettings.company_name}</strong><br>
        ${companySettings.address}<br>
        Contact Number: ${companySettings.contact_numbers.join(" - ")}</p>
        <p>Recommended By: ___________<br>
        Head Office Signature: ___________</p>
    </div>
</body>
</html>
    `;
  };

  if (!invoice) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-w-4xl max-h-[90vh] overflow-y-auto'>
        <DialogHeader>
          <DialogTitle>Invoice Preview</DialogTitle>
          <DialogDescription>
            Preview and download invoice {invoice.invoice_number}
          </DialogDescription>
        </DialogHeader>

        <div className='space-y-4'>
          {loading ? (
            <div className='text-center py-8'>
              <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto'></div>
              <p className='mt-2 text-sm text-muted-foreground'>
                Loading invoice data...
              </p>
            </div>
          ) : (
            <div className='border rounded-lg p-6 bg-white'>
              <div className='space-y-4'>
                <div className='flex justify-between items-start'>
                  <div>
                    <h3 className='font-bold text-lg'>Bill to:</h3>
                    <p>Sri Lanka Telecom (Services) Limited</p>
                    <p>OSP Division, 50/21, Gamunupura.</p>
                    <p>Kothalawala, Kaduwela.</p>
                  </div>
                  <div className='text-right'>
                    <p>
                      <strong>Invoice Number:</strong> {invoice.invoice_number}
                    </p>
                    <p>
                      <strong>Registered Number:</strong>{" "}
                      {companySettings?.registered_number}
                    </p>
                    <p>
                      <strong>Invoice Date:</strong>{" "}
                      {new Date(invoice.invoice_date).toLocaleDateString()}
                    </p>
                    <p>
                      <strong>Job Related Month:</strong> {invoice.job_month}
                    </p>
                    <p>
                      <strong>Invoice:</strong> {invoice.invoice_type}
                    </p>
                  </div>
                </div>

                <div className='mt-6'>
                  <table className='w-full border-collapse border border-gray-300'>
                    <thead>
                      <tr className='bg-gray-100'>
                        <th className='border border-gray-300 p-2'>Ser.No</th>
                        <th className='border border-gray-300 p-2'>
                          Description
                        </th>
                        <th className='border border-gray-300 p-2'>Qty</th>
                        <th className='border border-gray-300 p-2'>
                          Unit Rate
                        </th>
                        <th className='border border-gray-300 p-2'>Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(groupLinesByRate()).map(
                        ([range, data], index) => (
                          <tr key={range}>
                            <td className='border border-gray-300 p-2'>
                              {index + 1}
                            </td>
                            <td className='border border-gray-300 p-2'>
                              FTTH Wirings-DW Length- ({range})
                            </td>
                            <td className='border border-gray-300 p-2'>
                              {data.count}
                            </td>
                            <td className='border border-gray-300 p-2'>
                              {data.rate == null ? "—" : `${Number(data.rate).toLocaleString()}.00`}
                            </td>
                            <td className='border border-gray-300 p-2 text-right'>
                              {data.amount == null ? "—" : `${Number(data.amount).toLocaleString()}.00`}
                            </td>
                          </tr>
                        )
                      )}
                      <tr className='font-bold'>
                        <td className='border border-gray-300 p-2' colSpan={4}>
                          Grand Total (Rs.)
                        </td>
                        <td className='border border-gray-300 p-2 text-right'>
                          {Number(invoice.total_amount || 0).toLocaleString()}
                          .00
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className='mt-6 text-sm'>
                  <p className='italic'>
                    I do hereby certify that the above details are true and
                    correct
                  </p>

                  <div className='mt-4 grid grid-cols-2 gap-8'>
                    <div>
                      <p>
                        <strong>Prepared By:</strong>
                      </p>
                      <p>{companySettings?.company_name}</p>
                      <p>
                        Account No:{" "}
                        {companySettings?.bank_details.account_number}
                      </p>
                      <p>Bank: {companySettings?.bank_details.bank_name}</p>
                      <p>Branch: {companySettings?.bank_details.branch_code}</p>
                    </div>
                    <div>
                      <p>
                        <strong>Received By: (Sign/Date)</strong>
                      </p>
                      <p>Should be Sign by SLTS officer</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            type='button'
            variant='outline'
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
          <Button onClick={handleDownload} disabled={loading} className='gap-2'>
            <Download className='h-4 w-4' />
            Download PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
