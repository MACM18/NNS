"use client";

import { useEffect, useState } from "react";
import { Check, Save, Split } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useNotification } from "@/contexts/notification-context";

export function InvoiceRatioSettings() {
  const { addNotification } = useNotification();
  const [percentA, setPercentA] = useState(90);
  const [percentB, setPercentB] = useState(10);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    void fetch("/api/invoices/settings").then(async response => {
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not load invoice settings.");
      if (active) {
        setPercentA(Number(result.data.percentA));
        setPercentB(Number(result.data.percentB));
      }
    }).catch(error => addNotification({ title: "Invoice settings unavailable", message: error instanceof Error ? error.message : "Try again.", type: "error", category: "system" })).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [addNotification]);

  const save = async () => {
    setSaving(true);
    try {
      const response = await fetch("/api/invoices/settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ percentA, percentB }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not save invoice settings.");
      setPercentA(result.data.percentA);
      setPercentB(result.data.percentB);
      addNotification({ title: "Invoice ratio saved", message: `New invoices will use ${percentA}% for A and ${percentB}% for B. Existing invoice snapshots keep their saved ratio.`, type: "success", category: "system" });
    } catch (error) {
      addNotification({ title: "Could not save invoice ratio", message: error instanceof Error ? error.message : "Try again.", type: "error", category: "system" });
    } finally { setSaving(false); }
  };

  const valid = Number.isInteger(percentA) && Number.isInteger(percentB) && percentA >= 1 && percentA <= 99 && percentB >= 1 && percentB <= 99 && percentA + percentB === 100;
  return <Card className="w-full overflow-hidden border-sky-200/70 shadow-sm">
    <CardHeader className="flex flex-row items-start gap-3 space-y-0 bg-gradient-to-r from-sky-50 to-white px-5 py-4 dark:from-sky-950/30 dark:to-card">
      <span className="rounded-xl bg-sky-100 p-2 text-sky-700 dark:bg-sky-900/60 dark:text-sky-300"><Split className="h-5 w-5" /></span>
      <div className="min-w-0"><CardTitle className="text-base">Invoice split</CardTitle><CardDescription className="mt-1">Set the share for each invoice. Saved invoices keep their original split.</CardDescription></div>
    </CardHeader>
    <CardContent className="grid gap-4 px-5 py-4 md:grid-cols-[minmax(0,1fr)_minmax(220px,0.8fr)_auto] md:items-end">
      <div className="grid grid-cols-2 gap-3">
        <label className="space-y-1.5 text-sm"><span className="block font-medium">Invoice A</span><div className="relative"><Input type="number" min={1} max={99} step={1} disabled={loading || saving} value={percentA} onChange={event => setPercentA(Number(event.target.value))} className="pr-8" /><span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span></div></label>
        <label className="space-y-1.5 text-sm"><span className="block font-medium">Invoice B</span><div className="relative"><Input type="number" min={1} max={99} step={1} disabled={loading || saving} value={percentB} onChange={event => setPercentB(Number(event.target.value))} className="pr-8" /><span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span></div></label>
      </div>
      <div className="space-y-2 rounded-xl bg-muted/40 p-3">
        <div className="flex items-center justify-between text-xs font-medium"><span>100% invoice value</span><span className={valid ? "text-emerald-700 dark:text-emerald-400" : "text-destructive"}>{percentA + percentB}% {valid ? "balanced" : "· must equal 100%"}</span></div>
        <div className="flex h-2.5 overflow-hidden rounded-full bg-background"><span className="bg-sky-600 transition-[width]" style={{ width: `${Math.max(0, Math.min(100, percentA))}%` }} /><span className="bg-indigo-300 transition-[width] dark:bg-indigo-500" style={{ width: `${Math.max(0, Math.min(100, percentB))}%` }} /></div>
        <div className="flex justify-between text-xs text-muted-foreground"><span>A · {percentA}%</span><span>B · {percentB}%</span></div>
      </div>
      <Button onClick={() => void save()} disabled={loading || saving || !valid} className="w-full md:w-auto">{saving ? <Save className="mr-2 h-4 w-4" /> : <Check className="mr-2 h-4 w-4" />}{saving ? "Saving…" : "Save split"}</Button>
    </CardContent>
  </Card>;
}
