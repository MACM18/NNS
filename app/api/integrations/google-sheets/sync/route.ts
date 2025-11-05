import { NextRequest, NextResponse } from "next/server";
import { syncConnection } from "@/app/dashboard/integrations/google-sheets/actions";

export async function POST(req: NextRequest) {
  try {
    const auth = req.headers.get("authorization") || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : undefined;
    if (!token) {
      return NextResponse.json(
        { error: "Missing bearer token" },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => null);
    const connectionId = body?.connectionId as string | undefined;
    if (!connectionId) {
      return NextResponse.json(
        { error: "connectionId is required" },
        { status: 400 }
      );
    }

    const result = await syncConnection(connectionId, token);
    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    const message = error?.message || "Sync failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
