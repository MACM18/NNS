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
    const accessToken = body.accessToken;
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
        const result = await syncConnection(connectionId, accessToken);
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
