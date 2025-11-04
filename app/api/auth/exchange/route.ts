import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { supabaseServer } from "@/lib/supabase-server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const code = body?.code;
    if (!code) {
      return NextResponse.json({ error: "code is required" }, { status: 400 });
    }

    const cookieStore = await cookies();

    // Create a server-side Supabase client with cookie helpers so we can set HttpOnly cookies
    const authClient = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
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

    const session = (data as any)?.session;
    if (!session) {
      return NextResponse.json(
        { error: "No session returned from exchange" },
        { status: 500 }
      );
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

    // Success — respond OK. Client will redirect to the app landing.
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    // eslint-disable-next-line no-console
    console.error("[api/auth/exchange] unexpected error:", err?.message || err);
    return NextResponse.json(
      { error: err?.message || String(err) },
      { status: 500 }
    );
  }
}
