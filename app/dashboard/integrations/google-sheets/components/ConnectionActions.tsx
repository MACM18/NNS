"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarDays, ExternalLink, FileSpreadsheet, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNotification } from "@/contexts/notification-context";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import SyncSheetButtonV2 from "@/components/integrations/SyncSheetButtonV2";
import AutoSyncConnectionToggle from "./AutoSyncConnectionToggle";

type Connection = { id: string; month: number | string; year: number; sheet_url: string; sheet_name: string | null; sheet_tab: string | null; last_synced: string | null; status: string | null; record_count: number | null; auto_sync_enabled: boolean; material_balance_import: { imported_at: string; status: string; updated_stock_count: number } | null };
type Props = { connection: Connection; eligible: boolean };

export default function ConnectionActions({ connection, eligible }: Props) {
  const { addNotification } = useNotification();
  const [openDelete, setOpenDelete] = React.useState(false);
  const [deletePending, setDeletePending] = React.useState(false);
  const router = useRouter();
  const triggerDelete = async () => {
    setDeletePending(true);
    try {
      const res = await fetch("/api/integrations/google-sheets/connection", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ connectionId: connection.id }) });
      const data = await res.json(); if (res.status === 401) throw new Error("Sign in required to delete this connection."); if (!res.ok) throw new Error(data?.error || "Delete failed");
      addNotification({ title: "Connection deleted", message: "The Google Sheet connection was removed.", type: "success", category: "system" }); router.refresh();
    } catch (e: any) { addNotification({ title: "Delete failed", message: e?.message || "Unknown error", type: "error", category: "system" }); }
    finally { setDeletePending(false); }
  };
  const monthLabel = typeof connection.month === "number" ? new Intl.DateTimeFormat("en", { month: "long" }).format(new Date(2020, connection.month - 1, 1)) : String(connection.month);
  const format = (value: string | null) => value ? new Date(value).toLocaleString() : "Not synced yet";
  return <>
    <Dialog>
      <DialogTrigger asChild><Button variant="outline" size="sm" className="gap-2"><FileSpreadsheet className="h-4 w-4" /><span>Details</span></Button></DialogTrigger>
      <DialogContent className="max-h-[90dvh] max-w-lg overflow-y-auto">
        <DialogHeader><DialogTitle>{monthLabel} {connection.year} sheet</DialogTitle><DialogDescription>Connection status, import activity, and available actions.</DialogDescription></DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="rounded-lg border p-3"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate font-medium">{connection.sheet_name || "Google Sheet"}</p><p className="mt-1 text-xs text-muted-foreground">{connection.sheet_tab || "Default tab"}</p></div><span className="rounded-full bg-muted px-2 py-1 text-xs">{connection.status || "Unknown"}</span></div><a className="mt-3 inline-flex items-center gap-1 break-all text-sm text-primary underline" href={connection.sheet_url} target="_blank" rel="noreferrer">Open sheet <ExternalLink className="h-3 w-3 shrink-0" /></a></div>
          <div className="grid grid-cols-2 gap-3"><div className="rounded-lg bg-muted/40 p-3"><p className="text-xs text-muted-foreground">Records</p><p className="mt-1 font-semibold">{connection.record_count ?? 0}</p></div><div className="rounded-lg bg-muted/40 p-3"><p className="text-xs text-muted-foreground">Last synced</p><p className="mt-1 text-sm font-medium">{format(connection.last_synced)}</p></div><div className="col-span-2 rounded-lg bg-muted/40 p-3"><p className="text-xs text-muted-foreground">Material balance import</p><p className="mt-1 text-sm font-medium">{connection.material_balance_import?.status || "Not imported"}{connection.material_balance_import ? ` · ${connection.material_balance_import.updated_stock_count} stock rows updated` : ""}</p><p className="text-xs text-muted-foreground">{format(connection.material_balance_import?.imported_at || null)}</p></div></div>
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3"><div><p className="text-sm font-medium">Daily import selection</p><p className="text-xs text-muted-foreground">{eligible ? "This is the latest eligible sheet." : "Older sheets are manual only."}</p></div><AutoSyncConnectionToggle connectionId={connection.id} checked={connection.auto_sync_enabled} eligible={eligible} />
          </div>
          <div className="flex flex-wrap gap-2"><SyncSheetButtonV2 connectionId={connection.id} onSyncComplete={() => router.refresh()} /><Button variant="outline" size="sm" asChild><Link href={`/dashboard/integrations/google-sheets/${connection.id}/logs`}>View logs</Link></Button><Button variant="outline" size="sm" asChild><Link href="/dashboard/inventory?tab=material-balance"><CalendarDays className="mr-2 h-4 w-4" />Material balance</Link></Button><Button variant="destructive" size="sm" onClick={() => setOpenDelete(true)}><Trash2 className="mr-2 h-4 w-4" />Delete</Button></div>
        </div>
      </DialogContent>
    </Dialog>
    <Dialog open={openDelete} onOpenChange={setOpenDelete}><DialogContent><DialogHeader><DialogTitle>Delete this connection?</DialogTitle><DialogDescription>This can’t be undone. The connection record will be removed.</DialogDescription></DialogHeader><DialogFooter><Button variant="outline" onClick={() => setOpenDelete(false)}>Cancel</Button><Button variant="destructive" onClick={() => { setOpenDelete(false); void triggerDelete(); }} disabled={deletePending}>{deletePending ? "Deleting..." : "Delete"}</Button></DialogFooter></DialogContent></Dialog>
  </>;
}
