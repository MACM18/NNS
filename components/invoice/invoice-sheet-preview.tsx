"use client";

import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { InvoiceInlineEdit } from "@/components/invoice/invoice-inline-edit";
import type { InvoiceDocumentFields } from "@/lib/invoice-document";

export type InvoicePreviewRow = { id: string; description: string; rtom?: string; quantity: number; unitRate: number; amount: number; descriptionKey?: string };

export function InvoiceSheetPreview({
  fields, updateField, rows, updateRowDescription, company, number, date, jobMonth, updateDate, updateJobMonth, type, percent, total, amount,
}: {
  fields: InvoiceDocumentFields; updateField: (key: keyof InvoiceDocumentFields, value: string) => void;
  rows: InvoicePreviewRow[]; updateRowDescription: (row: InvoicePreviewRow, value: string) => void;
  company: { company_name: string; address: string; contact_numbers: string[]; registered_number: string; bank_details: Record<string, string> };
  number: string; date: string; jobMonth: string; updateDate: (value: string) => void; updateJobMonth: (value: string) => void; type: "A" | "B"; percent: number; total: number; amount: number;
}) {
  const bank = company.bank_details || {};
  const contacts = Array.isArray(company.contact_numbers) ? company.contact_numbers : [];
  const field = (key: keyof InvoiceDocumentFields, value = fields[key], className = "") => <InvoiceInlineEdit ariaLabel={key} value={value} onSave={next => updateField(key, next)} className={className} />;
  const tableHeaders: Array<[keyof InvoiceDocumentFields, string]> = [["headerSerial", "Serial number"], ["headerDescription", "Description"], ["headerRtom", "RTOM"], ["headerQuantity", "Quantity"], ["headerUnitRate", "Unit rate"], ["headerAmount", "Amount"]];
  const cell = (content: ReactNode, className = "") => <td className={`border border-sky-200 px-2 py-1.5 align-middle ${className}`}>{content}</td>;
  const money = (value: number) => value.toLocaleString("en-LK", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return <article className="mx-auto w-full min-w-0 max-w-full overflow-hidden bg-white text-slate-800 shadow-xl ring-1 ring-slate-200 print:max-w-none print:shadow-none print:ring-0">
    <div className="border-b-[3px] border-sky-500 bg-[#134160] px-4 py-4 text-white sm:px-10">
      <div className="break-words text-xl font-semibold">{company.company_name || "NNS Enterprise"}</div>
      <div className="mt-1 break-words text-xs text-white/90">{company.address}</div>
      <div className="break-words text-xs text-white/90"><InvoiceInlineEdit ariaLabel="Company contact label" value={fields.contactLabel} onSave={value => updateField("contactLabel", value)} /> {contacts.filter(Boolean).join(" · ")}</div>
    </div>
    <div className="min-w-0 space-y-4 px-3 py-4 sm:px-8 sm:py-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="min-w-0 break-words text-sm"><div className="font-semibold">{field("billToLabel", undefined, "font-semibold")}</div><div>{field("billToName")}</div><div>{field("billToAddress1")}</div><div>{field("billToAddress2")}</div></div>
        <div className="grid min-w-0 grid-cols-[minmax(0,0.85fr)_minmax(0,1fr)] gap-x-2 gap-y-1 break-words text-xs sm:grid-cols-[max-content_minmax(0,1fr)] sm:gap-x-3 sm:text-sm">
          <span>{field("invoiceNumberLabel")}</span><span className="break-all font-semibold">{number}</span>
          <span>{field("registeredNumberLabel")}</span><span className="break-all">{company.registered_number}</span>
          <span>{field("invoiceDateLabel")}</span><span><InvoiceInlineEdit ariaLabel="Invoice date" value={date} onSave={updateDate} /></span>
          <span>{field("jobMonthLabel")}</span><span><InvoiceInlineEdit ariaLabel="Job related month" value={jobMonth} onSave={updateJobMonth} /></span>
          <span>{field("invoiceTypeLabel")}</span><span>{type}</span>
        </div>
      </div>
      <div className="hidden overflow-x-auto sm:block">
        <table className="w-full min-w-[680px] border-collapse text-xs">
          <thead><tr className="bg-sky-100 text-[#134160]">{tableHeaders.map(([key, label], index) => <th key={key} className={`border border-sky-200 px-2 py-2 font-semibold ${index > 2 ? "text-right" : index === 0 || index === 2 ? "text-center" : "text-left"}`}>{field(key, undefined, "font-semibold")}</th>)}</tr></thead>
          <tbody>
            {rows.map((row, index) => <tr key={row.id} className="odd:bg-white even:bg-slate-50/70">
              {cell(index + 1, "w-12 text-center tabular-nums")}
              {cell(<InvoiceInlineEdit ariaLabel={`Invoice row ${index + 1} description`} value={row.description} onSave={value => updateRowDescription(row, value)} />, "min-w-[220px]")}
              {cell(row.rtom || "", "text-center")}
              {cell(String(row.quantity), "text-right tabular-nums")}
              {cell(money(row.unitRate), "text-right tabular-nums")}
              {cell(row.amount > 0 ? money(row.amount) : "-", "text-right tabular-nums")}
            </tr>)}
            <tr className="bg-sky-100 font-semibold">{cell("")}{cell("")}{cell("")}{cell(field("grandTotalLabel", undefined, "font-semibold"), "text-right")}{cell("")}{cell(total.toLocaleString("en-LK", { minimumFractionDigits: 2, maximumFractionDigits: 2 }), "text-right tabular-nums")}</tr>
            <tr>{cell("")}{cell("")}{cell("")}{cell("")}{cell(`${percent}%`, "text-right")}{cell(amount.toLocaleString("en-LK", { minimumFractionDigits: 2, maximumFractionDigits: 2 }), "text-right tabular-nums")}</tr>
          </tbody>
        </table>
      </div>
      <div className="space-y-2 sm:hidden">
        {rows.map((row, index) => <div key={row.id} className="min-w-0 rounded-lg border border-sky-200 bg-white p-2.5">
          <div className="flex min-w-0 items-start gap-2">
            <span className="shrink-0 rounded bg-sky-50 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">{field("headerSerial")} {index + 1}</span>
            <div className="min-w-0 flex-1 break-words text-xs font-medium text-slate-800"><InvoiceInlineEdit ariaLabel={`Invoice row ${index + 1} description`} value={row.description} onSave={value => updateRowDescription(row, value)} />{row.rtom && <div className="mt-1 text-[10px] font-normal text-slate-500">{field("headerRtom")}: {row.rtom}</div>}</div>
          </div>
          <div className="mt-2 grid grid-cols-3 gap-1 border-t border-sky-100 pt-2 text-[10px]">
            <div className="min-w-0"><div className="text-slate-500">{field("headerQuantity")}</div><div className="mt-0.5 break-words font-medium tabular-nums">{row.quantity}</div></div>
            <div className="min-w-0"><div className="text-slate-500">{field("headerUnitRate")}</div><div className="mt-0.5 break-words font-medium tabular-nums">{money(row.unitRate)}</div></div>
            <div className="min-w-0 text-right"><div className="text-slate-500">{field("headerAmount")}</div><div className="mt-0.5 break-words font-semibold tabular-nums">{row.amount > 0 ? money(row.amount) : "—"}</div></div>
          </div>
        </div>)}
        <div className="flex items-center justify-between gap-3 rounded-lg bg-sky-100 px-3 py-2 text-xs font-semibold"><span className="min-w-0 break-words">{field("grandTotalLabel", undefined, "font-semibold")}</span><span className="shrink-0 tabular-nums">{money(total)}</span></div>
        <div className="flex items-center justify-between gap-3 rounded-lg border border-sky-200 px-3 py-2 text-xs"><span>{percent}%</span><span className="tabular-nums">{money(amount)}</span></div>
      </div>
      <div className="rounded-sm border border-sky-200 px-2 py-2 text-sm">{field("certifyText")}</div>
      <div className="grid grid-cols-1 border border-sky-200 text-center text-xs sm:grid-cols-2"><div className="flex min-h-16 flex-col justify-center border-b border-sky-200 px-2 sm:border-b-0 sm:border-r">{field("preparedByLabel", undefined, "font-semibold")}<span>{field("preparedByName", company.company_name)}</span></div><div className="flex min-h-16 flex-col justify-center px-2">{field("receivedByLabel", undefined, "font-semibold")}<span>{field("receivedByInstruction")}</span></div></div>
      <div className="border border-sky-200 text-xs"><div className="border-b border-sky-200 px-2 py-1.5">{field("chequeInstruction")} “{bank.account_title || ""}”</div><div className="grid grid-cols-2"><div className="border-r border-sky-200 px-2 py-1.5">{field("accountNumberLabel")} {bank.account_number || ""}</div><div className="px-2 py-1.5">{field("bankLabel")} {bank.bank_name || ""}</div><div className="col-span-2 border-t border-sky-200 px-2 py-1.5">{field("branchLabel")} {bank.branch_code || ""}</div></div></div>
      <div className="min-w-0 border border-sky-200 text-xs"><div className="border-b border-sky-200 px-2 py-1.5 font-semibold">{field("sltsUseOnlyLabel", undefined, "font-semibold")}</div><div className="grid grid-cols-[minmax(0,0.55fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,0.9fr)] text-center font-semibold sm:grid-cols-[110px_1fr_1fr_150px]"><div className="min-w-0 border-r border-sky-200 p-1 sm:p-2" /><div className="min-w-0 border-r border-sky-200 p-1 sm:p-2">{field("regionalSignatureLabel", undefined, "font-semibold")}</div><div className="min-w-0 border-r border-sky-200 p-1 sm:p-2">{field("headOfficeSignatureLabel", undefined, "font-semibold")}</div><div className="min-w-0 p-1 sm:p-2">{field("financeLabel", undefined, "font-semibold")}</div></div>{(["checkedByLabel", "certifiedByLabel", "approvedByLabel"] as const).map(key => <div key={key} className="grid min-h-12 grid-cols-[minmax(0,0.55fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,0.9fr)] border-t border-sky-200 sm:grid-cols-[110px_1fr_1fr_150px]"><div className="min-w-0 border-r border-sky-200 p-1 sm:p-2">{field(key)}</div><div className="min-w-0 border-r border-sky-200" /><div className="min-w-0 border-r border-sky-200" />{key === "checkedByLabel" && <div className="row-span-3 flex min-w-0 items-center p-1 sm:p-2">{field("recommendedByLabel")}</div>}</div>)}<div className="grid grid-cols-[minmax(0,1fr)_minmax(0,0.6fr)_minmax(0,1fr)] border-t border-sky-200 sm:grid-cols-[110px_1fr_70px_1fr_150px]"><div className="hidden border-r border-sky-200 p-2 sm:block" /><div className="min-w-0 border-r border-sky-200 p-1 sm:p-2">{field("officeUseOnlyLabel")}</div><div className="min-w-0 border-r border-sky-200 p-1 sm:p-2">{field("yesNoLabel")}</div><div className="min-w-0 border-r border-sky-200 p-1 sm:p-2">{field("signDateLabel")}</div><div className="hidden sm:block" /></div><div className="grid min-h-12 grid-cols-[minmax(0,1fr)_minmax(0,0.6fr)_minmax(0,1fr)] border-t border-sky-200 sm:grid-cols-[110px_1fr_70px_1fr_150px]"><div className="hidden border-r border-sky-200 sm:block" /><div className="min-w-0 border-r border-sky-200 p-1 sm:p-2">{field("materialBalanceReceivedLabel")}</div><div className="min-w-0 border-r border-sky-200 p-1 sm:p-2">{field("materialBalanceReceivedAnswer")}</div><div className="min-w-0 border-r border-sky-200 sm:border-r-0" /><div className="hidden sm:block" /></div></div>
    </div>
    <div className="flex justify-end px-5 pb-4 sm:px-8"><Badge variant="outline">Invoice {type} · {percent}%</Badge></div>
  </article>;
}
