"use client";

import { useEffect, useState } from "react";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNotification } from "@/contexts/notification-context";

type CompanyDetails = {
  company_name: string; address: string; contact_numbers: string[]; website: string;
  registered_number: string; bank_details: Record<string, string>; pricing_tiers?: unknown;
};

const BANK_FIELDS = [
  ["account_title", "Account title"], ["bank_name", "Bank"], ["account_number", "Account number"],
  ["branch_code", "Branch"], ["iban", "IBAN"],
] as const;

export function InvoiceCompanyDetailsDialog({ open, onOpenChange, company, onSaved }: {
  open: boolean; onOpenChange: (open: boolean) => void; company: CompanyDetails | null; onSaved: (value: CompanyDetails) => void;
}) {
  const { addNotification } = useNotification();
  const [draft, setDraft] = useState<CompanyDetails | null>(company);
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (open && company) setDraft({ ...company, contact_numbers: Array.isArray(company.contact_numbers) ? company.contact_numbers : [], bank_details: { ...(company.bank_details || {}) } }); }, [open, company]);
  const set = (key: keyof CompanyDetails, value: string) => setDraft(current => current ? { ...current, [key]: value } : current);
  const setBank = (key: string, value: string) => setDraft(current => current ? { ...current, bank_details: { ...current.bank_details, [key]: value } } : current);
  const save = async () => {
    if (!draft) return;
    setSaving(true);
    try {
      const response = await fetch("/api/settings/company", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(draft) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not save company and bank details.");
      onSaved(result.data);
      onOpenChange(false);
      addNotification({ title: "Invoice details updated", message: "Shared company and bank details are saved for future invoices.", type: "success", category: "system" });
    } catch (error) {
      addNotification({ title: "Could not update invoice details", message: error instanceof Error ? error.message : "Try again.", type: "error", category: "system" });
    } finally { setSaving(false); }
  };
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-h-[90dvh] max-w-2xl overflow-y-auto"><DialogHeader><DialogTitle>Company and bank details</DialogTitle><DialogDescription>These shared details appear on invoice previews and new PDFs. Only administrators can save changes.</DialogDescription></DialogHeader>
    {!draft ? <p className="text-sm text-muted-foreground">Company details are still loading.</p> : <div className="space-y-5">
      <section className="grid gap-3 sm:grid-cols-2"><h3 className="sm:col-span-2 text-sm font-semibold">Company</h3>
        {([["company_name", "Company name"], ["registered_number", "Registered number"], ["website", "Website"]] as const).map(([key, label]) => <label className="space-y-1.5" key={key}><Label htmlFor={`invoice-company-${key}`}>{label}</Label><Input id={`invoice-company-${key}`} value={draft[key]} onChange={event => set(key, event.target.value)} /></label>)}
        <label className="space-y-1.5 sm:col-span-2"><Label htmlFor="invoice-company-address">Address</Label><Input id="invoice-company-address" value={draft.address} onChange={event => set("address", event.target.value)} /></label>
        <label className="space-y-1.5 sm:col-span-2"><Label htmlFor="invoice-company-contacts">Contact numbers</Label><Input id="invoice-company-contacts" value={draft.contact_numbers.join(", ")} onChange={event => setDraft(current => current ? { ...current, contact_numbers: event.target.value.split(",").map(value => value.trim()).filter(Boolean) } : current)} /></label>
      </section>
      <section className="grid gap-3 sm:grid-cols-2"><h3 className="sm:col-span-2 text-sm font-semibold">Payment details</h3>{BANK_FIELDS.map(([key, label]) => <label className="space-y-1.5" key={key}><Label htmlFor={`invoice-bank-${key}`}>{label}</Label><Input id={`invoice-bank-${key}`} value={draft.bank_details?.[key] || ""} onChange={event => setBank(key, event.target.value)} /></label>)}</section>
    </div>}
    <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button disabled={!draft || saving} onClick={() => void save()}><Save className="mr-2 h-4 w-4" />{saving ? "Saving…" : "Save shared details"}</Button></DialogFooter>
  </DialogContent></Dialog>;
}
