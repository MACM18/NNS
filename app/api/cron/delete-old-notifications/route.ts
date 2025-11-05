import { NextResponse } from "next/server";

// This API route is intended to be invoked by Vercel Cron Jobs (server-side).
// It triggers the Supabase Edge Function `delete-old-notifications` using the
// SUPABASE_SERVICE_ROLE_KEY stored in environment variables.

export async function GET(request: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const expectedSecret =
      process.env.VERCEL_CRON_SECRET || process.env.CRON_SECRET;

    // Validate configuration
    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json(
        { error: "Missing SUPABASE environment variables" },
        { status: 500 }
      );
    }

    // Validate secret header
    if (expectedSecret) {
      const provided =
        request.headers.get("x-cron-secret") ||
        request.headers.get("x-vercel-cron-secret");
      if (!provided || provided !== expectedSecret) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    const fnUrl = `${supabaseUrl.replace(
      /\/$/,
      ""
    )}/functions/v1/delete-old-notifications`;

    const resp = await fetch(fnUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${serviceKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({}),
    });

    const text = await resp.text();

    return NextResponse.json(
      { ok: resp.ok, status: resp.status, body: text },
      { status: resp.ok ? 200 : 500 }
    );
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export const runtime = "edge";
