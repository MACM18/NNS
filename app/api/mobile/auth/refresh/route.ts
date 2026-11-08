import { NextRequest, NextResponse } from "next/server";
import { refreshMobileSession } from "@/lib/mobile-auth";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const tokens = await refreshMobileSession(typeof body?.refreshToken === "string" ? body.refreshToken : "");
    if (!tokens) return NextResponse.json({ error: "Session expired. Please sign in again." }, { status: 401, headers: { "Cache-Control": "no-store" } });
    return NextResponse.json(tokens, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Unable to refresh the session" }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }
}
