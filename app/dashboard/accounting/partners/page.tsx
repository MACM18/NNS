"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Archive,
  Loader2,
  Plus,
  RotateCcw,
  Save,
  Trash2,
  Users,
} from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/auth-context";
import { useNotification } from "@/contexts/notification-context";

type Account = { id: string; code: string; name: string; category: string };
type Partner = {
  id: string;
  code: string;
  name: string;
  capitalAccountId?: string | null;
  drawingsAccountId?: string | null;
  isActive: boolean;
  _count?: { allocations: number; businessTransactions: number };
};
type Allocation = { partnerId: string; percentage: number };
type Year = { id: string; name: string; isClosed: boolean; allocations?: Array<{ partnerId: string; percentage: number }> };
type NewPartner = { code: string; name: string; capitalAccountId: string; drawingsAccountId: string };
type PartnerAction = { partner: Partner; type: "archive" | "restore" | "delete" } | null;

export default function PartnersPage() {
  const { role } = useAuth();
  const { addNotification } = useNotification();
  const canEdit = ["admin", "superadmin"].includes((role || "").toLowerCase());
  const [partners, setPartners] = useState<Partner[]>([]);
  const [years, setYears] = useState<Year[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedYearId, setSelectedYearId] = useState("");
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [newPartner, setNewPartner] = useState<NewPartner>({ code: "", name: "", capitalAccountId: "", drawingsAccountId: "" });
  const [saving, setSaving] = useState(false);
  const [action, setAction] = useState<PartnerAction>(null);
  const [busyPartnerId, setBusyPartnerId] = useState<string | null>(null);

  const equityAccounts = useMemo(() => accounts.filter((account) => account.category === "Equity"), [accounts]);
  const allocationTotal = allocations.reduce((sum, allocation) => sum + Number(allocation.percentage || 0), 0);
  const activePartners = partners.filter((partner) => partner.isActive);
  const archivedPartners = partners.filter((partner) => !partner.isActive);

  const load = async () => {
    const [partnersResponse, yearsResponse, accountsResponse] = await Promise.all([
      fetch("/api/accounting/partners?includeInactive=true"),
      fetch("/api/accounting/financial-years"),
      fetch("/api/accounting/accounts?isActive=true"),
    ]);
    const [partnersJson, yearsJson, accountsJson] = await Promise.all([
      partnersResponse.json(),
      yearsResponse.json(),
      accountsResponse.json(),
    ]);
    if (!partnersResponse.ok || !yearsResponse.ok || !accountsResponse.ok) throw new Error("Failed to load partnership settings");
    setPartners(partnersJson.data || []);
    setYears(yearsJson.data || []);
    setAccounts(accountsJson.data || []);
    const year = yearsJson.data?.find((item: Year) => !item.isClosed) || yearsJson.data?.[0];
    if (year) setSelectedYearId((current) => current || year.id);
  };

  useEffect(() => {
    load().catch((error) => addNotification({ title: "Error", message: error.message, type: "error", category: "accounting" }));
  }, []);

  useEffect(() => {
    const year = years.find((item) => item.id === selectedYearId);
    setAllocations((year?.allocations || []).map((item) => ({ partnerId: item.partnerId, percentage: Number(item.percentage) })));
  }, [selectedYearId, years]);

  const savePartner = async (partner: Partner | NewPartner) => {
    setSaving(true);
    try {
      const response = await fetch("/api/accounting/partners", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(partner),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || "Failed to save partner");
      addNotification({ title: "Partner saved", message: `${partner.name} account settings were updated.`, type: "success", category: "accounting" });
      await load();
    } catch (error) {
      addNotification({ title: "Error", message: error instanceof Error ? error.message : "Failed to save partner", type: "error", category: "accounting" });
    } finally {
      setSaving(false);
    }
  };

  const runPartnerAction = async () => {
    if (!action) return;
    setBusyPartnerId(action.partner.id);
    try {
      const response = action.type === "delete"
        ? await fetch(`/api/accounting/partners/${action.partner.id}`, { method: "DELETE" })
        : await fetch(`/api/accounting/partners/${action.partner.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ isActive: action.type === "restore" }),
          });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || "Failed to update partner");
      addNotification({
        title: action.type === "delete" ? "Partner deleted" : action.type === "archive" ? "Partner archived" : "Partner restored",
        message: action.type === "delete" ? "The unused partner record was permanently removed." : `${action.partner.name} is now ${action.type === "archive" ? "archived" : "active"}.`,
        type: "success",
        category: "accounting",
      });
      setAction(null);
      await load();
    } catch (error) {
      addNotification({ title: "Cannot update partner", message: error instanceof Error ? error.message : "Failed to update partner", type: "error", category: "accounting" });
    } finally {
      setBusyPartnerId(null);
    }
  };

  const addNewPartner = async () => {
    if (!newPartner.code.trim() || !newPartner.name.trim()) return;
    await savePartner({ ...newPartner, code: newPartner.code.trim().toUpperCase(), name: newPartner.name.trim() });
    setNewPartner({ code: "", name: "", capitalAccountId: "", drawingsAccountId: "" });
  };

  const saveAllocations = async () => {
    if (!selectedYearId || Math.abs(allocationTotal - 100) > 0.01) {
      addNotification({ title: "Allocation must equal 100%", message: `Current total is ${allocationTotal.toFixed(2)}%.`, type: "error", category: "accounting" });
      return;
    }
    setSaving(true);
    try {
      const response = await fetch(`/api/accounting/financial-years/${selectedYearId}/allocations`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ allocations }),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || "Failed to save allocations");
      addNotification({ title: "Allocation saved", message: "The financial-year allocation totals 100%.", type: "success", category: "accounting" });
      await load();
    } catch (error) {
      addNotification({ title: "Error", message: error instanceof Error ? error.message : "Failed to save allocations", type: "error", category: "accounting" });
    } finally {
      setSaving(false);
    }
  };

  const renderPartner = (partner: Partner) => {
    const hasHistory = Boolean(partner._count && (partner._count.allocations > 0 || partner._count.businessTransactions > 0));
    return (
      <div key={partner.id} className={`grid gap-3 rounded-lg border p-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_minmax(0,1.4fr)_minmax(0,1.4fr)_auto] md:items-end ${!partner.isActive ? "bg-muted/30" : ""}`}>
        <div><Label>Code</Label><Input value={partner.code} disabled /></div>
        <div><Label>Name</Label><Input value={partner.name} disabled={!canEdit || !partner.isActive} onChange={(event) => setPartners((items) => items.map((item) => item.id === partner.id ? { ...item, name: event.target.value } : item))} /></div>
        <div><Label>Capital account</Label><select className='h-10 w-full rounded-md border bg-background px-3 text-sm' value={partner.capitalAccountId || ""} disabled={!canEdit || !partner.isActive} onChange={(event) => setPartners((items) => items.map((item) => item.id === partner.id ? { ...item, capitalAccountId: event.target.value } : item))}><option value=''>Select account</option>{equityAccounts.map((account) => <option key={account.id} value={account.id}>{account.code} - {account.name}</option>)}</select></div>
        <div><Label>Drawings account</Label><div className='flex gap-2'><select className='h-10 min-w-0 flex-1 rounded-md border bg-background px-3 text-sm' value={partner.drawingsAccountId || ""} disabled={!canEdit || !partner.isActive} onChange={(event) => setPartners((items) => items.map((item) => item.id === partner.id ? { ...item, drawingsAccountId: event.target.value } : item))}><option value=''>Select account</option>{equityAccounts.map((account) => <option key={account.id} value={account.id}>{account.code} - {account.name}</option>)}</select>{canEdit && partner.isActive && <Button size='icon' variant='outline' disabled={saving} onClick={() => void savePartner(partner)} aria-label={`Save ${partner.name}`}><Save className='h-4 w-4' /></Button>}</div></div>
        {canEdit && <div className='flex items-center gap-2 md:justify-end'><Badge variant={partner.isActive ? "default" : "secondary"}>{partner.isActive ? "Active" : "Archived"}</Badge>{partner.isActive ? <Button size='icon' variant='outline' disabled={busyPartnerId === partner.id} onClick={() => setAction({ partner, type: "archive" })} aria-label={`Archive ${partner.name}`}><Archive className='h-4 w-4' /></Button> : <Button size='icon' variant='outline' disabled={busyPartnerId === partner.id} onClick={() => setAction({ partner, type: "restore" })} aria-label={`Restore ${partner.name}`}><RotateCcw className='h-4 w-4' /></Button>}{!hasHistory && <Button size='icon' variant='destructive' disabled={busyPartnerId === partner.id} onClick={() => setAction({ partner, type: "delete" })} aria-label={`Delete ${partner.name}`}><Trash2 className='h-4 w-4' /></Button>}</div>}
      </div>
    );
  };

  return (
    <div className='flex-1 space-y-6 p-4 pt-6 md:p-8'>
      <div><h1 className='text-3xl font-bold tracking-tight'>Partnership settings</h1><p className='text-muted-foreground'>Configure partner capital, drawings, and financial-year profit allocation.</p></div>
      <Card>
        <CardHeader><CardTitle className='flex items-center gap-2'><Users className='h-5 w-5' />Partners</CardTitle><CardDescription>Archived partners stay attached to historical accounting records but cannot be selected for new drawings.</CardDescription></CardHeader>
        <CardContent className='space-y-5'>
          {activePartners.length > 0 ? <div className='space-y-3'>{activePartners.map(renderPartner)}</div> : <p className='rounded-md border border-dashed p-4 text-sm text-muted-foreground'>No active partners configured.</p>}
          {archivedPartners.length > 0 && <div className='space-y-3'><div className='flex items-center gap-2 text-sm font-medium text-muted-foreground'><Archive className='h-4 w-4' />Archived partners</div>{archivedPartners.map(renderPartner)}</div>}
          {canEdit && <div className='grid gap-3 rounded-lg border border-dashed p-4 md:grid-cols-5 md:items-end'><div><Label>New code</Label><Input value={newPartner.code} onChange={(event) => setNewPartner({ ...newPartner, code: event.target.value })} placeholder='BROTHER' /></div><div><Label>Name</Label><Input value={newPartner.name} onChange={(event) => setNewPartner({ ...newPartner, name: event.target.value })} placeholder='Brother' /></div><div><Label>Capital account</Label><select className='h-10 w-full rounded-md border bg-background px-3 text-sm' value={newPartner.capitalAccountId} onChange={(event) => setNewPartner({ ...newPartner, capitalAccountId: event.target.value })}><option value=''>Select account</option>{equityAccounts.map((account) => <option key={account.id} value={account.id}>{account.code} - {account.name}</option>)}</select></div><div><Label>Drawings account</Label><select className='h-10 w-full rounded-md border bg-background px-3 text-sm' value={newPartner.drawingsAccountId} onChange={(event) => setNewPartner({ ...newPartner, drawingsAccountId: event.target.value })}><option value=''>Select account</option>{equityAccounts.map((account) => <option key={account.id} value={account.id}>{account.code} - {account.name}</option>)}</select></div><Button onClick={() => void addNewPartner()} disabled={saving || !newPartner.code.trim() || !newPartner.name.trim()}><Plus className='mr-2 h-4 w-4' />Add partner</Button></div>}
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Financial-year allocation</CardTitle><CardDescription>Profit allocation must total exactly 100% before it can be saved.</CardDescription></CardHeader>
        <CardContent className='space-y-4'><select className='h-10 w-full rounded-md border bg-background px-3 text-sm' value={selectedYearId} onChange={(event) => setSelectedYearId(event.target.value)}>{years.map((year) => <option key={year.id} value={year.id}>{year.name}{year.isClosed ? " (Closed)" : ""}</option>)}</select>{partners.map((partner) => { const allocation = allocations.find((item) => item.partnerId === partner.id); return <div key={partner.id} className='flex items-center gap-3'><span className='flex-1'>{partner.name}{!partner.isActive && <span className='ml-2 text-xs text-muted-foreground'>(Archived)</span>}</span><Input className='w-32' type='number' min='0' max='100' step='0.01' value={allocation?.percentage ?? 0} disabled={!canEdit || years.find((year) => year.id === selectedYearId)?.isClosed} onChange={(event) => setAllocations((items) => [...items.filter((item) => item.partnerId !== partner.id), { partnerId: partner.id, percentage: Number(event.target.value) }])} /><span>%</span></div>; })}<div className='flex items-center justify-between rounded-md border p-3'><span>Total allocation</span><Badge variant={Math.abs(allocationTotal - 100) < 0.01 ? "default" : "destructive"}>{allocationTotal.toFixed(2)}%</Badge></div>{canEdit && <Button onClick={() => void saveAllocations()} disabled={saving || years.find((year) => year.id === selectedYearId)?.isClosed}><Save className='mr-2 h-4 w-4' />Save allocation</Button>}</CardContent>
      </Card>
      <AlertDialog open={Boolean(action)} onOpenChange={(open) => !open && setAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{action?.type === "delete" ? "Permanently delete partner?" : action?.type === "archive" ? "Archive partner?" : "Restore partner?"}</AlertDialogTitle>
            <AlertDialogDescription>{action?.type === "delete" ? "This removes the unused partner record permanently. Partners with allocations or business transactions cannot be deleted." : action?.type === "archive" ? "The partner will be hidden from new transactions while historical allocations and transactions remain unchanged." : "The partner will become available for new transactions again."}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel disabled={Boolean(busyPartnerId)}>Cancel</AlertDialogCancel><AlertDialogAction onClick={(event) => { event.preventDefault(); void runPartnerAction(); }} disabled={Boolean(busyPartnerId)}>{busyPartnerId && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}{action?.type === "delete" ? "Delete permanently" : action?.type === "archive" ? "Archive partner" : "Restore partner"}</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
