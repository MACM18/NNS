"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, FileText, Loader2, Plus, RefreshCw, Upload } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/auth-context";
import { useNotification } from "@/contexts/notification-context";
import type { BusinessTransactionType } from "@/types/accounting";

type Account = { id: string; code: string; name: string; category: string };
type Year = { id: string; name: string; startDate: string; endDate: string; isClosed: boolean };
type Partner = { id: string; code: string; name: string };
type Transaction = {
  id: string; date: string; amount: number | string; type: BusinessTransactionType;
  category?: string | null; description: string; isDeductible: boolean; status: string;
  paymentMethod?: string | null; partner?: Partner | null; financialYear?: Year | null;
  journalEntryId?: string | null; vouchers?: Array<{ id: string; fileUrl: string; receiptNo?: string | null; payeeName?: string | null }>;
};

const transactionTypes: Array<{ value: BusinessTransactionType; label: string }> = [
  { value: "expense", label: "Business expense" },
  { value: "income", label: "Other business income" },
  { value: "drawing", label: "Partner drawing" },
  { value: "internal_transfer", label: "Internal transfer" },
];
const expenseCategories = ["casual labor", "vehicle fuel", "vehicle repairs", "office supplies", "tools/equipment", "other business expense"];

const emptyForm = {
  type: "expense" as BusinessTransactionType,
  date: format(new Date(), "yyyy-MM-dd"), amount: "", description: "", category: expenseCategories[0],
  financialYearId: "", paymentMethod: "bank_transfer", cashAccountId: "", offsetAccountId: "", partnerId: "",
  isDeductible: true, file: null as File | null, receiptNo: "", payeeName: "", payeeNic: "",
};

