"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

type LineReview = { id: string; telephoneNo: string | null; sheetRow: number | null; status: string; operation: string | null; fields: string[]; error: string | null; period?: { month: number; year: number } };
type IssuedReview = { id: string; item: string; date: string; observedValue: number | null; proposedValue: number; status: string; error: string | null };
type ReviewData = { lines: LineReview[]; issued: IssuedReview[] };
type Choice = { id: string; action: string; title: string; detail: string };

export default function SheetSyncReview() {
  const [data, setData] = useState<ReviewData>({ lines: [], issued: [] });
  const [loading, setLoading] = useState(true);
  const [choice, setChoice] = useState<Choice | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/integrations/google-sheets/sync-review", { cache: "no-store" });
      if (!response.ok) throw new Error("Could not load sheet sync activity");
      setData(await response.json());
      setError(null);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not load activity"); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void refresh(); }, [refresh]);
  const confirm = async () => {
    if (!choice) return;
    setBusy(true);
    try {
      const response = await fetch("/api/integrations/google-sheets/sync-review", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: choice.id, action: choice.action }),
      });
      if (!response.ok) throw new Error((await response.json().catch(() => ({}))).error || "Could not resolve this item");
      setChoice(null);
      await refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not resolve this item"); }
    finally { setBusy(false); }
  };
  const reviewCount = data.lines.filter((item) => item.status === "review").length + data.issued.filter((item) => item.status === "review").length;
  const pendingCount = data.lines.filter((item) => item.status === "pending").length + data.issued.filter((item) => item.status === "pending").length;
  return <>
    <Card className="mb-6">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><CardTitle className="flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-amber-600" /> Sheet sync review</CardTitle>
            <CardDescription>App changes are saved even when Google is unavailable. Review differences before either source is replaced.</CardDescription></div>
          <div className="flex items-center gap-2"><Badge variant={reviewCount ? "destructive" : "secondary"}>{reviewCount} to review</Badge><Badge variant="outline">{pendingCount} pending</Badge><Button variant="outline" size="sm" onClick={() => void refresh()} disabled={loading}><RefreshCw className="mr-2 h-4 w-4" />Refresh</Button></div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {error && <p role="alert" className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
        {!loading && !data.lines.length && !data.issued.length && <p className="text-sm text-muted-foreground">No pending writes or differences.</p>}
        {data.lines.map((item) => <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3 text-sm">
          <div className="min-w-0"><p className="font-medium">Line {item.telephoneNo || "deleted in app"}{item.sheetRow ? ` · All row ${item.sheetRow}` : ""} <Badge variant={item.status === "review" ? "destructive" : "secondary"} className="ml-1">{item.status}</Badge></p><p className="text-muted-foreground">{item.error || (item.status === "pending" ? "Waiting for Google Sheets" : item.fields.join(", "))}</p></div>
          {item.status === "review" && <div className="flex flex-wrap gap-2">
            {item.operation === "delete" ? <Button size="sm" variant="outline" onClick={() => setChoice({ id: item.id, action: "clear_sheet", title: "Clear sheet entry?", detail: "This removes the linked All and Drum Number input values while keeping formulas." })}>Clear sheet row</Button> : <>
              <Button size="sm" variant="outline" onClick={() => setChoice({ id: item.id, action: "keep_app", title: "Use the app line?", detail: "The current app values will be written to the connected sheet." })}>Keep app values</Button>
              {item.fields.includes("sheet_row") ? <Button size="sm" variant="outline" onClick={() => setChoice({ id: item.id, action: "remove_app", title: "Remove app line?", detail: "The sheet row is missing. This removes the app record and its active assignments." })}>Remove app line</Button> : <Button size="sm" variant="outline" onClick={() => setChoice({ id: item.id, action: "keep_sheet", title: "Use the sheet line?", detail: "The sheet values will be imported into the app on the next sync." })}>Keep sheet values</Button>}
            </>}
          </div>}
        </div>)}
        {data.issued.map((item) => <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3 text-sm">
          <div><p className="font-medium">Issued · {item.item} · {item.date} <Badge variant={item.status === "review" ? "destructive" : "secondary"} className="ml-1">{item.status}</Badge></p><p className="text-muted-foreground">{item.error || "Waiting for Google Sheets"}{item.observedValue != null ? ` · Sheet ${item.observedValue} → App invoices ${item.proposedValue}` : ` · App invoices ${item.proposedValue}`}</p></div>
          {item.status === "review" && item.observedValue != null && <Button size="sm" variant="outline" onClick={() => setChoice({ id: item.id, action: "approve_issued", title: "Replace Issued value?", detail: `The existing sheet value ${item.observedValue} will be replaced with ${item.proposedValue}, the total of app inventory invoices for this item and day.` })}>Approve replacement</Button>}
        </div>)}
      </CardContent>
    </Card>
    <AlertDialog open={Boolean(choice)} onOpenChange={(open) => { if (!open && !busy) setChoice(null); }}>
      <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>{choice?.title}</AlertDialogTitle><AlertDialogDescription>{choice?.detail}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel><AlertDialogAction disabled={busy} onClick={(event) => { event.preventDefault(); void confirm(); }}>{busy ? "Applying…" : "Confirm"}</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
    </AlertDialog>
  </>;
}
