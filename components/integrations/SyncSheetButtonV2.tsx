"use client";

import React, { useState, useEffect, useRef } from "react";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Loader2,
  Terminal,
  Clock,
  Database,
  FileSpreadsheet,
  Package,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getErrorMessage, isRecord } from "@/lib/error-utils";

interface SyncProgress {
  step: string;
  status: "pending" | "running" | "success" | "error";
  message: string;
  timestamp: Date;
  details?: unknown;
}

interface SyncFinalResult {
  upserted?: number;
  appended?: number;
  hardwareUpdated?: number;
  hardwareCreated?: number;
  drumProcessed?: number;
  drumUsageInserted?: number;
}

function toOptionalNumber(value: unknown): number | undefined {
  if (typeof value === "number")
    return Number.isFinite(value) ? value : undefined;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

function normalizeFinalResult(result: unknown): SyncFinalResult | null {
  if (!isRecord(result)) return null;
  return {
    upserted: toOptionalNumber(result.upserted),
    appended: toOptionalNumber(result.appended),
    hardwareUpdated: toOptionalNumber(result.hardwareUpdated),
    hardwareCreated: toOptionalNumber(result.hardwareCreated),
    drumProcessed: toOptionalNumber(result.drumProcessed),
    drumUsageInserted: toOptionalNumber(result.drumUsageInserted),
  };
}

const getStepIcon = (step: string) => {
  if (step.includes("Authorizing")) return Clock;
  if (step.includes("Google") || step.includes("sheet")) return FileSpreadsheet;
  if (step.includes("database") || step.includes("Syncing")) return Database;
  if (step.includes("inventory") || step.includes("hardware")) return Package;
  if (step.includes("drum")) return TrendingUp;
  return Terminal;
};

export default function SyncSheetButton({
  connectionId,
  onSyncComplete,
}: {
  connectionId: string;
  onSyncComplete?: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [progress, setProgress] = useState<SyncProgress[]>([]);
  const [finalResult, setFinalResult] = useState<SyncFinalResult | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new progress is added
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [progress]);

  useEffect(() => {
    let pollTimeout: number | null = null;

    if (jobId) {
      const poll = async () => {
        try {
          const res = await fetch(
            `/api/integrations/google-sheets/sync/status?jobId=${encodeURIComponent(
              jobId
            )}`,
            { credentials: "include" }
          );
          const json = await res.json();

          if (json?.ok && json.job) {
            // Update progress log
            if (json.job.message) {
              setProgress((prev) => {
                const lastItem = prev[prev.length - 1];

                // Check if this is a new message or update to existing
                if (lastItem && lastItem.status === "running") {
                  // Complete the last running step
                  const updated = [...prev];
                  updated[updated.length - 1] = {
                    ...lastItem,
                    status: "success",
                  };

                  // Add new step if different
                  if (lastItem.message !== json.job.message) {
                    updated.push({
                      step: json.job.message,
                      status:
                        json.job.status === "done" ? "success" : "running",
                      message: json.job.message,
                      timestamp: new Date(),
                    });
                  }

                  return updated;
                }

                // Add new step
                return [
                  ...prev,
                  {
                    step: json.job.message,
                    status: json.job.status === "done" ? "success" : "running",
                    message: json.job.message,
                    timestamp: new Date(),
                  },
                ];
              });
            }

            if (json.job.status === "done") {
              setLoading(false);
              setJobId(null);
              setFinalResult(normalizeFinalResult(json.job.result));

              // Mark all steps as success
              setProgress((prev) =>
                prev.map((p) => ({
                  ...p,
                  status: p.status === "error" ? "error" : "success",
                }))
              );

              toast({
                title: "✅ Sync Completed Successfully",
                description: "All data has been synced from Google Sheets",
                variant: "default",
                duration: 5000,
              });

              if (onSyncComplete) {
                setTimeout(() => onSyncComplete(), 1000);
              }
              return;
            }

            if (json.job.status === "error") {
              setLoading(false);
              setJobId(null);
              setFinalResult(null);

              setProgress((prev) => {
                const updated = [...prev];
                if (updated.length > 0) {
                  updated[updated.length - 1] = {
                    ...updated[updated.length - 1],
                    status: "error",
                    message: json.job.message || "An error occurred",
                  };
                }
                return updated;
              });

              toast({
                title: "❌ Sync Error",
                description:
                  json.job.message || "An error occurred during sync",
                variant: "destructive",
                duration: 6000,
              });
              return;
            }
          }
        } catch (e) {
          console.error("Poll error:", e);
        }

        pollTimeout = window.setTimeout(poll, 1000);
      };

      void poll();
    }

    return () => {
      if (pollTimeout) window.clearTimeout(pollTimeout);
    };
  }, [jobId, onSyncComplete]);

  const start = async () => {
    setLoading(true);
    setDialogOpen(true);
    setProgress([
      {
        step: "Initializing sync job",
        status: "running",
        message: "Starting Google Sheets sync...",
        timestamp: new Date(),
      },
    ]);
    setFinalResult(null);

    try {
      const res = await fetch(`/api/integrations/google-sheets/sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ connectionId }),
      });

      const json = await res.json();

      if (json?.ok && json.jobId) {
        setJobId(json.jobId);
        setProgress((prev) => [
          ...prev.map((p) => ({ ...p, status: "success" as const })),
          {
            step: "Job queued",
            status: "running",
            message: "Sync job has been queued for processing",
            timestamp: new Date(),
          },
        ]);
      } else {
        setProgress((prev) => [
          ...prev,
          {
            step: "Failed to start",
            status: "error",
            message: json?.error || "Failed to start sync job",
            timestamp: new Date(),
          },
        ]);
        setLoading(false);
        toast({
          title: "❌ Sync Start Failed",
          description: json?.error || "Failed to start sync",
          variant: "destructive",
        });
      }
    } catch (e: unknown) {
      const message = getErrorMessage(e, "Unable to connect to server");
      setProgress((prev) => [
        ...prev,
        {
          step: "Request failed",
          status: "error",
          message,
          timestamp: new Date(),
        },
      ]);
      setLoading(false);
      toast({
        title: "❌ Request Failed",
        description: message,
        variant: "destructive",
      });
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
  };

  const getStatusColor = (status: SyncProgress["status"]) => {
    switch (status) {
      case "success":
        return "text-green-600 dark:text-green-400";
      case "error":
        return "text-red-600 dark:text-red-400";
      case "running":
        return "text-blue-600 dark:text-blue-400";
      default:
        return "text-muted-foreground";
    }
  };

  const getStatusIcon = (status: SyncProgress["status"]) => {
    switch (status) {
      case "success":
        return <CheckCircle className='h-4 w-4' />;
      case "error":
        return <AlertCircle className='h-4 w-4' />;
      case "running":
        return <Loader2 className='h-4 w-4 animate-spin' />;
      default:
        return <Clock className='h-4 w-4' />;
    }
  };

  return (
    <>
      <Button
        onClick={start}
        disabled={loading}
        size='sm'
        className='gap-2 w-full sm:w-auto'
        variant='default'
      >
        {loading ? (
          <>
            <Loader2 className='h-4 w-4 animate-spin' />
            Syncing…
          </>
        ) : (
          <>
            <RefreshCw className='h-4 w-4' />
            Sync
          </>
        )}
      </Button>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className='max-w-2xl max-h-[80vh] flex flex-col'>
          <DialogHeader>
            <DialogTitle className='flex items-center gap-2'>
              <Terminal className='h-5 w-5' />
              Google Sheets Sync Progress
            </DialogTitle>
            <DialogDescription>
              Real-time sync status and progress logs
            </DialogDescription>
          </DialogHeader>

          {/* Terminal-like progress area */}
          <div
            ref={scrollRef}
            className='flex-1 overflow-y-auto bg-slate-950 dark:bg-slate-900 rounded-lg p-4 font-mono text-sm space-y-2 min-h-[300px] max-h-[500px]'
          >
            {progress.map((item, index) => {
              const Icon = getStepIcon(item.step);
              return (
                <div
                  key={index}
                  className='flex items-start gap-3 text-slate-200'
                >
                  <span className='text-slate-500 text-xs mt-1 w-20 flex-shrink-0'>
                    {formatTime(item.timestamp)}
                  </span>
                  <div className={cn("mt-0.5", getStatusColor(item.status))}>
                    {getStatusIcon(item.status)}
                  </div>
                  <div className='flex-1'>
                    <div className='flex items-center gap-2'>
                      <Icon className='h-3.5 w-3.5 text-slate-400' />
                      <span
                        className={cn(
                          "font-medium",
                          getStatusColor(item.status)
                        )}
                      >
                        {item.message}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}

            {loading && (
              <div className='flex items-center gap-2 text-slate-400 animate-pulse'>
                <span className='text-xs w-20'>...</span>
                <Loader2 className='h-4 w-4 animate-spin' />
                <span>Processing...</span>
              </div>
            )}
          </div>

          {/* Summary section (shown when completed) */}
          {finalResult && (
            <div className='bg-muted rounded-lg p-4 space-y-2'>
              <div className='font-semibold text-sm flex items-center gap-2'>
                <CheckCircle className='h-4 w-4 text-green-600' />
                Sync Summary
              </div>
              <div className='grid grid-cols-2 gap-2 text-sm'>
                <div>
                  <span className='text-muted-foreground'>Lines Updated:</span>{" "}
                  <span className='font-medium'>
                    {finalResult.upserted ?? 0}
                  </span>
                </div>
                <div>
                  <span className='text-muted-foreground'>Lines Added:</span>{" "}
                  <span className='font-medium'>
                    {finalResult.appended ?? 0}
                  </span>
                </div>
                <div>
                  <span className='text-muted-foreground'>
                    Hardware Updated:
                  </span>{" "}
                  <span className='font-medium'>
                    {finalResult.hardwareUpdated ?? 0}
                  </span>
                </div>
                <div>
                  <span className='text-muted-foreground'>
                    Hardware Created:
                  </span>{" "}
                  <span className='font-medium'>
                    {finalResult.hardwareCreated ?? 0}
                  </span>
                </div>
                <div>
                  <span className='text-muted-foreground'>Drums Updated:</span>{" "}
                  <span className='font-medium'>
                    {finalResult.drumProcessed ?? 0}
                  </span>
                </div>
                <div>
                  <span className='text-muted-foreground'>Drum Usages:</span>{" "}
                  <span className='font-medium'>
                    {finalResult.drumUsageInserted ?? 0}
                  </span>
                </div>
              </div>
            </div>
          )}

          <div className='flex justify-end gap-2 pt-2'>
            {!loading && (
              <Button onClick={() => setDialogOpen(false)} variant='default'>
                Close
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
