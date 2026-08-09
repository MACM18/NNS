"use client";

import React from "react";
import { CalendarDays, Trash, TrendingDown } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TableSkeleton } from "@/components/skeletons/table-skeleton";
import { WasteReport } from "@/app/dashboard/inventory/page";

interface WasteTabProps {
  wasteReports: WasteReport[];
  loadingData: boolean;
  error?: string;
  role: string | null;
  onDelete: (waste: WasteReport) => void;
}

export function WasteTab({ wasteReports, loadingData, error, role, onDelete }: WasteTabProps) {
  const canDelete = role === "admin" || role === "superadmin";

  return (
    <Card className="glass-card overflow-hidden rounded-3xl border-border/40 shadow-sm">
      <CardHeader className="flex flex-col gap-2 border-b border-border/40 bg-muted/[0.12] sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardTitle className="text-lg font-bold">Waste and loss</CardTitle>
          <CardDescription>Keep a clear record of scrap, damage, and other stock losses.</CardDescription>
        </div>
        {!loadingData && !error && <Badge variant="outline" className="w-fit gap-1.5"><TrendingDown className="h-3.5 w-3.5" />{wasteReports.length} report{wasteReports.length === 1 ? "" : "s"}</Badge>}
      </CardHeader>
      <CardContent className="p-4 sm:p-5">
        {error ? (
          <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-4 text-sm text-amber-700 dark:text-amber-300" role="alert">{error}</div>
        ) : loadingData ? (
          <TableSkeleton columns={5} rows={6} />
        ) : wasteReports.length > 0 ? (
          <>
            <div className="hidden overflow-x-auto rounded-lg border md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Recorded by</TableHead>
                    {canDelete && <TableHead className="text-right"><span className="sr-only">Actions</span></TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {wasteReports.map((waste) => (
                    <TableRow key={waste.id} className="hover:bg-muted/30">
                      <TableCell className="font-semibold">{waste.item_name || "Unknown item"}</TableCell>
                      <TableCell className="font-mono font-bold tabular-nums text-destructive">-{waste.quantity} {waste.item_name ? "" : "units"}</TableCell>
                      <TableCell className="max-w-[260px] truncate text-muted-foreground" title={waste.waste_reason}>{waste.waste_reason || "No reason provided"}</TableCell>
                      <TableCell className="whitespace-nowrap text-sm">{new Date(waste.waste_date).toLocaleDateString()}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{waste.full_name || "—"}</TableCell>
                      {canDelete && <TableCell className="text-right"><Button size="icon" variant="ghost" aria-label={`Delete waste report for ${waste.item_name || "item"}`} className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => onDelete(waste)}><Trash className="h-4 w-4" /></Button></TableCell>}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="grid gap-3 md:hidden">
              {wasteReports.map((waste) => (
                <div key={waste.id} className="rounded-xl border bg-card/60 p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{waste.item_name || "Unknown item"}</p>
                      <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground"><CalendarDays className="h-3.5 w-3.5" />{new Date(waste.waste_date).toLocaleDateString()}</p>
                    </div>
                    <Badge variant="destructive" className="font-mono tabular-nums">-{waste.quantity}</Badge>
                  </div>
                  <p className="mt-3 text-sm text-muted-foreground">{waste.waste_reason || "No reason provided"}</p>
                  <div className="mt-3 flex items-center justify-between border-t pt-3 text-xs text-muted-foreground">
                    <span>Recorded by {waste.full_name || "—"}</span>
                    {canDelete && <Button size="icon" variant="ghost" aria-label="Delete waste report" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => onDelete(waste)}><Trash className="h-4 w-4" /></Button>}
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="rounded-xl border border-dashed p-8 text-center sm:p-12">
            <TrendingDown className="mx-auto mb-3 h-12 w-12 text-muted-foreground/40" aria-hidden="true" />
            <p className="font-semibold text-sm">No waste reports yet</p>
            <p className="mx-auto mt-1 max-w-md text-xs text-muted-foreground">Record damaged, scrapped, or otherwise lost materials to keep stock history complete.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
