import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getMonthlyGoogleClients } from "@/lib/google-sheet-monthly";
export const runtime = "nodejs";
export async function GET() {
  const session = await auth();
  if (!session?.user?.id || !["admin", "superadmin"].includes(String(session.user.role || "").toLowerCase())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try { const { accessToken } = await getMonthlyGoogleClients(); return NextResponse.json({ accessToken, apiKey: process.env.GOOGLE_PICKER_API_KEY || null, appId: process.env.GOOGLE_CLOUD_PROJECT_NUMBER || null }); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Google account is not connected" }, { status: 400 }); }
}
