"use client";

import React from "react";
import { Trash, TrendingDown } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TableSkeleton } from "@/components/skeletons/table-skeleton";
import { WasteReport } from "@/app/dashboard/inventory/page";

interface WasteTabProps {
  wasteReports: WasteReport[];
  loadingData: boolean;
  role: string | null;
  onDelete: (waste: WasteReport) => void;
}

export function WasteTab({
  wasteReports,
  loadingData,
  role,
  onDelete,
}: WasteTabProps) {
  return (
    <Card className="glass-card border-border/40 overflow-hidden">
      <CardHeader>
        <CardTitle className="text-base font-bold">Waste Reports</CardTitle>
        <CardDescription>
          Inventory losses and scrap materials records
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loadingData ? (
          <TableSkeleton columns={6} rows={6} />
        ) : wasteReports.length > 0 ? (
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <div className="inline-block min-w-full align-middle">
              <div className="overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[120px]">Item Name</TableHead>
                      <TableHead className="min-w-[80px]">Quantity</TableHead>
                      <TableHead className="min-w-[150px]">Reason</TableHead>
                      <TableHead className="min-w-[100px]">Waste Date</TableHead>
                      <TableHead className="min-w-[100px]">Recorded By</TableHead>
                      {role === "admin" && (
                        <TableHead className="min-w-[60px] text-right">
                          <span className="sr-only">Actions</span>
                        </TableHead>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {wasteReports.map((waste) => (
                      <TableRow key={waste.id} className="hover:bg-muted/30 transition-colors">
                        <TableCell className="font-semibold">
                          {waste.item_name || "-"}
                        </TableCell>
                        <TableCell className="font-mono text-destructive font-bold tabular-nums">
                          -{waste.quantity}
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate text-muted-foreground" title={waste.waste_reason}>
                          {waste.waste_reason}
                        </TableCell>
                        <TableCell>
                          {new Date(waste.waste_date).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-xs">{waste.full_name}</TableCell>
                        {role === "admin" && (
                          <TableCell className="text-right">
                            <Button
                              size="icon"
                              variant="ghost"
                              aria-label="Delete Waste"
                              className="h-8 w-8 text-muted-foreground hover:text-destructive"
                              onClick={() => onDelete(waste)}
                            >
                              <Trash className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-10 text-muted-foreground">
            <TrendingDown className="h-12 w-12 mx-auto mb-3 opacity-40" />
            <p className="font-semibold text-sm">No waste reports found</p>
            <p className="text-xs mt-1">Record waste to track inventory loss</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
