import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { encryptMonthlyRefreshToken, googleOAuthClient } from "@/lib/google-sheet-monthly";
export const runtime = "nodejs";
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id || !["admin", "superadmin"].includes(String(session.user.role || "").toLowerCase())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const state = req.nextUrl.searchParams.get("state");
  if (!state || state !== req.cookies.get("google_drive_oauth_state")?.value) return NextResponse.json({ error: "Invalid OAuth state" }, { status: 400 });
  const code = req.nextUrl.searchParams.get("code");
  if (!code) return NextResponse.redirect(new URL("/dashboard/integrations/google-sheets?drive=error", req.url));
  try {
    const client = googleOAuthClient();
    const { tokens } = await client.getToken(code);
    if (!tokens.refresh_token) throw new Error("Google did not return a refresh token. Reconnect and approve offline access.");
    client.setCredentials(tokens);
    const oauth2 = (await import("googleapis")).google.oauth2({ version: "v2", auth: client });
    const profile = await oauth2.userinfo.get();
    const email = profile.data.email || session.user.email || null;
    await prisma.googleSheetMonthlySettings.upsert({
      where: { id: "default" },
      update: { encryptedRefreshToken: encryptMonthlyRefreshToken(tokens.refresh_token), adminEmail: email },
      create: { id: "default", encryptedRefreshToken: encryptMonthlyRefreshToken(tokens.refresh_token), adminEmail: email },
    });
    const response = NextResponse.redirect(new URL("/dashboard/integrations/google-sheets?drive=connected", req.url));
    response.cookies.delete("google_drive_oauth_state");
    return response;
  } catch (error) {
    console.error("[google-drive-oauth] callback failed", error);
    return NextResponse.redirect(new URL("/dashboard/integrations/google-sheets?drive=error", req.url));
  }
}
