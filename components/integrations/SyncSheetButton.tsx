"use client";

import React, { useState, useEffect } from "react";
import { getSupabaseClient } from "@/lib/supabase";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, CheckCircle, AlertCircle, Loader2 } from "lucide-react";

export default function SyncSheetButton({
  connectionId,
}: {
  connectionId: string;
}) {
  const [loading, setLoading] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

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
                title: "Sync finished",
                description: details || json.job.message || "Sync completed",
                variant: "default",
              });
              return;
            }
            if (json.job.status === "error") {
              setLoading(false);
              setJobId(null);
              toast({
                title: "Sync error",
                description: json.job.message || "An error occurred",
                variant: "destructive",
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
    try {
      const supabase = getSupabaseClient();
      const { data } = await supabase.auth.getSession();
      const accessToken = data.session?.access_token ?? null;

      const res = await fetch(`/api/integrations/google-sheets/sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ connectionId, accessToken }),
      });
      const json = await res.json();
      if (json?.ok && json.jobId) {
        setJobId(json.jobId);
        setStatus("queued");
      } else {
        setStatus(json?.error || "start failed");
        setLoading(false);
        toast({
          title: "Sync start failed",
          description: json?.error || "Failed to start sync",
          variant: "destructive",
        });
      }
    } catch (e: any) {
      setStatus("request failed");
      setLoading(false);
      toast({
        title: "Request failed",
        description: e?.message || "Unable to start sync",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = () => {
    if (!status) return null;

    if (status === "starting" || status === "queued") {
      return (
        <Badge variant='secondary' className='gap-1'>
          <Loader2 className='h-3 w-3 animate-spin' />
          {status}
        </Badge>
      );
    }

    if (
      status.toLowerCase().includes("error") ||
      status.toLowerCase().includes("failed")
    ) {
      return (
        <Badge variant='destructive' className='gap-1'>
          <AlertCircle className='h-3 w-3' />
          {status}
        </Badge>
      );
    }

    return (
      <Badge variant='outline' className='gap-1'>
        <Loader2 className='h-3 w-3 animate-spin' />
        {status}
      </Badge>
    );
  };

  return (
    <div className='inline-flex items-center gap-2'>
      <Button
        onClick={() => void start()}
        disabled={loading}
        size='sm'
        className='gap-2'
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
      {getStatusBadge()}
    </div>
  );
}
