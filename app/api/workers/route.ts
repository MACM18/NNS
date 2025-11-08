import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

import { supabaseServer } from "@/lib/supabase-server";

const ALLOWED_ROLES = ["admin"];

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/\//g, "&#x2F;");
}

type AuthorizedContext = {
  userId: string;
  role: string;
};

async function authorize(
  req?: NextRequest
): Promise<AuthorizedContext | Response> {
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

  const authHeader = req?.headers.get("authorization");
  const bearer = authHeader?.startsWith("Bearer ")
    ? authHeader.split(" ")[1]
    : undefined;

  const { data: userRes } = bearer
    ? await authClient.auth.getUser(bearer)
    : await authClient.auth.getUser();
  const user = userRes?.user;
  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
    });
  }

  const { data: profile, error: profileErr } = await supabaseServer
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profileErr) {
    return new Response(JSON.stringify({ error: "Profile lookup failed" }), {
      status: 403,
    });
  }

  const role = (profile?.role || "").toLowerCase();
  if (!ALLOWED_ROLES.includes(role)) {
    return new Response(JSON.stringify({ error: "Forbidden - Admin access required" }), {
      status: 403,
    });
  }

  return { userId: user.id, role };
}

// GET /api/workers - List all workers
export async function GET(req: NextRequest) {
  const auth = await authorize(req);
  if (auth instanceof Response) return auth;

  try {
    const { data: workers, error } = await supabaseServer
      .from("workers")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;

    return new Response(JSON.stringify({ workers: workers || [] }), {
      status: 200,
    });
  } catch (error: any) {
    return new Response(
      JSON.stringify({
        error: escapeHtml(error.message) || "Failed to fetch workers",
      }),
      { status: 500 }
    );
  }
}

// POST /api/workers - Create a new worker
export async function POST(req: NextRequest) {
  const auth = await authorize(req);
  if (auth instanceof Response) return auth;

  try {
    const body = await req.json();
    const { full_name, phone_number, email, role, notes, profile_id } =
      body || {};

    if (!full_name) {
      return new Response(
        JSON.stringify({ error: "Full name is required" }),
        { status: 400 }
      );
    }

    const { data, error } = await supabaseServer
      .from("workers")
      .insert({
        full_name,
        phone_number,
        email,
        role: role || "technician",
        notes,
        profile_id: profile_id || null,
        created_by: auth.userId,
      })
      .select()
      .single();

    if (error) throw error;

    return new Response(JSON.stringify({ worker: data }), { status: 201 });
  } catch (error: any) {
    return new Response(
      JSON.stringify({
        error: escapeHtml(error.message) || "Failed to create worker",
      }),
      { status: 500 }
    );
  }
}

// PATCH /api/workers - Update a worker
export async function PATCH(req: NextRequest) {
  const auth = await authorize(req);
  if (auth instanceof Response) return auth;

  try {
    const body = await req.json();
    const { id, full_name, phone_number, email, role, status, notes, profile_id } =
      body || {};

    if (!id) {
      return new Response(JSON.stringify({ error: "Worker ID is required" }), {
        status: 400,
      });
    }

    const updateData: any = { updated_at: new Date().toISOString() };
    if (full_name !== undefined) updateData.full_name = full_name;
    if (phone_number !== undefined) updateData.phone_number = phone_number;
    if (email !== undefined) updateData.email = email;
    if (role !== undefined) updateData.role = role;
    if (status !== undefined) updateData.status = status;
    if (notes !== undefined) updateData.notes = notes;
    if (profile_id !== undefined) updateData.profile_id = profile_id;

    const { data, error } = await supabaseServer
      .from("workers")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    return new Response(JSON.stringify({ worker: data }), { status: 200 });
  } catch (error: any) {
    return new Response(
      JSON.stringify({
        error: escapeHtml(error.message) || "Failed to update worker",
      }),
      { status: 500 }
    );
  }
}

// DELETE /api/workers - Delete a worker
export async function DELETE(req: NextRequest) {
  const auth = await authorize(req);
  if (auth instanceof Response) return auth;

  try {
    const body = await req.json();
    const { id } = body || {};

    if (!id) {
      return new Response(JSON.stringify({ error: "Worker ID is required" }), {
        status: 400,
      });
    }

    const { error } = await supabaseServer
      .from("workers")
      .delete()
      .eq("id", id);

    if (error) throw error;

    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  } catch (error: any) {
    return new Response(
      JSON.stringify({
        error: escapeHtml(error.message) || "Failed to delete worker",
      }),
      { status: 500 }
    );
  }
}
