import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { retryMonthlySheetEmail } from "@/lib/google-sheet-monthly";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(_request: NextRequest, context: { params: Promise<{ runId: string }> }) {
  const session = await auth();
  if (!session?.user?.id || !["admin", "superadmin"].includes(String(session.user.role || "").toLowerCase())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { runId } = await context.params;
  try {
    const result = await retryMonthlySheetEmail(runId);
    return NextResponse.json(result, { status: result.status === "success" ? 200 : 502 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not retry the summary email." }, { status: 400 });
  }
}
