import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { supabaseServer } from "@/lib/supabase-server";

const ALLOWED_ROLES = ["admin", "moderator"];

type AuthContext = { userId: string; role: string };

async function authorize(): Promise<AuthContext> {
  const cookieStore = await cookies();

  const authClient = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          cookieStore.set(name, value, options);
        },
        remove(name: string, options: any) {
          cookieStore.set(name, "", { ...(options || {}), maxAge: 0 });
        },
      },
    }
  );

  // Try to get the logged-in user (reads cookies/server session)
  const { data: userRes, error: userErr } = await authClient.auth.getUser();
  if (userErr) {
    throw new Error("Unable to retrieve user");
  }
  const user = userRes?.user;
  if (!user) {
    throw new Error("Unauthorized");
  }

  const { data: profile, error: profileErr } = await supabaseServer
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profileErr) {
    throw new Error("Profile lookup failed");
  }

  const role = (profile?.role || "").toLowerCase();
  if (!ALLOWED_ROLES.includes(role)) {
    throw new Error("Forbidden");
  }

  return { userId: user.id, role };
}

export async function createConnection(payload: {
  month: number;
  year: number;
  sheet_url: string;
  sheet_name?: string | null;
  sheet_tab?: string | null;
}) {
  "use server";
  const auth = await authorize();

  const { month, year, sheet_url, sheet_name = null, sheet_tab = null } = payload;

  if (!month || !year || !sheet_url) {
    throw new Error("month, year and sheet_url are required");
  }
  if (Number.isNaN(Number(month)) || Number.isNaN(Number(year))) {
    throw new Error("Invalid month or year");
  }

  const { data, error } = await supabaseServer
    .from("google_sheet_connections")
    .insert({
      month: Number(month),
      year: Number(year),
      sheet_url: sheet_url,
      sheet_name: sheet_name,
      sheet_tab: sheet_tab,
      created_by: auth.userId,
    })
    .select("id")
    .single();

  if (error) {
    // Bubble up meaningful DB errors
    throw new Error(error.message || "Failed to create connection");
  }

  return { id: data?.id };
}

// Helper server action to accept FormData from a <form action=> submission in the App Router.
export async function createConnectionFromForm(formData: FormData) {
  "use server";
  const monthRaw = formData.get("month");
  const yearRaw = formData.get("year");
  const sheet_url = String(formData.get("sheet_url") || "");
  const sheet_name = formData.get("sheet_name") ? String(formData.get("sheet_name")) : null;
  const sheet_tab = formData.get("sheet_tab") ? String(formData.get("sheet_tab")) : null;

  const month = Number(monthRaw);
  const year = Number(yearRaw);

  if (!month || !year || !sheet_url) {
    throw new Error("month, year and sheet_url are required");
  }

  const result = await createConnection({ month, year, sheet_url, sheet_name, sheet_tab });

  // After creating, redirect back to the list page
  const { redirect } = await import("next/navigation");
  redirect(`/integrations/google-sheets`);

  return result;
}

export async function deleteConnection(connectionId: string) {
  "use server";
  const auth = await authorize();

  if (!connectionId) throw new Error("connectionId is required");

  // Optionally, ensure the user is the owner or admin - for now admin/moderator can delete any
  const { error } = await supabaseServer
    .from("google_sheet_connections")
    .delete()
    .eq("id", connectionId);

  if (error) throw new Error(error.message || "Failed to delete connection");

  return { ok: true };
}

export async function syncConnection(connectionId: string) {
  "use server";
  const auth = await authorize();

  if (!connectionId) throw new Error("connectionId is required");

  // Fetch connection
  const { data: rows, error: fetchErr } = await supabaseServer
    .from("google_sheet_connections")
    .select("id, month, year, sheet_url, sheet_name, sheet_tab")
    .eq("id", connectionId)
    .single();

  if (fetchErr) throw new Error(fetchErr.message || "Failed to fetch connection");

  // Placeholder for real sync with Google Sheets API. For now, update last_synced and status.
  const now = new Date().toISOString();

  const { data, error: updateErr } = await supabaseServer
    .from("google_sheet_connections")
    .update({ last_synced: now, status: "active" })
    .eq("id", connectionId)
    .select("id, last_synced, status, record_count")
    .single();

  if (updateErr) throw new Error(updateErr.message || "Failed to update sync status");

  return { connection: data };
}

// Form wrappers for use as <form action={...}> server actions
export async function deleteConnectionFromForm(formData: FormData) {
  "use server";
  const connectionId = String(formData.get("connectionId") || "");
  if (!connectionId) throw new Error("connectionId is required");
  const result = await deleteConnection(connectionId);

  // redirect back to list
  const { redirect } = await import("next/navigation");
  redirect(`/integrations/google-sheets`);

  return result;
}

export async function syncConnectionFromForm(formData: FormData) {
  "use server";
  const connectionId = String(formData.get("connectionId") || "");
  if (!connectionId) throw new Error("connectionId is required");
  const result = await syncConnection(connectionId);

  // redirect back to list (or stay)
  const { redirect } = await import("next/navigation");
  redirect(`/integrations/google-sheets`);

  return result;
}
