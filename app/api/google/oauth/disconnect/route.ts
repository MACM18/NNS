import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { revokeUserTokens } from "@/lib/google-oauth";

export async function POST() {
  const {
    data: { session },
  } = await supabaseServer.auth.getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    await revokeUserTokens(session.user.id);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e.message || "disconnect_failed" },
      { status: 500 }
    );
  }
}
