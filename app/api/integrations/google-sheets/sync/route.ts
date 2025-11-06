import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  createJob,
  setJobInProgress,
  setJobDone,
  setJobError,
} from "@/lib/sync-job-store";
import { syncConnection } from "@/app/dashboard/integrations/google-sheets/actions";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const connectionId = String(body.connectionId || "");
    // Accept access token either in body.accessToken or Authorization bearer header
    let accessToken = body.accessToken;
    if (!accessToken) {
      const authHeader =
        req.headers.get("authorization") || req.headers.get("Authorization");
      if (authHeader && authHeader.toLowerCase().startsWith("bearer ")) {
        accessToken = authHeader.slice(7).trim();
      }
    }
    if (!connectionId) {
      return NextResponse.json(
        { ok: false, error: "connectionId required" },
        { status: 400 }
      );
    }

    const jobId = `job-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    createJob(jobId, "Queued");
    // mark in-progress quickly
    setJobInProgress(jobId, "Starting sync");

    // fire-and-wait: run sync in background but still wait to return job id
    (async () => {
      try {
        setJobInProgress(jobId, "Running sync");
        const result = await syncConnection(connectionId, accessToken, (msg) =>
          setJobInProgress(jobId, msg)
        );
        setJobDone(jobId, result);
      } catch (err: any) {
        setJobError(jobId, err?.message || String(err));
      }
    })();

    return NextResponse.json({ ok: true, jobId });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error?.message || String(error) },
      { status: 500 }
    );
  }
}
