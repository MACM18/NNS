"use client";

import React, { useState, useEffect } from "react";

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
            )}`
          );
          const json = await res.json();
          if (json?.ok && json.job) {
            setStatus(json.job.message || json.job.status);
            if (json.job.status === "done" || json.job.status === "error") {
              setLoading(false);
              setJobId(null);
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
      const res = await fetch(`/api/integrations/google-sheets/sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ connectionId }),
      });
      const json = await res.json();
      if (json?.ok && json.jobId) {
        setJobId(json.jobId);
        setStatus("queued");
      } else {
        setStatus(json?.error || "start failed");
        setLoading(false);
      }
    } catch (e) {
      setStatus("request failed");
      setLoading(false);
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
