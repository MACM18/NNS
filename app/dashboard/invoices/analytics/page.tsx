"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Activity, ArrowLeft, BarChart3, FileText, RefreshCw, TrendingUp } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AuthWrapper } from "@/components/auth/auth-wrapper";
import { useAuth } from "@/contexts/auth-context";
import { useNotification } from "@/contexts/notification-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type MonthTotal = { month: number; label: string; totalBilled: number; amountA: number; amountB: number; invoicePairs: number; lines: number };
type AnalyticsData = {
  allTime: { totalBilled: number; invoicePairs: number; lines: number; amountA: number; amountB: number };
  year: number;
  years: number[];
  byMonth: MonthTotal[];
};

const money = (value: number) => `LKR ${Number(value || 0).toLocaleString("en-LK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const compactMoney = (value: number) => value >= 1_000_000 ? `${(value / 1_000_000).toFixed(1)}M` : value >= 1_000 ? `${(value / 1_000).toFixed(0)}K` : String(Math.round(value));

export default function InvoiceAnalyticsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { addNotification } = useNotification();
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadAnalytics = useCallback(async (quiet = false) => {
    if (quiet) setRefreshing(true);
    else setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/invoices/analytics?year=${encodeURIComponent(year)}`);
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not load invoice analytics.");
      setData(result.data);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "Could not load invoice analytics.";
      setError(message);
      addNotification({ title: "Invoice analytics unavailable", message, type: "error", category: "system" });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [addNotification, year]);

  useEffect(() => { if (user) void loadAnalytics(); }, [user, loadAnalytics]);

  if (!user) return <AuthWrapper />;

  const summary = data?.allTime;
  const hasYearData = Boolean(data?.byMonth.some(item => item.invoicePairs > 0));
  return (
    <div className="w-full min-w-0 space-y-6 px-1 sm:px-2">
      <header className="flex flex-col gap-4 border-b pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Button variant="ghost" size="sm" className="mb-2 -ml-3" onClick={() => router.push("/dashboard/invoices")}><ArrowLeft className="mr-2 h-4 w-4" />Invoice archive</Button>
          <p className="mb-1 text-sm font-medium uppercase tracking-[0.16em] text-primary">Billing workspace</p>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Invoice analytics</h1>
          <p className="mt-1 text-sm text-muted-foreground">A/B invoices are combined into one monthly job total and line count.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={year} onValueChange={setYear}>
            <SelectTrigger className="w-[140px]" aria-label="Trend year"><SelectValue placeholder="Year" /></SelectTrigger>
            <SelectContent>
              {[...new Set([Number(year), ...(data?.years || []), new Date().getFullYear()])].sort((a, b) => b - a).map(value => <SelectItem key={value} value={String(value)}>{value}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => void loadAnalytics(true)} disabled={refreshing}><RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />Refresh</Button>
          <Button variant="outline" asChild><Link href="/dashboard/invoices"><FileText className="mr-2 h-4 w-4" />View invoices</Link></Button>
        </div>
      </header>

      {error && <Card className="border-destructive/30"><CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between"><p className="text-sm text-destructive">{error}</p><Button variant="outline" onClick={() => void loadAnalytics()} disabled={loading}>Try again</Button></CardContent></Card>}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-label="All-time invoice totals">
        <SummaryCard title="Total billed" value={money(summary?.totalBilled || 0)} detail="A and B invoice amounts combined" icon={<TrendingUp className="h-5 w-5" />} loading={loading} />
        <SummaryCard title="Invoice pairs" value={Number(summary?.invoicePairs || 0).toLocaleString()} detail="One pair counted per service month" icon={<Activity className="h-5 w-5" />} loading={loading} />
        <SummaryCard title="Service lines" value={Number(summary?.lines || 0).toLocaleString()} detail="Source lines counted once per pair" icon={<FileText className="h-5 w-5" />} loading={loading} />
      </section>

      <Card className="border-border/70 shadow-sm">
        <CardHeader className="flex flex-col gap-2 border-b sm:flex-row sm:items-center sm:justify-between">
          <div><CardTitle className="flex items-center gap-2"><BarChart3 className="h-5 w-5 text-primary" />Monthly billed trend</CardTitle><CardDescription>Invoice A and B allocations for {year}; the stacked bars add up to the full job amount.</CardDescription></div>
          {summary && <div className="flex flex-wrap gap-3 text-xs text-muted-foreground"><span className="inline-flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-sm bg-sky-600" />Invoice A · {money(summary.amountA)}</span><span className="inline-flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-sm bg-indigo-400" />Invoice B · {money(summary.amountB)}</span></div>}
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          {loading ? <div className="h-[300px] animate-pulse rounded-xl bg-muted/40" /> : !hasYearData ? <div className="flex h-[260px] flex-col items-center justify-center text-center"><div className="mb-3 rounded-full bg-primary/10 p-3"><BarChart3 className="h-6 w-6 text-primary" /></div><p className="font-medium">No invoices for {year}</p><p className="mt-1 text-sm text-muted-foreground">Choose another year to see monthly totals.</p></div> : (
            <div className="h-[300px] w-full min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data?.byMonth || []} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-border/60" />
                  <XAxis dataKey="label" tickFormatter={label => String(label).slice(0, 3)} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={value => compactMoney(Number(value))} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={48} />
                  <Tooltip formatter={(value, name) => [money(Number(value)), name === "amountA" ? "Invoice A" : "Invoice B"]} labelFormatter={label => `${label} ${year}`} />
                  <Bar dataKey="amountA" name="Invoice A" stackId="invoice" fill="#0284c7" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="amountB" name="Invoice B" stackId="invoice" fill="#818cf8" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-border/70 shadow-sm">
        <CardHeader className="border-b"><CardTitle>Month-by-month breakdown</CardTitle><CardDescription>Monthly totals and allocation from saved invoice snapshots.</CardDescription></CardHeader>
        <CardContent className="p-0">
          {loading ? <div className="space-y-3 p-5">{Array.from({ length: 5 }, (_, index) => <div key={index} className="h-10 animate-pulse rounded bg-muted/40" />)}</div> : !hasYearData ? <div className="p-8 text-center text-sm text-muted-foreground">No monthly invoice data to show for {year}.</div> : (
            <div className="w-full overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead><tr className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground"><th className="px-4 py-3 font-medium">Month</th><th className="px-4 py-3 text-right font-medium">Jobs</th><th className="px-4 py-3 text-right font-medium">Service lines</th><th className="px-4 py-3 text-right font-medium">Invoice A</th><th className="px-4 py-3 text-right font-medium">Invoice B</th><th className="px-4 py-3 text-right font-medium">Grand total</th></tr></thead>
                <tbody>{data?.byMonth.filter(item => item.invoicePairs > 0).map(item => (
                  <tr key={item.month} className="border-t hover:bg-muted/20"><td className="px-4 py-3 font-medium">{item.label} {year}</td><td className="px-4 py-3 text-right tabular-nums">{item.invoicePairs}</td><td className="px-4 py-3 text-right tabular-nums">{item.lines.toLocaleString()}</td><td className="px-4 py-3 text-right tabular-nums">{money(item.amountA)}</td><td className="px-4 py-3 text-right tabular-nums">{money(item.amountB)}</td><td className="px-4 py-3 text-right font-semibold tabular-nums">{money(item.totalBilled)}</td></tr>
                ))}</tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function SummaryCard({ title, value, detail, icon, loading }: { title: string; value: string; detail: string; icon: React.ReactNode; loading: boolean }) {
  return <Card className="border-border/70 shadow-sm"><CardContent className="flex items-start justify-between gap-4 p-5"><div className="min-w-0"><p className="text-sm text-muted-foreground">{title}</p>{loading ? <div className="mt-2 h-8 w-36 animate-pulse rounded bg-muted/50" /> : <p className="mt-2 truncate text-2xl font-semibold tracking-tight tabular-nums">{value}</p>}<p className="mt-2 text-xs text-muted-foreground">{detail}</p></div><div className="rounded-xl bg-primary/10 p-3 text-primary">{icon}</div></CardContent></Card>;
}
