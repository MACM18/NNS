"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, FileSpreadsheet, LockKeyhole, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useNotification } from "@/contexts/notification-context";
import type { MaterialBalanceImport, MaterialBalanceItemSnapshot } from "@/types/material-balance";

interface ConnectionOption {
  id: string;
  month: number;
  year: number;
  sheetName: string | null;
  status: string;
  materialBalanceImport: {
    importedAt: string;
    status: string;
    updatedStockCount: number;
  } | null;
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(value);
}

function statusBadge(status: string) {
  if (status === "mapped") {
    return <Badge variant="outline" className="text-green-700 border-green-300 dark:text-green-400">Mapped</Badge>;
  }
  if (status === "warning") {
    return <Badge variant="outline" className="text-amber-700 border-amber-300 dark:text-amber-400">Warning</Badge>;
  }
  return <Badge variant="outline" className="text-muted-foreground">Unmapped</Badge>;
}

export function MaterialBalanceTab() {
  const { addNotification } = useNotification();
  const [connections, setConnections] = useState<ConnectionOption[]>([]);
  const [connectionId, setConnectionId] = useState("");
  const [importData, setImportData] = useState<MaterialBalanceImport | null>(null);
  const [date, setDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadConnections = useCallback(async () => {
    const response = await fetch("/api/integrations/google-sheets/connection", { credentials: "include" });
    if (!response.ok) throw new Error("Failed to load Google Sheet connections");
    const payload = await response.json();
    const rows = Array.isArray(payload.data) ? payload.data : [];
    setConnections(rows);
    if (!connectionId && rows[0]?.id) setConnectionId(rows[0].id);
  }, [connectionId]);

  const loadBalance = useCallback(async (id: string, selectedDate = "") => {
    if (!id) {
      setImportData(null);
      return;
    }
    const query = selectedDate ? `?date=${encodeURIComponent(selectedDate)}` : "";
    const response = await fetch(`/api/integrations/google-sheets/connections/${id}/material-balance${query}`, { credentials: "include" });
    if (!response.ok) throw new Error("Failed to load Material Balance");
    const payload = await response.json();
    setImportData(payload.data || null);
  }, []);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    setLoadError(null);
    try {
      await loadConnections();
      await loadBalance(connectionId, date);
    } catch (error: any) {
      setLoadError(error?.message || "Failed to load imported stock data");
      addNotification({
        title: "Material Balance unavailable",
        message: error?.message || "Failed to load imported stock data",
        type: "error",
        category: "system",
      });
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  }, [addNotification, connectionId, date, loadBalance, loadConnections]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (connectionId) void loadBalance(connectionId, date);
  }, [connectionId, date, loadBalance]);

  const dates = useMemo(() => {
    const values = new Set<string>();
    for (const item of importData?.items || []) {
      for (const entry of item.dailyEntries) values.add(entry.date);
    }
    return Array.from(values).sort();
  }, [importData]);

  const selectedConnection = connections.find((connection) => connection.id === connectionId);
  const negativeCount = (importData?.items || []).filter((item) =>
    [item.openingBalance, item.finalBalance, ...item.dailyEntries.flatMap((entry) => [entry.previousBalance, entry.closingBalance])]
      .some((value) => value < 0)
  ).length;
  const conflictCount = (importData?.items || []).filter((item) =>
    item.inventoryItem?.lastStockEvent && !item.inventoryItem.lastStockEvent.sourceType.startsWith("google_material_balance")
  ).length;
  const totalIssued = (importData?.items || []).reduce((sum, item) => sum + item.totalIssued, 0);
  const totalUsage = (importData?.items || []).reduce((sum, item) => sum + item.totalUsage, 0);
  const totalReturned = (importData?.items || []).reduce((sum, item) => sum + item.totalReturned, 0);

  return (
    <div className="space-y-4">
      <Card className="border-blue-200/70 bg-blue-50/40 dark:border-blue-900/50 dark:bg-blue-950/20">
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <LockKeyhole className="mt-0.5 h-5 w-5 text-blue-600 dark:text-blue-400" />
            <div>
              <p className="font-semibold">Material Balance is read-only from Google Sheets</p>
              <p className="text-sm text-muted-foreground">
                The sync reads the sheet and updates operational stock in this app. It never edits the source sheet or creates accounting purchases.
              </p>
            </div>
          </div>
          <Button asChild variant="outline" size="sm" className="shrink-0 gap-2">
            <Link href="/dashboard/integrations/google-sheets"><FileSpreadsheet className="h-4 w-4" />Open sync settings</Link>
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Google Sheet Material Balance</CardTitle>
            <CardDescription>Imported stock balances, daily issuance, usage, and returns.</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => void refresh()} disabled={refreshing} className="gap-2">
            <RefreshCw className={refreshing ? "h-4 w-4 animate-spin" : "h-4 w-4"} />Reload imported data
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <label className="space-y-1.5 text-sm">
              <span className="font-medium">Connected sheet</span>
              <select
                value={connectionId}
                onChange={(event) => { setConnectionId(event.target.value); setDate(""); }}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                {connections.length === 0 && <option value="">No connections found</option>}
                {connections.map((connection) => (
                  <option key={connection.id} value={connection.id}>
                    {MONTHS[connection.month - 1] || connection.month} {connection.year}{connection.sheetName ? ` — ${connection.sheetName}` : ""}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1.5 text-sm">
              <span className="font-medium">Daily view</span>
              <select
                value={date}
                onChange={(event) => setDate(event.target.value)}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">Whole imported period</option>
                {dates.map((value) => <option key={value} value={value}>{value}</option>)}
              </select>
            </label>
          </div>

          {selectedConnection && (
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <Badge variant="outline">Source tabs: Material Balance + Month-end</Badge>
              <Badge variant="outline">Connection: {selectedConnection.status}</Badge>
              {importData?.importedAt && <span>Last imported {new Date(importData.importedAt).toLocaleString()}</span>}
            </div>
          )}

          {loadError ? (
            <div className="flex items-start gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 p-4 text-sm text-amber-700 dark:text-amber-300" role="alert">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <div><p className="font-semibold">Material Balance could not be loaded</p><p className="mt-1">{loadError}</p></div>
            </div>
          ) : loading ? (
            <div className="h-48 animate-pulse rounded-lg bg-muted" />
          ) : !importData ? (
            <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
              No Material Balance import is available yet. Run Sync from the Google Sheets integration page.
            </div>
          ) : (
            <>
              <div className="space-y-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Stock overview</p>
                  <div className="mt-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <Metric label="Items imported" value={importData.itemCount} />
                    <Metric label="Stock updated" value={importData.updatedStockCount} />
                    <Metric label="Month-end reconciliations" value={importData.reconciliationCount} />
                    <Metric label="Warnings" value={importData.warnings.length + importData.discrepancies.length} tone={importData.warnings.length + importData.discrepancies.length > 0 ? "warning" : "default"} />
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Sync activity</p>
                  <div className="mt-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
                    <Metric label="New issue receipts" value={importData.dailyIssueInvoiceCount} />
                    <Metric label="Updated receipts" value={importData.dailyIssueInvoiceUpdateCount} />
                    <Metric label="Reversed receipts" value={importData.dailyIssueInvoiceReversalCount} />
                    <Metric label="Corrections" value={importData.correctionInvoiceCount} />
                    <Metric label="Issued quantity" value={formatNumber(totalIssued)} />
                    <Metric label="Usage / returned" value={`${formatNumber(totalUsage)} / ${formatNumber(totalReturned)}`} />
                  </div>
                </div>
              </div>

              {(negativeCount > 0 || importData.warnings.length > 0 || conflictCount > 0 || importData.discrepancies.length > 0) && (
                <div className="space-y-2 rounded-lg border border-amber-300/70 bg-amber-50/60 p-3 text-sm dark:border-amber-900/60 dark:bg-amber-950/20">
                  <div className="flex items-center gap-2 font-semibold text-amber-800 dark:text-amber-300"><AlertTriangle className="h-4 w-4" />Review required</div>
                  <ul className="list-disc space-y-1 pl-5 text-amber-800/90 dark:text-amber-200/90">
                    {negativeCount > 0 && <li>{negativeCount} item(s) contain negative balances from the source sheet.</li>}
                    {conflictCount > 0 && <li>{conflictCount} mapped item(s) were changed by another app stock operation after the last sheet import.</li>}
                    {importData.discrepancies.length > 0 && <li>{importData.discrepancies.length} daily/month-end reconciliation discrepancy(ies) were recorded without changing the source values.</li>}
                    {importData.warnings.slice(0, 3).map((warning) => <li key={warning}>{warning}</li>)}
                  </ul>
                </div>
              )}

              <div className="hidden overflow-x-auto rounded-lg border md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Material</TableHead>
                      <TableHead>Unit</TableHead>
                      <TableHead className="text-right">Opening</TableHead>
                      <TableHead className="text-right">Issued</TableHead>
                      <TableHead className="text-right">Usage</TableHead>
                      <TableHead className="text-right">Return</TableHead>
                      <TableHead className="text-right">Closing</TableHead>
                      <TableHead className="text-right">Ending WIP</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {importData.items.map((item: MaterialBalanceItemSnapshot) => {
                      const day = date ? item.dailyEntries[0] : null;
                      return (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">{item.sourceItemName}</TableCell>
                          <TableCell>{item.sourceUnit || item.inventoryItem?.unit || "—"}</TableCell>
                          <TableCell className="text-right">{formatNumber(day?.previousBalance ?? item.openingBalance)}</TableCell>
                          <TableCell className="text-right">{formatNumber(day?.issued ?? item.totalIssued)}</TableCell>
                          <TableCell className="text-right">{formatNumber(day?.usage ?? item.totalUsage)}</TableCell>
                          <TableCell className="text-right">{formatNumber(day?.balanceReturn ?? item.totalReturned)}</TableCell>
                          <TableCell className="text-right font-semibold">{formatNumber(day?.closingBalance ?? item.finalBalance)}</TableCell>
                          <TableCell className="text-right font-semibold">{item.monthEndingWip == null ? "—" : formatNumber(item.monthEndingWip)}</TableCell>
                          <TableCell>{statusBadge(item.status)}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
              <div className="grid gap-3 md:hidden">
                {importData.items.map((item: MaterialBalanceItemSnapshot) => {
                  const day = date ? item.dailyEntries[0] : null;
                  return (
                    <div key={item.id} className="rounded-xl border bg-card/60 p-4 shadow-sm">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0"><p className="truncate font-semibold">{item.sourceItemName}</p><p className="text-xs text-muted-foreground">{item.sourceUnit || item.inventoryItem?.unit || "Unit not set"}</p></div>
                        {statusBadge(item.status)}
                      </div>
                      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                        <BalanceValue label="Opening" value={day?.previousBalance ?? item.openingBalance} />
                        <BalanceValue label="Issued" value={day?.issued ?? item.totalIssued} />
                        <BalanceValue label="Usage" value={day?.usage ?? item.totalUsage} />
                        <BalanceValue label="Returned" value={day?.balanceReturn ?? item.totalReturned} />
                        <BalanceValue label="Closing" value={day?.closingBalance ?? item.finalBalance} strong />
                        <BalanceValue label="Ending WIP" value={item.monthEndingWip} strong />
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Metric({ label, value, tone = "default" }: { label: string; value: number | string; tone?: "default" | "warning" }) {
  return (
    <div className={`rounded-lg border p-3 ${tone === "warning" ? "border-amber-500/20 bg-amber-500/5" : "bg-muted/20"}`}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-semibold">{value}</p>
    </div>
  );
}

function BalanceValue({ label, value, strong = false }: { label: string; value: number | null | undefined; strong?: boolean }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`${strong ? "font-semibold" : ""} ${value != null && value < 0 ? "text-red-600 dark:text-red-400" : ""}`}>{value == null ? "—" : formatNumber(value)}</p>
    </div>
  );
}
