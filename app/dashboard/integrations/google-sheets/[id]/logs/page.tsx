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
  ChevronDown,
  ChevronUp,
  RefreshCw,
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
  
  // Search and filters for skipped rows within the expanded log
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "skipped" | "updated" | "warning">("all");

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
      
      // Auto-expand the first log if none expanded
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
      <div className="container mx-auto p-6 space-y-6">
        <div className="h-8 w-48 bg-muted animate-pulse rounded"></div>
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

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case "success":
        return (
          <Badge className="bg-green-500 hover:bg-green-600 text-white flex items-center gap-1 w-fit">
            <CheckCircle2 className="h-3 w-3" /> Success
          </Badge>
        );
      case "warning":
        return (
          <Badge className="bg-amber-500 hover:bg-amber-600 text-white flex items-center gap-1 w-fit">
            <AlertTriangle className="h-3 w-3" /> Warning
          </Badge>
        );
      case "failed":
        return (
          <Badge className="bg-red-500 hover:bg-red-600 text-white flex items-center gap-1 w-fit">
            <XCircle className="h-3 w-3" /> Failed
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getSkippedRowBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case "skipped":
        return <Badge variant="destructive" className="text-xs">Skipped</Badge>;
      case "updated":
        return <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-800 border-blue-200">Updated</Badge>;
      case "warning":
        return <Badge variant="outline" className="text-xs bg-amber-50 text-amber-800 border-amber-200">Warning</Badge>;
      default:
        return <Badge variant="outline" className="text-xs">{status}</Badge>;
    }
  };

  const expandedLog = logs.find((l) => l.id === expandedLogId);

  // Filtered rows for the expanded log's details table
  const filteredSkippedRows = expandedLog
    ? expandedLog.skippedRows.filter((row) => {
        const matchesSearch =
          (row.telephoneNo || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
          (row.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
          (row.reason || "").toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = statusFilter === "all" || row.status === statusFilter;
        return matchesSearch && matchesStatus;
      })
    : [];

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      {/* Breadcrumbs & Header */}
      <div className="space-y-2">
        <Link
          href="/dashboard/integrations/google-sheets"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Connections</span>
        </Link>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-3">
              <FileSpreadsheet className="h-7 w-7 text-green-600" />
              Sync Execution Logs
            </h1>
            <p className="text-muted-foreground text-sm md:text-base mt-1">
              Google Sheets connection for <span className="font-semibold text-foreground">{monthLabel} {connection.year}</span>
            </p>
          </div>
          <div className="flex items-center gap-2 w-full md:w-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchLogs(true)}
              disabled={refreshing}
              className="gap-2 w-full md:w-auto"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
              Refresh Logs
            </Button>
            <Button asChild size="sm" className="w-full md:w-auto">
              <a href={connection.sheetUrl} target="_blank" rel="noopener noreferrer" className="gap-2">
                Open Google Sheet
                <ArrowUpRight className="h-4 w-4" />
              </a>
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Side: Sync History List */}
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Sync Runs History</CardTitle>
              <CardDescription>Select a run to view detailed breakdown</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {logs.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground text-sm">
                  No sync logs recorded yet. Run a sync to see execution logs.
                </div>
              ) : (
                <div className="divide-y max-h-[600px] overflow-y-auto">
                  {logs.map((log) => {
                    const isExpanded = log.id === expandedLogId;
                    const date = new Date(log.syncDate);
                    return (
                      <button
                        key={log.id}
                        onClick={() => {
                          setExpandedLogId(log.id);
                          setSearchQuery("");
                          setStatusFilter("all");
                        }}
                        className={`w-full text-left p-4 hover:bg-muted/50 transition-colors flex flex-col gap-2 ${
                          isExpanded ? "bg-muted border-l-4 border-primary" : ""
                        }`}
                      >
                        <div className="flex justify-between items-center w-full">
                          <span className="font-medium text-sm flex items-center gap-2">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            {date.toLocaleTimeString("en-US", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                          {getStatusBadge(log.status)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {date.toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </div>
                        {log.status === "failed" ? (
                          <span className="text-xs text-red-600 truncate max-w-[200px]">
                            {log.message}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            Parsed: {log.details.totalParsedRows || 0} • Appended: {log.details.insertedCount || 0} • Updated: {log.details.updatedCount || 0}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Side: Detailed Breakdown of Selected Run */}
        <div className="lg:col-span-2 space-y-6">
          {expandedLog ? (
            <>
              {/* Summary Card */}
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-start gap-4">
                    <div>
                      <CardTitle className="text-xl flex items-center gap-2">
                        Run Details & Breakdown
                      </CardTitle>
                      <CardDescription>
                        Executed on {new Date(expandedLog.syncDate).toLocaleString()}
                      </CardDescription>
                    </div>
                    {getStatusBadge(expandedLog.status)}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Status Message */}
                  <div className={`p-4 rounded-lg text-sm border ${
                    expandedLog.status === "failed"
                      ? "bg-red-50 border-red-200 text-red-800"
                      : expandedLog.status === "warning"
                      ? "bg-amber-50 border-amber-200 text-amber-800"
                      : "bg-green-50 border-green-200 text-green-800"
                  }`}>
                    <span className="font-semibold">Log Message:</span> {expandedLog.message}
                  </div>

                  {expandedLog.status !== "failed" && (
                    <>
                      {/* Grid Stats */}
                      <h4 className="text-sm font-semibold tracking-tight uppercase text-muted-foreground">
                        Sync Summary Statistics
                      </h4>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <div className="border rounded-lg p-3 bg-card text-center">
                          <div className="text-2xl font-bold text-foreground">
                            {expandedLog.details.totalParsedRows || 0}
                          </div>
                          <div className="text-xs text-muted-foreground">Total Parsed Rows</div>
                        </div>
                        <div className="border rounded-lg p-3 bg-card text-center">
                          <div className="text-2xl font-bold text-green-600">
                            {expandedLog.details.insertedCount || 0}
                          </div>
                          <div className="text-xs text-muted-foreground">Appended (New)</div>
                        </div>
                        <div className="border rounded-lg p-3 bg-card text-center">
                          <div className="text-2xl font-bold text-blue-600">
                            {expandedLog.details.updatedCount || 0}
                          </div>
                          <div className="text-xs text-muted-foreground">Updated (Duplicates)</div>
                        </div>
                        <div className="border rounded-lg p-3 bg-card text-center">
                          <div className="text-2xl font-bold text-amber-600">
                            {expandedLog.skippedRows.filter(r => r.status === "skipped").length}
                          </div>
                          <div className="text-xs text-muted-foreground">Skipped Rows</div>
                        </div>
                      </div>

                      {/* Drum & Hardware Sync Statistics */}
                      <h4 className="text-sm font-semibold tracking-tight uppercase text-muted-foreground pt-2">
                        Inventory & Drums Sync
                      </h4>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                        <div className="border rounded-lg p-3 bg-card flex flex-col justify-center">
                          <span className="text-xs text-muted-foreground">Drum Usages Recorded</span>
                          <span className="text-lg font-bold mt-1 text-purple-700">
                            {expandedLog.details.drumUsageProcessed || 0}
                          </span>
                        </div>
                        <div className="border rounded-lg p-3 bg-card flex flex-col justify-center">
                          <span className="text-xs text-muted-foreground">Drum Records Updated</span>
                          <span className="text-lg font-bold mt-1 text-purple-700">
                            {expandedLog.details.drumUpdated || 0}
                          </span>
                        </div>
                        <div className="border rounded-lg p-3 bg-card flex flex-col justify-center">
                          <span className="text-xs text-muted-foreground">Hardware Items Updated</span>
                          <span className="text-lg font-bold mt-1 text-purple-700">
                            {expandedLog.details.hardwareUpdated || 0}
                          </span>
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Warnings / Skipped Rows Table */}
              {expandedLog.status !== "failed" && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Database className="h-5 w-5 text-muted-foreground" />
                      Skipped & Updated Rows Breakdown ({expandedLog.skippedRows.length})
                    </CardTitle>
                    <CardDescription>
                      Details of rows that were skipped due to formatting or updated due to duplicate numbers.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Filters and Search Bar */}
                    <div className="flex flex-col sm:flex-row gap-3">
                      <div className="relative flex-1">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Search rows by phone, customer, or reason..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pl-9"
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant={statusFilter === "all" ? "default" : "outline"}
                          size="sm"
                          onClick={() => setStatusFilter("all")}
                        >
                          All ({expandedLog.skippedRows.length})
                        </Button>
                        <Button
                          variant={statusFilter === "skipped" ? "default" : "outline"}
                          size="sm"
                          onClick={() => setStatusFilter("skipped")}
                          className="text-red-600 hover:text-red-700"
                        >
                          Skipped ({expandedLog.skippedRows.filter(r => r.status === "skipped").length})
                        </Button>
                        <Button
                          variant={statusFilter === "updated" ? "default" : "outline"}
                          size="sm"
                          onClick={() => setStatusFilter("updated")}
                          className="text-blue-600 hover:text-blue-700"
                        >
                          Updated ({expandedLog.skippedRows.filter(r => r.status === "updated").length})
                        </Button>
                      </div>
                    </div>

                    {/* Skipped Rows Table */}
                    {filteredSkippedRows.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground text-sm border rounded-lg">
                        {expandedLog.skippedRows.length === 0
                          ? "Perfect sync! No rows skipped or updated."
                          : "No results matching the filter criteria."}
                      </div>
                    ) : (
                      <div className="border rounded-md overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-[80px]">Row No.</TableHead>
                              <TableHead className="w-[120px]">Telephone</TableHead>
                              <TableHead className="w-[140px]">Customer</TableHead>
                              <TableHead className="w-[100px]">Type</TableHead>
                              <TableHead>Details / Reason</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {filteredSkippedRows.map((row, idx) => (
                              <TableRow key={idx}>
                                <TableCell className="font-semibold">
                                  #{row.rowNum}
                                </TableCell>
                                <TableCell className="font-mono text-xs">
                                  {row.telephoneNo || "-"}
                                </TableCell>
                                <TableCell className="truncate max-w-[120px]">
                                  {row.name || "-"}
                                </TableCell>
                                <TableCell>
                                  {getSkippedRowBadge(row.status)}
                                </TableCell>
                                <TableCell className="text-xs text-muted-foreground">
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
            <div className="h-64 flex items-center justify-center border rounded-lg text-muted-foreground">
              Select a run log from the left history to view detailed execution reports.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
