"use client";

import { useEffect, useState } from "react";
import { CalendarDays, Loader2, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useNotification } from "@/contexts/notification-context";

type Receivable = { id: string; invoiceNumber: string; invoiceDate: string; dueDate: string; outstanding: number; ageDays: number; bucket: string };
type Aging = { bucket: string; count: number; amount: number };

const labels: Record<string, string> = { current: "Current", "1_30": "1–30 days", "31_60": "31–60 days", "61_90": "61–90 days", "90_plus": "90+ days" };

export default function ReceivablesPage() {
  const { addNotification } = useNotification();
  const [asOfDate, setAsOfDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [buckets, setBuckets] = useState<Aging[]>([]);
  const [invoices, setInvoices] = useState<Receivable[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const load = async () => { setLoading(true); try { const response = await fetch(`/api/accounting/receivables?asOfDate=${asOfDate}`); const json = await response.json(); if (!response.ok) throw new Error(json.error || "Failed to load receivables"); setBuckets(json.data.buckets || []); setInvoices(json.data.invoices || []); setTotal(json.data.totalOutstanding || 0); } catch (error) { addNotification({ title: "Error", message: error instanceof Error ? error.message : "Failed to load receivables", type: "error", category: "accounting" }); } finally { setLoading(false); } };
  useEffect(() => { void load(); }, [asOfDate]);
  return <div className='flex-1 space-y-6 p-4 pt-6 md:p-8'><div className='flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'><div><h1 className='text-3xl font-bold tracking-tight'>Accounts receivable</h1><p className='text-muted-foreground'>Track unpaid service invoices by age and outstanding balance.</p></div><div className='flex gap-2'><Input className='w-40' type='date' value={asOfDate} onChange={(event) => setAsOfDate(event.target.value)} /><Button variant='outline' onClick={() => void load()}><RefreshCw className='mr-2 h-4 w-4' />Refresh</Button></div></div><Card><CardHeader><CardTitle>Total outstanding</CardTitle><CardDescription>As of {format(new Date(`${asOfDate}T00:00:00`), "dd MMM yyyy")}</CardDescription></CardHeader><CardContent><div className='text-3xl font-bold'>LKR {Number(total).toLocaleString()}</div></CardContent></Card><div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-5'>{buckets.map((bucket) => <Card key={bucket.bucket}><CardHeader className='pb-2'><CardDescription>{labels[bucket.bucket] || bucket.bucket}</CardDescription><CardTitle className='text-xl'>LKR {Number(bucket.amount).toLocaleString()}</CardTitle></CardHeader><CardContent><p className='text-sm text-muted-foreground'>{bucket.count} invoice(s)</p></CardContent></Card>)}</div><Card><CardHeader><CardTitle>Outstanding invoices</CardTitle><CardDescription>Only posted service invoices are included.</CardDescription></CardHeader><CardContent>{loading ? <div className='flex justify-center p-8'><Loader2 className='h-6 w-6 animate-spin' /></div> : invoices.length === 0 ? <p className='p-8 text-center text-muted-foreground'>No outstanding receivables.</p> : <div className='overflow-x-auto'><table className='w-full text-sm'><thead><tr className='border-b text-left'><th className='p-3'>Invoice</th><th className='p-3'>Invoice date</th><th className='p-3'>Due date</th><th className='p-3'>Age</th><th className='p-3 text-right'>Outstanding</th></tr></thead><tbody>{invoices.map((invoice) => <tr className='border-b' key={invoice.id}><td className='p-3 font-medium'>{invoice.invoiceNumber}</td><td className='p-3'>{format(new Date(invoice.invoiceDate), "dd MMM yyyy")}</td><td className='p-3'>{format(new Date(invoice.dueDate), "dd MMM yyyy")}</td><td className='p-3'><Badge variant={invoice.bucket === "90_plus" ? "destructive" : "outline"}>{labels[invoice.bucket]} · {invoice.ageDays} days</Badge></td><td className='p-3 text-right font-mono'>LKR {Number(invoice.outstanding).toLocaleString()}</td></tr>)}</tbody></table></div>}</CardContent></Card></div>;
}
