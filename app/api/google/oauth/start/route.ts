import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import crypto from "crypto";
import { buildAuthUrl } from "@/lib/google-oauth";

const STATE_COOKIE = "google_oauth_state";

export async function GET() {
  // Generate CSRF state and store in a short-lived, httpOnly cookie
  const state = crypto.randomBytes(16).toString("hex");
  const authUrl = await buildAuthUrl(state);

  const res = NextResponse.redirect(authUrl);
  // Set cookie for 10 minutes
  res.cookies.set(STATE_COOKIE, state, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 10 * 60,
  });
  return res;
}
