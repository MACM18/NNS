"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNotification } from "@/contexts/notification-context";
import { useAuth } from "@/contexts/auth-context";

type Account = { id: string; code: string; name: string; category: string };
type FinancialYear = {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  status: string;
  isClosed: boolean;
  allocations?: Array<{ percentage: number; partner: { name: string } }>;
};
type Invoice = {
  id: string;
  invoice_number: string;
  invoice_date: string | null;
  total_amount: number;
  paid_amount: number;
  payment_status: string;
};
type OpeningLine = {
  accountId: string;
  description: string;
  debitAmount: string;
  creditAmount: string;
};

function defaultDates() {
  const now = new Date();
  const startYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  return {
    startDate: `${startYear}-04-01`,
    endDate: `${startYear + 1}-03-31`,
  };
}

export default function FinancialYearsPage() {
  const { addNotification } = useNotification();
  const { role } = useAuth();
  const canAdminister = role === "admin" || role === "superadmin";
  const [years, setYears] = useState<FinancialYear[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [selectedYearId, setSelectedYearId] = useState("");
  const [creating, setCreating] = useState(false);
  const [posting, setPosting] = useState(false);
  const [dates, setDates] = useState(defaultDates);
  const [lines, setLines] = useState<OpeningLine[]>([
    { accountId: "", description: "Opening assets", debitAmount: "", creditAmount: "" },
    { accountId: "", description: "Opening equity / partner capital", debitAmount: "", creditAmount: "" },
  ]);
  const [selectedReceivables, setSelectedReceivables] = useState<Record<string, boolean>>({});

  const selectedYear = years.find((year) => year.id === selectedYearId);
  const debitTotal = useMemo(() => lines.reduce((sum, line) => sum + Number(line.debitAmount || 0), 0), [lines]);
  const creditTotal = useMemo(() => lines.reduce((sum, line) => sum + Number(line.creditAmount || 0), 0), [lines]);
  const balanced = debitTotal > 0 && Math.abs(debitTotal - creditTotal) < 0.01;
  const availableReceivables = invoices.filter((invoice) => {
    if (!selectedYear || !invoice.invoice_date || invoice.payment_status === "paid") return false;
    return invoice.invoice_date < selectedYear.startDate.slice(0, 10);
  });

  const load = async () => {
    const [yearsResponse, accountsResponse, invoicesResponse] = await Promise.all([
      fetch("/api/accounting/financial-years"),
      fetch("/api/accounting/accounts?isActive=true"),
      fetch("/api/invoices?limit=1000"),
    ]);
    const yearsJson = await yearsResponse.json();
    const accountsJson = await accountsResponse.json();
    const invoicesJson = await invoicesResponse.json();
    if (!yearsResponse.ok) throw new Error(yearsJson.error || "Failed to load financial years");
    if (!accountsResponse.ok) throw new Error(accountsJson.error || "Failed to load accounts");
    setYears(yearsJson.data || []);
    setAccounts(accountsJson.data || []);
    setInvoices(invoicesJson.data || []);
    if (!selectedYearId && yearsJson.data?.[0]?.id) setSelectedYearId(yearsJson.data[0].id);
  };

  useEffect(() => {
    load().catch((error) => addNotification({ title: "Error", message: error.message, type: "error", category: "accounting" }));
    // Initial data only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const createYear = async () => {
    if (!dates.startDate || !dates.endDate) return;
    setCreating(true);
    try {
      const response = await fetch("/api/accounting/financial-years", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ startDate: dates.startDate, endDate: dates.endDate }),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || "Failed to create financial year");
      setSelectedYearId(json.data.id);
      await load();
      addNotification({ title: "Financial year created", message: "Monthly, quarterly, and yearly periods were generated.", type: "success", category: "accounting" });
    } catch (error: any) {
      addNotification({ title: "Error", message: error.message, type: "error", category: "accounting" });
    } finally {
      setCreating(false);
    }
  };

  const postOpening = async () => {
    if (!selectedYearId || !balanced) return;
    setPosting(true);
    try {
      const response = await fetch(`/api/accounting/financial-years/${selectedYearId}/opening`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lines: lines.map((line) => ({
            ...line,
            debitAmount: Number(line.debitAmount || 0),
            creditAmount: Number(line.creditAmount || 0),
          })),
          receivables: availableReceivables
            .filter((invoice) => selectedReceivables[invoice.id])
            .map((invoice) => ({
              invoiceId: invoice.id,
              amount: invoice.total_amount - invoice.paid_amount,
              invoiceNumber: invoice.invoice_number,
            })),
        }),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || "Failed to post opening balances");
      addNotification({ title: "Opening conversion complete", message: "The opening journal is balanced and the selected receivables were carried forward.", type: "success", category: "accounting" });
      await load();
    } catch (error: any) {
      addNotification({ title: "Error", message: error.message, type: "error", category: "accounting" });
    } finally {
      setPosting(false);
    }
  };

  return (
    <div className="flex-1 space-y-6 p-4 pt-6 md:p-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Financial years and opening conversion</h1>
        <p className="text-muted-foreground">Start clean accounting on April 1, carry forward unpaid service invoices, and preserve old records as legacy history.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Create a financial year</CardTitle>
          <CardDescription>The default year is April 1 to March 31. Only administrators can create or close a year.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
          <div className="space-y-2"><Label htmlFor="startDate">Start date</Label><Input id="startDate" type="date" value={dates.startDate} onChange={(event) => setDates({ ...dates, startDate: event.target.value })} /></div>
          <div className="space-y-2"><Label htmlFor="endDate">End date</Label><Input id="endDate" type="date" value={dates.endDate} onChange={(event) => setDates({ ...dates, endDate: event.target.value })} /></div>
          {canAdminister && <Button onClick={createYear} disabled={creating}>{creating ? "Creating..." : "Create year"}</Button>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Opening conversion</CardTitle>
          <CardDescription>Enter opening assets, liabilities, capital, and other equity balances. Posting is blocked unless debits equal credits.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2"><Label htmlFor="financialYear">Financial year</Label><select id="financialYear" className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={selectedYearId} onChange={(event) => setSelectedYearId(event.target.value)}><option value="">Select a financial year</option>{years.map((year) => <option key={year.id} value={year.id}>{year.name} ({year.startDate.slice(0, 10)} to {year.endDate.slice(0, 10)})</option>)}</select></div>
          {selectedYear && <p className="text-sm text-muted-foreground">Default partnership allocation: {selectedYear.allocations?.map((allocation) => `${allocation.partner.name} ${Number(allocation.percentage)}%`).join(" / ") || "not configured"}.</p>}
          <div className="space-y-3">
            {lines.map((line, index) => <div key={index} className="grid gap-2 md:grid-cols-[1.5fr_1.5fr_1fr_1fr_auto]">
              <select className="h-10 rounded-md border bg-background px-3 text-sm" value={line.accountId} onChange={(event) => setLines(lines.map((item, itemIndex) => itemIndex === index ? { ...item, accountId: event.target.value } : item))}><option value="">Select account</option>{accounts.map((account) => <option key={account.id} value={account.id}>{account.code} - {account.name}</option>)}</select>
              <Input placeholder="Description" value={line.description} onChange={(event) => setLines(lines.map((item, itemIndex) => itemIndex === index ? { ...item, description: event.target.value } : item))} />
              <Input type="number" min="0" step="0.01" placeholder="Debit" value={line.debitAmount} onChange={(event) => setLines(lines.map((item, itemIndex) => itemIndex === index ? { ...item, debitAmount: event.target.value } : item))} />
              <Input type="number" min="0" step="0.01" placeholder="Credit" value={line.creditAmount} onChange={(event) => setLines(lines.map((item, itemIndex) => itemIndex === index ? { ...item, creditAmount: event.target.value } : item))} />
              <Button variant="outline" onClick={() => setLines(lines.filter((_, itemIndex) => itemIndex !== index))} disabled={lines.length <= 2}>Remove</Button>
            </div>)}
            <Button variant="outline" onClick={() => setLines([...lines, { accountId: "", description: "", debitAmount: "", creditAmount: "" }])}>Add balance line</Button>
          </div>
          <div className={`rounded-md border p-3 text-sm ${balanced ? "border-green-500" : "border-amber-500"}`}>Debits: LKR {debitTotal.toLocaleString()} · Credits: LKR {creditTotal.toLocaleString()} · {balanced ? "Balanced" : "Not balanced"}</div>
          {availableReceivables.length > 0 && <div className="space-y-2"><h3 className="font-medium">Unpaid invoices to carry forward</h3>{availableReceivables.map((invoice) => <label key={invoice.id} className="flex items-center gap-3 rounded border p-3 text-sm"><input type="checkbox" checked={Boolean(selectedReceivables[invoice.id])} onChange={(event) => setSelectedReceivables({ ...selectedReceivables, [invoice.id]: event.target.checked })} /><span className="flex-1">{invoice.invoice_number} ({invoice.invoice_date})</span><span>LKR {(invoice.total_amount - invoice.paid_amount).toLocaleString()}</span></label>)}</div>}
          {canAdminister && <Button onClick={postOpening} disabled={!selectedYearId || !balanced || posting || selectedYear?.isClosed}>{posting ? "Posting..." : "Validate and post opening balances"}</Button>}
        </CardContent>
      </Card>
    </div>
  );
}