export default function TransactionsPage() {
  const { role } = useAuth();
  const { addNotification } = useNotification();
  const canApprove = role === "admin" || role === "superadmin";
  const [years, setYears] = useState<Year[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState<"all" | BusinessTransactionType>("all");

  const load = async () => {
    try {
      setLoading(true);
      const [yearsResponse, accountsResponse, partnersResponse] = await Promise.all([
        fetch("/api/accounting/financial-years"),
        fetch("/api/accounting/accounts?isActive=true"),
        fetch("/api/accounting/partners"),
      ]);
      const [yearsJson, accountsJson, partnersJson] = await Promise.all([yearsResponse.json(), accountsResponse.json(), partnersResponse.json()]);
      if (!yearsResponse.ok) throw new Error(yearsJson.error || "Failed to load financial years");
      if (!accountsResponse.ok) throw new Error(accountsJson.error || "Failed to load accounts");
      setYears(yearsJson.data || []);
      setAccounts(accountsJson.data || []);
      setPartners(partnersJson.data || []);
      const openYear = (yearsJson.data || []).find((year: Year) => !year.isClosed);
      setForm((previous) => ({ ...previous, financialYearId: previous.financialYearId || openYear?.id || "" }));
      await loadTransactions(openYear?.id || form.financialYearId);
    } catch (error) {
      addNotification({ title: "Error", message: error instanceof Error ? error.message : "Failed to load accounting data", type: "error", category: "accounting" });
    } finally {
      setLoading(false);
    }
  };

  const loadTransactions = async (financialYearId?: string) => {
    const query = financialYearId ? `?financialYearId=${encodeURIComponent(financialYearId)}` : "";
    const response = await fetch(`/api/accounting/transactions${query}`);
    const json = await response.json();
    if (!response.ok) throw new Error(json.error || "Failed to load transactions");
    setTransactions(json.data || []);
  };

  useEffect(() => { void load(); }, []);

  const cashAccounts = useMemo(() => accounts.filter((account) => account.category === "Asset" && (/^10(10|20)/.test(account.code) || /cash|bank/i.test(account.name))), [accounts]);
  const offsetAccounts = useMemo(() => accounts.filter((account) => account.category !== "Liability" || form.type === "internal_transfer"), [accounts, form.type]);
  const visibleTransactions = transactions.filter((transaction) => filter === "all" || transaction.type === filter);
  const selectedPartner = partners.find((partner) => partner.id === form.partnerId);

  const updateForm = (updates: Partial<typeof emptyForm>) => setForm((previous) => ({ ...previous, ...updates }));

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.financialYearId || !form.cashAccountId || !form.offsetAccountId || !form.amount || !form.description) return;
    if (form.type === "drawing" && !form.partnerId) return;
    if (form.type === "expense" && (!form.isDeductible || !form.file)) {
      addNotification({ title: "Voucher required", message: "Expenses need explicit deductibility and a voucher before posting.", type: "error", category: "accounting" });
      return;
    }
    setSaving(true);
    try {
      let voucher: { fileUrl: string; receiptNo?: string; payeeName?: string; payeeNic?: string } | undefined;
      if (form.file) {
        const upload = new FormData();
        upload.append("file", form.file);
        const uploadResponse = await fetch("/api/accounting/vouchers", { method: "POST", body: upload });
        const uploadJson = await uploadResponse.json();
        if (!uploadResponse.ok) throw new Error(uploadJson.error || "Voucher upload failed");
        voucher = { fileUrl: uploadJson.data.fileUrl, receiptNo: form.receiptNo || undefined, payeeName: form.payeeName || undefined, payeeNic: form.payeeNic || undefined };
      }
      const response = await fetch("/api/accounting/transactions", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, amount: Number(form.amount), file: undefined, voucher }),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || "Failed to save transaction");
      addNotification({ title: "Transaction recorded", message: canApprove ? "The transaction was posted to the ledger." : "The transaction is pending administrator approval.", type: "success", category: "accounting" });
      setForm({ ...emptyForm, financialYearId: form.financialYearId, cashAccountId: form.cashAccountId });
      setShowForm(false);
      await loadTransactions(form.financialYearId);
    } catch (error) {
      addNotification({ title: "Error", message: error instanceof Error ? error.message : "Failed to save transaction", type: "error", category: "accounting" });
    } finally { setSaving(false); }
  };

  const approve = async (id: string) => {
    const response = await fetch(`/api/accounting/transactions/${id}/approve`, { method: "POST" });
    const json = await response.json();
    if (!response.ok) { addNotification({ title: "Error", message: json.error || "Approval failed", type: "error", category: "accounting" }); return; }
    addNotification({ title: "Transaction approved", message: "The journal entry now affects the ledger.", type: "success", category: "accounting" });
    await loadTransactions(form.financialYearId);
  };

  return <div className='flex-1 space-y-6 p-4 pt-6 md:p-8'>
    <div className='flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
      <div><h1 className='text-3xl font-bold tracking-tight'>Business transactions</h1><p className='text-muted-foreground'>Capture income, expenses, partner drawings, and internal cash movements.</p></div>
      <div className='flex gap-2'><Button variant='outline' onClick={() => void load()}><RefreshCw className='mr-2 h-4 w-4' />Refresh</Button><Button onClick={() => setShowForm((value) => !value)}><Plus className='mr-2 h-4 w-4' />New transaction</Button></div>
    </div>
    {showForm && <Card><CardHeader><CardTitle>Record a business transaction</CardTitle><CardDescription>Use a voucher for every business expense. Draft transactions are reviewed by administrators.</CardDescription></CardHeader><CardContent><form className='grid gap-4 md:grid-cols-2' onSubmit={submit}>
      <div className='space-y-2'><Label>Transaction type</Label><select className='h-10 w-full rounded-md border bg-background px-3 text-sm' value={form.type} onChange={(event) => updateForm({ type: event.target.value as BusinessTransactionType, category: event.target.value === "expense" ? expenseCategories[0] : "" })}>{transactionTypes.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></div>
      <div className='space-y-2'><Label>Financial year</Label><select className='h-10 w-full rounded-md border bg-background px-3 text-sm' value={form.financialYearId} onChange={(event) => { updateForm({ financialYearId: event.target.value }); void loadTransactions(event.target.value); }}>{years.map((year) => <option key={year.id} value={year.id} disabled={year.isClosed}>{year.name}{year.isClosed ? " (Closed)" : ""}</option>)}</select></div>
      <div className='space-y-2'><Label>Date</Label><Input type='date' value={form.date} onChange={(event) => updateForm({ date: event.target.value })} /></div>
      <div className='space-y-2'><Label>Amount (LKR)</Label><Input type='number' min='0.01' step='0.01' value={form.amount} onChange={(event) => updateForm({ amount: event.target.value })} required /></div>
      <div className='space-y-2 md:col-span-2'><Label>Description</Label><Textarea value={form.description} onChange={(event) => updateForm({ description: event.target.value })} required /></div>
      {form.type === "expense" && <div className='space-y-2'><Label>Expense category</Label><select className='h-10 w-full rounded-md border bg-background px-3 text-sm' value={form.category} onChange={(event) => updateForm({ category: event.target.value })}>{expenseCategories.map((category) => <option key={category}>{category}</option>)}</select></div>}
      {form.type === "drawing" && <div className='space-y-2'><Label>Partner</Label><select className='h-10 w-full rounded-md border bg-background px-3 text-sm' value={form.partnerId} onChange={(event) => updateForm({ partnerId: event.target.value })} required><option value=''>Select partner</option>{partners.map((partner) => <option key={partner.id} value={partner.id}>{partner.name}</option>)}</select>{form.partnerId && !selectedPartner && <p className='text-xs text-destructive'>Partner not found.</p>}</div>}
      <div className='space-y-2'><Label>{form.type === "income" ? "Receiving account" : form.type === "internal_transfer" ? "Source account" : "Paid from"}</Label><select className='h-10 w-full rounded-md border bg-background px-3 text-sm' value={form.cashAccountId} onChange={(event) => updateForm({ cashAccountId: event.target.value })} required><option value=''>Select account</option>{(form.type === "internal_transfer" ? accounts.filter((account) => account.category === "Asset") : cashAccounts).map((account) => <option key={account.id} value={account.id}>{account.code} - {account.name}</option>)}</select></div>
      <div className='space-y-2'><Label>{form.type === "income" ? "Income account" : form.type === "internal_transfer" ? "Destination account" : form.type === "drawing" ? "Drawing account" : "Expense account"}</Label><select className='h-10 w-full rounded-md border bg-background px-3 text-sm' value={form.offsetAccountId} onChange={(event) => updateForm({ offsetAccountId: event.target.value })} required><option value=''>Select account</option>{offsetAccounts.filter((account) => form.type === "income" ? account.category === "Revenue" : form.type === "expense" ? account.category === "Expense" : form.type === "drawing" ? account.category === "Equity" : account.category === "Asset").map((account) => <option key={account.id} value={account.id}>{account.code} - {account.name}</option>)}</select></div>
      {form.type !== "internal_transfer" && <div className='space-y-2'><Label>Payment method</Label><select className='h-10 w-full rounded-md border bg-background px-3 text-sm' value={form.paymentMethod} onChange={(event) => updateForm({ paymentMethod: event.target.value })}><option value='cash'>Cash</option><option value='bank_transfer'>Bank transfer</option><option value='cheque'>Cheque</option><option value='card'>Card</option><option value='other'>Other</option></select></div>}
      {form.type === "expense" && <div className='flex items-center gap-2 pt-8'><input id='deductible' type='checkbox' checked={form.isDeductible} onChange={(event) => updateForm({ isDeductible: event.target.checked })} /><Label htmlFor='deductible'>Allowable business expense</Label></div>}
      {form.type === "expense" && <div className='rounded-lg border border-dashed p-4 md:col-span-2'><div className='mb-3 flex items-center gap-2 font-medium'><Upload className='h-4 w-4' />Voucher attachment</div><div className='grid gap-3 md:grid-cols-4'><Input type='file' accept='.pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png' onChange={(event) => updateForm({ file: event.target.files?.[0] || null })} required /><Input placeholder='Receipt number' value={form.receiptNo} onChange={(event) => updateForm({ receiptNo: event.target.value })} /><Input placeholder='Payee name' value={form.payeeName} onChange={(event) => updateForm({ payeeName: event.target.value })} /><Input placeholder='Payee ID (optional)' value={form.payeeNic} onChange={(event) => updateForm({ payeeNic: event.target.value })} /></div><p className='mt-2 text-xs text-muted-foreground'>PDF, JPG, or PNG up to 10 MB. Identification details are encrypted and restricted to authorized users.</p></div>}
      <div className='flex justify-end gap-2 md:col-span-2'><Button type='button' variant='outline' onClick={() => setShowForm(false)}>Cancel</Button><Button type='submit' disabled={saving || loading}>{saving ? <Loader2 className='mr-2 h-4 w-4 animate-spin' /> : <FileText className='mr-2 h-4 w-4' />}Save transaction</Button></div>
    </form></CardContent></Card>}
    <Card><CardHeader className='flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'><div><CardTitle>Transaction register</CardTitle><CardDescription>{visibleTransactions.length} transaction(s) for the selected financial year.</CardDescription></div><select className='h-10 rounded-md border bg-background px-3 text-sm' value={filter} onChange={(event) => setFilter(event.target.value as typeof filter)}><option value='all'>All types</option>{transactionTypes.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></CardHeader><CardContent>{loading ? <div className='flex justify-center p-8'><Loader2 className='h-6 w-6 animate-spin' /></div> : visibleTransactions.length === 0 ? <p className='p-8 text-center text-muted-foreground'>No business transactions recorded yet.</p> : <div className='overflow-x-auto'><table className='w-full text-sm'><thead><tr className='border-b text-left'><th className='p-3'>Date</th><th className='p-3'>Financial year</th><th className='p-3'>Type</th><th className='p-3'>Description</th><th className='p-3'>Amount</th><th className='p-3'>Voucher</th><th className='p-3'>Status</th><th className='p-3'>Journal</th><th className='p-3 text-right'>Action</th></tr></thead><tbody>{visibleTransactions.map((transaction) => <tr className='border-b' key={transaction.id}><td className='p-3'>{format(new Date(transaction.date), "dd MMM yyyy")}</td><td className='p-3'>{transaction.financialYear?.name || "—"}</td><td className='p-3 capitalize'>{transaction.type.replace("_", " ")}</td><td className='p-3'>{transaction.description}{transaction.partner ? <span className='block text-xs text-muted-foreground'>{transaction.partner.name}</span> : null}</td><td className='p-3 font-mono'>LKR {Number(transaction.amount).toLocaleString()}</td><td className='p-3'>{transaction.vouchers?.length ? <a className='inline-flex items-center gap-1 text-primary underline' href={transaction.vouchers[0].fileUrl} target='_blank' rel='noreferrer'><FileText className='h-3 w-3' />Attached</a> : <span className='text-muted-foreground'>Missing</span>}</td><td className='p-3'><Badge variant={transaction.status === "posted" ? "default" : transaction.status === "pending" ? "secondary" : "outline"}>{transaction.status}</Badge></td><td className='p-3 font-mono text-xs'>{transaction.journalEntryId ? transaction.journalEntryId.slice(0, 8) : "—"}</td><td className='p-3 text-right'>{canApprove && ["draft", "pending"].includes(transaction.status) && <Button size='sm' variant='outline' onClick={() => void approve(transaction.id)}><CheckCircle2 className='mr-1 h-4 w-4' />Approve</Button>}</td></tr>)}</tbody></table></div>}</CardContent></Card>
  </div>;
}
