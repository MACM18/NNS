"use client";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface InvoiceData {
  invoiceNumber: string;
  invoiceType: "A" | "B";
  invoiceDate: string;
  jobMonth: string;
  lines: Array<{
    id: string;
    name: string;
    phone_number: string;
    address: string;
    total_cable: number;
    date: string;
  }>;
  totalAmount: number;
  companySettings: {
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
      iban: string;
    };
  };
  pricingTiers: Array<{
    min_length: number;
    max_length: number;
    rate: number;
  }>;
}

interface InvoicePDFTemplateProps {
  data: InvoiceData;
}

export function InvoicePDFTemplate({ data }: InvoicePDFTemplateProps) {
  const calculateRate = (cableLength: number): number => {
    const tier = data.pricingTiers.find(
      (t) => cableLength >= t.min_length && cableLength <= t.max_length
    );
    return tier ? tier.rate : 8400;
  };

  const formatCurrency = (amount: number): string => {
    return `LKR ${Number(amount || 0).toLocaleString()}`;
  };

  return (
    <div
      className='max-w-4xl mx-auto p-8 bg-white text-black'
      style={{ fontFamily: "Arial, sans-serif" }}
    >
      {/* Header */}
      <div className='flex justify-between items-start mb-8'>
        <div>
          <h1 className='text-3xl font-bold text-blue-600'>
            {data.companySettings.company_name}
          </h1>
          <div className='mt-2 text-sm'>
            <p>{data.companySettings.address}</p>
            <p>
              Tel: {data.companySettings.contact_numbers.join(", ")} | Web:{" "}
              {data.companySettings.website}
            </p>
            {data.companySettings.registered_number && (
              <p>Reg. No: {data.companySettings.registered_number}</p>
            )}
          </div>
        </div>
        <div className='text-right'>
          <h2 className='text-2xl font-bold'>INVOICE</h2>
          <Badge
            variant={data.invoiceType === "A" ? "default" : "secondary"}
            className='mt-2'
          >
            Type {data.invoiceType}
          </Badge>
        </div>
      </div>

      <Separator className='mb-6' />

      {/* Invoice Details */}
      <div className='grid grid-cols-2 gap-8 mb-8'>
        <div>
          <h3 className='font-semibold mb-2'>Invoice Details</h3>
          <div className='space-y-1 text-sm'>
            <p>
              <span className='font-medium'>Invoice No:</span>{" "}
              {data.invoiceNumber}
            </p>
            <p>
              <span className='font-medium'>Invoice Date:</span>{" "}
              {new Date(data.invoiceDate).toLocaleDateString()}
            </p>
            <p>
              <span className='font-medium'>Job Month:</span> {data.jobMonth}
            </p>
            <p>
              <span className='font-medium'>Invoice Type:</span>{" "}
              {data.invoiceType}
            </p>
          </div>
        </div>
        <div>
          <h3 className='font-semibold mb-2'>Service Summary</h3>
          <div className='space-y-1 text-sm'>
            <p>
              <span className='font-medium'>Total Lines:</span>{" "}
              {data.lines.length}
            </p>
            <p>
              <span className='font-medium'>Service Period:</span>{" "}
              {data.jobMonth}
            </p>
            <p>
              <span className='font-medium'>Total Amount:</span>{" "}
              {formatCurrency(data.totalAmount)}
            </p>
          </div>
        </div>
      </div>

      {/* Charges Table */}
      <div className='mb-8'>
        <h3 className='font-semibold mb-4'>Charges Details</h3>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className='w-[50px]'>S.No</TableHead>
              <TableHead>Customer Name</TableHead>
              <TableHead>Phone Number</TableHead>
              <TableHead>Installation Date</TableHead>
              <TableHead className='text-right'>Cable Length (m)</TableHead>
              <TableHead className='text-right'>Rate (LKR)</TableHead>
              <TableHead className='text-right'>Amount (LKR)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.lines.map((line, index) => {
              const rate = calculateRate(line.total_cable);
              return (
                <TableRow key={line.id}>
                  <TableCell>{index + 1}</TableCell>
                  <TableCell>{line.name}</TableCell>
                  <TableCell>{line.phone_number}</TableCell>
                  <TableCell>
                    {new Date(line.date).toLocaleDateString()}
                  </TableCell>
                  <TableCell className='text-right'>
                    {Number(line.total_cable || 0).toFixed(2)}
                  </TableCell>
                  <TableCell className='text-right'>
                    {Number(rate || 0).toLocaleString()}
                  </TableCell>
                  <TableCell className='text-right'>
                    {Number(rate || 0).toLocaleString()}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>

        {/* Total */}
        <div className='mt-4 flex justify-end'>
          <div className='w-64'>
            <Separator className='mb-2' />
            <div className='flex justify-between font-bold text-lg'>
              <span>Total Amount:</span>
              <span>{formatCurrency(data.totalAmount)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Pricing Tiers Reference */}
      <div className='mb-8'>
        <h3 className='font-semibold mb-4'>Pricing Structure</h3>
        <div className='grid grid-cols-2 md:grid-cols-3 gap-4'>
          {data.pricingTiers.map((tier, index) => (
            <div key={index} className='p-3 border rounded'>
              <div className='font-medium'>
                {tier.min_length}–
                {tier.max_length === 999999 ? "500+" : tier.max_length}m
              </div>
              <div className='text-sm text-muted-foreground'>
                {formatCurrency(tier.rate)}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bank Details */}
      <div className='mb-8'>
        <h3 className='font-semibold mb-4'>Payment Details</h3>
        <div className='grid grid-cols-2 gap-8'>
          <div>
            <h4 className='font-medium mb-2'>Bank Information</h4>
            <div className='space-y-1 text-sm'>
              <p>
                <span className='font-medium'>Bank:</span>{" "}
                {data.companySettings.bank_details.bank_name}
              </p>
              <p>
                <span className='font-medium'>Account Title:</span>{" "}
                {data.companySettings.bank_details.account_title}
              </p>
              <p>
                <span className='font-medium'>Account No:</span>{" "}
                {data.companySettings.bank_details.account_number}
              </p>
              <p>
                <span className='font-medium'>Branch Code:</span>{" "}
                {data.companySettings.bank_details.branch_code}
              </p>
            </div>
          </div>
          <div>
            <h4 className='font-medium mb-2'>IBAN</h4>
            <div className='p-2 bg-gray-100 rounded font-mono text-sm'>
              {data.companySettings.bank_details.iban}
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <Separator className='mb-4' />
      <div className='text-center text-sm text-muted-foreground'>
        <p>Thank you for your business!</p>
        <p>
          This is a computer-generated invoice and does not require a signature.
        </p>
      </div>
    </div>
  );
}
