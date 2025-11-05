"use client";

import React, { useState, useEffect } from "react";
import { getSupabaseClient } from "@/lib/supabase";
import { toast } from "@/hooks/use-toast";

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
              toast({
                title: "Sync finished",
                description: json.job.message || "Sync completed",
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

  return (
    <div>
      <button
        className='btn btn-primary'
        onClick={() => void start()}
        disabled={loading}
      >
        {loading ? "Syncing…" : "Sync now"}
      </button>
      {status ? <div style={{ marginTop: 8 }}>{status}</div> : null}
    </div>
  );
}
