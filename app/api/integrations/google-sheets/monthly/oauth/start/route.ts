import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { auth } from "@/lib/auth";
import { googleOAuthClient } from "@/lib/google-sheet-monthly";
export const runtime = "nodejs";
export async function GET() {
  const session = await auth();
  if (!session?.user?.id || !["admin", "superadmin"].includes(String(session.user.role || "").toLowerCase())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
    const state = randomBytes(24).toString("hex");
    const url = googleOAuthClient().generateAuthUrl({ access_type: "offline", prompt: "consent", scope: ["https://www.googleapis.com/auth/drive.file", "openid", "email"], state });
    const response = NextResponse.redirect(url);
    response.cookies.set("google_drive_oauth_state", state, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 600 });
    return response;
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "OAuth setup failed" }, { status: 500 }); }
}
