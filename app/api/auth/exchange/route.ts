import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { supabaseServer } from "@/lib/supabase-server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const code = body?.code;
    const access_token = body?.access_token;
    const refresh_token = body?.refresh_token;

    if (!code && !(access_token && refresh_token)) {
      return NextResponse.json(
        { error: "code or tokens are required" },
        { status: 400 }
      );
    }

    const cookieStore = await cookies();

    // Create a server-side Supabase client with cookie helpers so we can set HttpOnly cookies
    // IMPORTANT: use the anon key here so the client-side cookie helpers behave like a normal client
    const authClient = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set(name: string, value: string, options: any) {
            // nextjs cookies() has a set API
            cookieStore.set(name, value, options);
          },
          remove(name: string, options: any) {
            cookieStore.set(name, "", { ...(options || {}), maxAge: 0 });
          },
        },
      }
    );

    // Determine session: either exchange the code, or use direct tokens sent from client
    let session: any = null;
    if (code) {
      // Exchange the code for a session using the service-role client
      const { data, error } = await supabaseServer.auth.exchangeCodeForSession(
        code
      );
      if (error) {
        // eslint-disable-next-line no-console
        console.error(
          "[api/auth/exchange] exchangeCodeForSession error:",
          error.message
        );
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      session = (data as any)?.session;
      if (!session) {
        return NextResponse.json(
          { error: "No session returned from exchange" },
          { status: 500 }
        );
      }

      // Debug: log that we received a session (no secrets)
      // eslint-disable-next-line no-console
      console.log(
        "[api/auth/exchange] received session for user:",
        session.user?.id ?? "(unknown)"
      );
    } else {
      // Received tokens directly from client (e.g. fragment parsed by client)
      session = {
        access_token: access_token,
        refresh_token: refresh_token,
      };
      // eslint-disable-next-line no-console
      console.log("[api/auth/exchange] using tokens posted by client");
    }

    // Set the session cookies via the auth client which uses our cookies helper
    const setRes = await authClient.auth.setSession({
      access_token: session.access_token,
      refresh_token: session.refresh_token,
    });
    if (setRes.error) {
      // eslint-disable-next-line no-console
      console.error(
        "[api/auth/exchange] setSession error:",
        setRes.error.message
      );
      return NextResponse.json(
        { error: setRes.error.message },
        { status: 500 }
      );
    }

    // Debug: show which cookies are present after setSession (names only)
    try {
      // eslint-disable-next-line no-console
      console.log(
        "[api/auth/exchange] Cookies after setSession:",
        cookieStore.getAll().map((c) => c.name)
      );
    } catch (e) {
      // ignore
    }

    // Success — respond OK and return the cookie names written (no values) so the client can verify
    let cookieNames: string[] = [];
    try {
      cookieNames = cookieStore.getAll().map((c) => c.name);
    } catch (e) {
      // ignore
    }

    return NextResponse.json({ ok: true, cookies: cookieNames });
  } catch (err: any) {
    // eslint-disable-next-line no-console
    console.error("[api/auth/exchange] unexpected error:", err?.message || err);
    return NextResponse.json(
      { error: err?.message || String(err) },
      { status: 500 }
    );
  }
}
