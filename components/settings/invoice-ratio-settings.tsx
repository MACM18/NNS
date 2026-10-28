"use client";

import { useEffect, useState } from "react";
import { Save } from "lucide-react";
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
  return <Card className="w-full">
    <CardHeader><CardTitle>Invoice split</CardTitle><CardDescription>Choose how the 100% service value is divided between Invoice A and Invoice B. Existing invoices keep the ratio saved with them.</CardDescription></CardHeader>
    <CardContent className="flex flex-wrap items-end gap-4">
      <label className="space-y-2 text-sm"><span className="block font-medium">Invoice A (%)</span><Input type="number" min={1} max={99} step={1} disabled={loading || saving} value={percentA} onChange={event => setPercentA(Number(event.target.value))} className="w-32" /></label>
      <span className="pb-2 text-muted-foreground">+</span>
      <label className="space-y-2 text-sm"><span className="block font-medium">Invoice B (%)</span><Input type="number" min={1} max={99} step={1} disabled={loading || saving} value={percentB} onChange={event => setPercentB(Number(event.target.value))} className="w-32" /></label>
      <span className="pb-2 text-sm text-muted-foreground">Must total 100%</span>
      <Button onClick={() => void save()} disabled={loading || saving || !valid}><Save className="mr-2 h-4 w-4" />{saving ? "Saving…" : "Save ratio"}</Button>
    </CardContent>
  </Card>;
}
