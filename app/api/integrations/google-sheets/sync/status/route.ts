import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getJob } from "@/lib/sync-job-store";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const jobId = url.searchParams.get("jobId");
    if (!jobId)
      return NextResponse.json(
        { ok: false, error: "jobId required" },
        { status: 400 }
      );
    const job = getJob(jobId);
    if (!job)
      return NextResponse.json(
        { ok: false, error: "job not found" },
        { status: 404 }
      );
    return NextResponse.json({ ok: true, job });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || String(err) },
      { status: 500 }
    );
  }
}
