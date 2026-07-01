"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  FileSpreadsheet,
  Search,
  Clock,
  ArrowUpRight,
  Database,
  RefreshCw,
  SlidersHorizontal,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useNotification } from "@/contexts/notification-context";
import { TableSkeleton } from "@/components/skeletons/table-skeleton";

interface ConnectionInfo {
  id: string;
  month: number;
  year: number;
  sheetUrl: string;
}

interface SyncLog {
  id: string;
  syncDate: string;
  status: string; // success, warning, failed
  message: string;
  details: {
    totalParsedRows?: number;
    insertedCount?: number;
    updatedCount?: number;
    drumUsageProcessed?: number;
    drumsCreated?: number;
    drumUpdated?: number;
    hardwareUpdated?: number;
    hardwareCreated?: number;
    usageRecordsUpdated?: number;
    drumSheetProcessed?: number;
    drumSheetAppended?: number;
  };
  skippedRows: Array<{
    rowNum: number;
    telephoneNo: string;
    name: string;
    status: "skipped" | "updated" | "warning";
    reason: string;
  }>;
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export default function ConnectionLogsPage() {
  const params = useParams();
  const router = useRouter();
  const { addNotification } = useNotification();
  const id = params.id as string;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [connection, setConnection] = useState<ConnectionInfo | null>(null);
  const [logs, setLogs] = useState<SyncLog[]>([]);
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  
  // Sidebar run filters
  const [runStatusFilter, setRunStatusFilter] = useState<"all" | "success" | "warning" | "failed">("all");
  
  // Table search and filters
  const [searchQuery, setSearchQuery] = useState("");
  const [tableStatusFilter, setTableStatusFilter] = useState<"all" | "skipped" | "updated" | "warning">("all");

  const fetchLogs = async (showProgress = false) => {
    if (showProgress) setRefreshing(true);
    try {
      const res = await fetch(`/api/integrations/google-sheets/connections/${id}/logs`);
      if (!res.ok) {
        throw new Error("Failed to load logs");
      }
      const data = await res.json();
      setConnection(data.connection);
      setLogs(data.logs);
      
      // Auto-expand the first matched log if none expanded
      if (data.logs.length > 0 && !expandedLogId) {
        setExpandedLogId(data.logs[0].id);
      }
    } catch (err: any) {
      addNotification({
        title: "Error fetching logs",
        message: err.message || "Unknown error occurred",
        type: "error",
        category: "system",
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchLogs();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (loading) {
    return (
      <div className="container mx-auto p-4 md:p-6 space-y-4">
        <div className="h-6 w-32 bg-muted animate-pulse rounded"></div>
        <TableSkeleton />
      </div>
    );
  }

  if (!connection) {
    return (
      <div className="container mx-auto p-6 text-center py-16">
        <XCircle className="h-12 w-12 mx-auto text-destructive mb-4" />
        <h3 className="text-xl font-bold mb-2">Connection Not Found</h3>
        <p className="text-muted-foreground mb-6">The Google Sheet connection logs you are looking for do not exist.</p>
        <Button onClick={() => router.push("/dashboard/integrations/google-sheets")}>
          Back to Connections
        </Button>
      </div>
    );
  }

  const monthLabel = MONTHS[connection.month - 1] || connection.month;

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case "success":
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-amber-500" />;
      case "failed":
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case "success":
        return (
          <Badge variant="outline" className="bg-green-50/50 text-green-700 border-green-200/60 text-[10px] px-1.5 py-0">
            Success
          </Badge>
        );
      case "warning":
        return (
          <Badge variant="outline" className="bg-amber-50/50 text-amber-700 border-amber-200/60 text-[10px] px-1.5 py-0">
            Warning
          </Badge>
        );
      case "failed":
        return (
          <Badge variant="outline" className="bg-red-50/50 text-red-700 border-red-200/60 text-[10px] px-1.5 py-0">
            Failed
          </Badge>
        );
      default:
        return <Badge variant="outline" className="text-[10px] px-1.5 py-0">{status}</Badge>;
    }
  };

  const getSkippedRowBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case "skipped":
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-200 border-none text-[10px] px-1.5 py-0">Skipped</Badge>;
      case "updated":
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200 border-none text-[10px] px-1.5 py-0">Updated</Badge>;
      case "warning":
        return <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-200 border-none text-[10px] px-1.5 py-0">Warning</Badge>;
      default:
        return <Badge variant="outline" className="text-[10px] px-1.5 py-0">{status}</Badge>;
    }
  };

  // Filtered logs list for the sidebar
  const filteredLogs = logs.filter((log) => {
    if (runStatusFilter === "all") return true;
    return log.status.toLowerCase() === runStatusFilter.toLowerCase();
  });

  const expandedLog = logs.find((l) => l.id === expandedLogId);

  // Filtered rows for the selected log's details table
  const filteredSkippedRows = expandedLog
    ? expandedLog.skippedRows.filter((row) => {
        const matchesSearch =
          (row.telephoneNo || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
          (row.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
          (row.reason || "").toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = tableStatusFilter === "all" || row.status === tableStatusFilter;
        return matchesSearch && matchesStatus;
      })
    : [];

  return (
    <div className="container mx-auto p-3 md:p-5 space-y-4 max-w-7xl">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3 border-b">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Link
              href="/dashboard/integrations/google-sheets"
              className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
            >
              <ArrowLeft className="h-3 w-3" /> Sheets
            </Link>
            <span className="text-muted-foreground/40 text-xs">/</span>
            <span className="text-xs font-semibold">{monthLabel} {connection.year} Logs</span>
          </div>
          <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-green-600" />
            Sync Logs Dashboard
          </h1>
        </div>
        <div className="flex items-center gap-1.5 w-full sm:w-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchLogs(true)}
            disabled={refreshing}
            className="h-8 px-2.5 text-xs gap-1.5"
          >
            <RefreshCw className={`h-3 w-3 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button asChild size="sm" className="h-8 px-2.5 text-xs bg-green-600 hover:bg-green-700">
            <a href={connection.sheetUrl} target="_blank" rel="noopener noreferrer" className="gap-1.5">
              Sheet
              <ArrowUpRight className="h-3 w-3" />
            </a>
          </Button>
        </div>
      </div>

      {/* Main Split Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Left Side: Sync Runs Sidebar */}
        <div className="lg:col-span-1 space-y-3">
          <Card className="shadow-sm border-muted/80 overflow-hidden">
            <CardHeader className="p-3 border-b bg-muted/20">
              <div className="flex justify-between items-center">
                <CardTitle className="text-xs font-bold tracking-wider uppercase text-muted-foreground">
                  Sync History
                </CardTitle>
                <SlidersHorizontal className="h-3.5 w-3.5 text-muted-foreground/60" />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {/* Quick Status Filter Tabs */}
              <div className="grid grid-cols-4 gap-1 p-2 bg-muted/10 border-b text-[10px]">
                {(["all", "success", "warning", "failed"] as const).map((status) => {
                  const count = status === "all" ? logs.length : logs.filter(l => l.status === status).length;
                  return (
                    <button
                      key={status}
                      onClick={() => setRunStatusFilter(status)}
                      className={`py-1 rounded text-center font-medium transition-colors ${
                        runStatusFilter === status
                          ? "bg-white shadow-xs text-foreground font-semibold"
                          : "text-muted-foreground hover:bg-muted/40"
                      }`}
                    >
                      <span className="capitalize">{status}</span> ({count})
                    </button>
                  );
                })}
              </div>

              {filteredLogs.length === 0 ? (
                <div className="text-center py-8 text-xs text-muted-foreground">
                  No sync runs found.
                </div>
              ) : (
                <div className="divide-y max-h-[460px] overflow-y-auto">
                  {filteredLogs.map((log) => {
                    const isExpanded = log.id === expandedLogId;
                    const date = new Date(log.syncDate);
                    return (
                      <button
                        key={log.id}
                        onClick={() => {
                          setExpandedLogId(log.id);
                          setSearchQuery("");
                          setTableStatusFilter("all");
                        }}
                        className={`w-full text-left p-2.5 hover:bg-muted/30 transition-colors flex flex-col gap-1.5 ${
                          isExpanded ? "bg-muted/50 border-l-3 border-green-600" : ""
                        }`}
                      >
                        <div className="flex justify-between items-center w-full">
                          <span className="font-semibold text-xs text-foreground flex items-center gap-1.5">
                            {getStatusIcon(log.status)}
                            {date.toLocaleTimeString("en-US", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                          {getStatusBadge(log.status)}
                        </div>
                        <div className="flex justify-between items-center text-[10px] text-muted-foreground w-full">
                          <span>
                            {date.toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                            })}
                          </span>
                          {log.status !== "failed" && (
                            <span className="font-medium text-foreground/80">
                              +{log.details.insertedCount || 0} • ~{log.details.updatedCount || 0}
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Side: Detailed Breakdown of Selected Run */}
        <div className="lg:col-span-3 space-y-4">
          {expandedLog ? (
            <>
              {/* Consolidated Metrics Bar & Details */}
              <Card className="shadow-sm border-muted/80">
                <CardHeader className="p-3.5 pb-2 border-b bg-muted/10">
                  <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                    <div>
                      <CardTitle className="text-sm font-bold flex items-center gap-2">
                        {getStatusIcon(expandedLog.status)}
                        Run Details & Metrics
                      </CardTitle>
                      <CardDescription className="text-[11px] mt-0.5">
                        Executed on {new Date(expandedLog.syncDate).toLocaleString()}
                      </CardDescription>
                    </div>
                    {getStatusBadge(expandedLog.status)}
                  </div>
                </CardHeader>
                <CardContent className="p-3.5 space-y-3.5">
                  {/* Status Banner */}
                  <div className={`p-2.5 rounded border text-xs ${
                    expandedLog.status === "failed"
                      ? "bg-red-50/50 border-red-200/50 text-red-900"
                      : expandedLog.status === "warning"
                      ? "bg-amber-50/50 border-amber-200/50 text-amber-900"
                      : "bg-green-50/50 border-green-200/50 text-green-900"
                  }`}>
                    <span className="font-semibold">Log Result:</span> {expandedLog.message}
                  </div>

                  {expandedLog.status !== "failed" && (
                    <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 pt-1 text-center">
                      <div className="border border-muted/80 rounded px-2.5 py-1.5 bg-card/60">
                        <div className="text-xs font-bold text-muted-foreground uppercase tracking-wide text-[9px]">Parsed</div>
                        <div className="text-lg font-bold text-foreground mt-0.5">{expandedLog.details.totalParsedRows || 0}</div>
                      </div>
                      <div className="border border-muted/80 rounded px-2.5 py-1.5 bg-card/60">
                        <div className="text-xs font-bold text-green-700 uppercase tracking-wide text-[9px]">Appended</div>
                        <div className="text-lg font-bold text-green-600 mt-0.5">+{expandedLog.details.insertedCount || 0}</div>
                      </div>
                      <div className="border border-muted/80 rounded px-2.5 py-1.5 bg-card/60">
                        <div className="text-xs font-bold text-blue-700 uppercase tracking-wide text-[9px]">Updated</div>
                        <div className="text-lg font-bold text-blue-600 mt-0.5">~{expandedLog.details.updatedCount || 0}</div>
                      </div>
                      <div className="border border-muted/80 rounded px-2.5 py-1.5 bg-card/60">
                        <div className="text-xs font-bold text-amber-700 uppercase tracking-wide text-[9px]">Skipped</div>
                        <div className="text-lg font-bold text-amber-600 mt-0.5">
                          {expandedLog.skippedRows.filter(r => r.status === "skipped").length}
                        </div>
                      </div>
                      <div className="border border-muted/80 rounded px-2.5 py-1.5 bg-card/60">
                        <div className="text-xs font-bold text-purple-700 uppercase tracking-wide text-[9px]">Drums Sync</div>
                        <div className="text-lg font-bold text-purple-600 mt-0.5">
                          {expandedLog.details.drumUpdated || 0}
                        </div>
                      </div>
                      <div className="border border-muted/80 rounded px-2.5 py-1.5 bg-card/60">
                        <div className="text-xs font-bold text-purple-700 uppercase tracking-wide text-[9px]">Stock Sync</div>
                        <div className="text-lg font-bold text-purple-600 mt-0.5">
                          {expandedLog.details.hardwareUpdated || 0}
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Warnings / Skipped Rows Table */}
              {expandedLog.status !== "failed" && (
                <Card className="shadow-sm border-muted/80">
                  <CardHeader className="p-3.5 pb-2 border-b bg-muted/10">
                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                      <Database className="h-4.5 w-4.5 text-muted-foreground" />
                      Skipped & Updated Rows Breakdown ({expandedLog.skippedRows.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-3.5 space-y-3">
                    {/* Compact Filter Options */}
                    <div className="flex flex-col sm:flex-row gap-2">
                      <div className="relative flex-1">
                        <Search className="absolute left-2 top-2 h-3.5 w-3.5 text-muted-foreground/60" />
                        <Input
                          placeholder="Search phone, customer, or reason..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pl-8 h-8.5 text-xs"
                        />
                      </div>
                      <div className="flex gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                        <Button
                          variant={tableStatusFilter === "all" ? "default" : "outline"}
                          size="sm"
                          onClick={() => setTableStatusFilter("all")}
                          className="h-8.5 text-[10px] px-2.5"
                        >
                          All ({expandedLog.skippedRows.length})
                        </Button>
                        <Button
                          variant={tableStatusFilter === "skipped" ? "default" : "outline"}
                          size="sm"
                          onClick={() => setTableStatusFilter("skipped")}
                          className="h-8.5 text-[10px] px-2.5 text-red-600 hover:text-red-700"
                        >
                          Skipped ({expandedLog.skippedRows.filter(r => r.status === "skipped").length})
                        </Button>
                        <Button
                          variant={tableStatusFilter === "updated" ? "default" : "outline"}
                          size="sm"
                          onClick={() => setTableStatusFilter("updated")}
                          className="h-8.5 text-[10px] px-2.5 text-blue-600 hover:text-blue-700"
                        >
                          Updated ({expandedLog.skippedRows.filter(r => r.status === "updated").length})
                        </Button>
                      </div>
                    </div>

                    {/* Compact Table */}
                    {filteredSkippedRows.length === 0 ? (
                      <div className="text-center py-6 text-xs text-muted-foreground border border-dashed rounded-lg bg-muted/5">
                        {expandedLog.skippedRows.length === 0
                          ? "Clean sync run! No warnings or skipped rows reported."
                          : "No matches found."}
                      </div>
                    ) : (
                      <div className="border rounded-md overflow-hidden bg-card">
                        <Table className="text-xs">
                          <TableHeader className="bg-muted/10">
                            <TableRow className="h-8">
                              <TableHead className="w-[60px] py-1.5 font-bold">Row</TableHead>
                              <TableHead className="w-[110px] py-1.5 font-bold">Telephone</TableHead>
                              <TableHead className="w-[130px] py-1.5 font-bold">Customer</TableHead>
                              <TableHead className="w-[80px] py-1.5 font-bold">Status</TableHead>
                              <TableHead className="py-1.5 font-bold">Reason / Details</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {filteredSkippedRows.map((row, idx) => (
                              <TableRow key={idx} className="hover:bg-muted/5 h-8">
                                <TableCell className="font-semibold py-1">
                                  #{row.rowNum}
                                </TableCell>
                                <TableCell className="font-mono text-[11px] py-1">
                                  {row.telephoneNo || "-"}
                                </TableCell>
                                <TableCell className="truncate max-w-[120px] py-1">
                                  {row.name || "-"}
                                </TableCell>
                                <TableCell className="py-1">
                                  {getSkippedRowBadge(row.status)}
                                </TableCell>
                                <TableCell className="text-muted-foreground text-[11px] py-1 leading-relaxed">
                                  {row.reason}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <div className="h-48 flex items-center justify-center border rounded-lg text-muted-foreground text-xs bg-muted/5">
              Select a run log from the left history to view detailed execution reports.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
