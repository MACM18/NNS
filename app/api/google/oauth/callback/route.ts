import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { exchangeCodeForTokens } from "@/lib/google-oauth";

const STATE_COOKIE = "google_oauth_state";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const returnedState = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  if (error) {
    return NextResponse.redirect(
      `/dashboard/integrations/google-sheets?oauth_error=${encodeURIComponent(
        error
      )}`
    );
  }

  if (!code || !returnedState) {
    return NextResponse.redirect(
      `/dashboard/integrations/google-sheets?oauth_error=missing_code_or_state`
    );
  }

  // Validate state
  const cookieStore = req.cookies;
  const storedState = cookieStore.get(STATE_COOKIE)?.value;
  if (!storedState || storedState !== returnedState) {
    return NextResponse.redirect(
      `/dashboard/integrations/google-sheets?oauth_error=invalid_state`
    );
  }

  // Get session (user must be logged in before starting OAuth)
  const {
    data: { session },
  } = await supabaseServer.auth.getSession();
  if (!session?.user?.id) {
    return NextResponse.redirect(
      `/login?oauth_error=${encodeURIComponent("not_authenticated")}`
    );
  }

  try {
    await exchangeCodeForTokens(session.user.id, code);
  } catch (e: any) {
    return NextResponse.redirect(
      `/dashboard/integrations/google-sheets?oauth_error=${encodeURIComponent(
        e?.message || "token_exchange_failed"
      )}`
    );
  }

  const res = NextResponse.redirect(
    `/dashboard/integrations/google-sheets?oauth=connected`
  );
  // Clear state cookie after success
  res.cookies.set(STATE_COOKIE, "", { maxAge: 0, path: "/" });
  return res;
}
