"use client";

import React, { useState, useEffect } from "react";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { RefreshCw, CheckCircle, AlertCircle, Loader2 } from "lucide-react";

export default function SyncSheetButton({
  connectionId,
  onSyncComplete,
}: {
  connectionId: string;
  onSyncComplete?: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [popoverOpen, setPopoverOpen] = useState(false);

  useEffect(() => {
    let t: number | null = null;
    if (jobId) {
      setLoading(true);
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
            setStatus(json.job.message || json.job.status);
            if (json.job.status === "done") {
              setLoading(false);
              setJobId(null);
              setPopoverOpen(false);
              const r = json.job.result || {};
              const details =
                typeof r === "object"
                  ? `Upserted ${r.upserted ?? 0}, Appended ${
                      r.appended ?? 0
                    }, Drums: updated ${r.drumProcessed ?? 0}, appended ${
                      r.drumAppended ?? 0
                    }, usages ${r.drumUsageInserted ?? 0}`
                  : undefined;
              toast({
                title: "✅ Sync Completed Successfully",
                description: details || json.job.message || "Sync completed",
                variant: "default",
                duration: 5000,
              });
              // Trigger refresh callback
              if (onSyncComplete) {
                onSyncComplete();
              }
              return;
            }
            if (json.job.status === "error") {
              setLoading(false);
              setJobId(null);
              setPopoverOpen(false);
              toast({
                title: "❌ Sync Error",
                description: json.job.message || "An error occurred",
                variant: "destructive",
                duration: 6000,
              });
              return;
            }
          } else {
            setStatus(json?.error || "unknown");
          }
        } catch (e) {
          setStatus("poll error");
        }
        t = window.setTimeout(poll, 1000);
      };
      void poll();
    }
    return () => {
      if (t) window.clearTimeout(t);
    };
  }, [jobId]);

  const start = async () => {
    setLoading(true);
    setStatus("starting");
    setPopoverOpen(true);
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
        setStatus("queued");
      } else {
        setStatus(json?.error || "start failed");
        setLoading(false);
        setPopoverOpen(false);
        toast({
          title: "❌ Sync Start Failed",
          description: json?.error || "Failed to start sync",
          variant: "destructive",
        });
      }
    } catch (e: any) {
      setStatus("request failed");
      setLoading(false);
      setPopoverOpen(false);
      toast({
        title: "❌ Request Failed",
        description: e?.message || "Unable to start sync",
        variant: "destructive",
      });
    }
  };

  const getStatusContent = () => {
    if (!status) return null;

    if (status === "starting" || status === "queued") {
      return (
        <div className='flex items-center gap-2 text-sm'>
          <Loader2 className='h-4 w-4 animate-spin text-muted-foreground' />
          <span className='capitalize'>{status}</span>
        </div>
      );
    }

    if (status === "completed") {
      return (
        <div className='flex items-center gap-2 text-sm'>
          <CheckCircle className='h-4 w-4 text-green-500' />
          <span className='text-green-700 dark:text-green-400'>
            Sync completed successfully
          </span>
        </div>
      );
    }

    if (
      status.toLowerCase().includes("error") ||
      status.toLowerCase().includes("failed")
    ) {
      return (
        <div className='flex items-center gap-2 text-sm'>
          <AlertCircle className='h-4 w-4 text-destructive' />
          <span className='text-destructive capitalize'>{status}</span>
        </div>
      );
    }

    return (
      <div className='flex items-center gap-2 text-sm'>
        <Loader2 className='h-4 w-4 animate-spin text-blue-500' />
        <span className='text-blue-700 dark:text-blue-400 capitalize'>
          {status}
        </span>
      </div>
    );
  };

  return (
    <div className='inline-flex items-center gap-2 w-full sm:w-auto'>
      <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
        <PopoverTrigger asChild>
          <Button
            onClick={(e) => {
              if (!loading) {
                e.preventDefault();
                void start();
              }
            }}
            disabled={loading}
            size='sm'
            className='gap-2 w-full sm:w-auto'
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
        </PopoverTrigger>
        <PopoverContent className='w-80' align='start'>
          <div className='space-y-2'>
            <h4 className='font-medium text-sm'>Sync Status</h4>
            <div className='text-muted-foreground'>
              {getStatusContent() || (
                <span className='text-sm'>Click Sync to start</span>
              )}
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
