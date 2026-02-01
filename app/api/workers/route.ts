import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getErrorMessage } from "@/lib/error-utils";

const ALLOWED_ROLES = ["admin", "moderator"];

interface WorkerResponse {
  id: string;
  full_name: string;
  phone_number: string | null;
  email: string | null;
  role: string;
  status: string;
  notes: string | null;
  profile_id: string | null;
  payment_type: string;
  per_line_rate: number | null;
  monthly_rate: number | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

function isValidEmailAddress(input: string): boolean {
  const email = input.trim();
  if (email.length === 0) return false;
  // Practical max length per common standards (RFC 5321/5322 guidance)
  if (email.length > 254) return false;
  // Fast reject whitespace
  for (let i = 0; i < email.length; i++) {
    const code = email.charCodeAt(i);
    // space, tab, CR, LF
    if (code === 32 || code === 9 || code === 10 || code === 13) return false;
  }

  const at = email.indexOf("@");
  if (at <= 0) return false;
  if (at !== email.lastIndexOf("@")) return false;
  if (at >= email.length - 1) return false;

  const local = email.slice(0, at);
  const domain = email.slice(at + 1);
  if (local.length > 64) return false;
  if (domain.length > 253) return false;

  // Local-part: allow common "atext" characters plus dots, but disallow
  // leading/trailing dot and consecutive dots.
  if (local.startsWith(".") || local.endsWith(".")) return false;
  if (local.includes("..")) return false;
  for (let i = 0; i < local.length; i++) {
    const c = local[i];
    const isAlphaNum =
      (c >= "a" && c <= "z") ||
      (c >= "A" && c <= "Z") ||
      (c >= "0" && c <= "9");
    const isAllowedSymbol = "!#$%&'*+/=?^_`{|}~.-".includes(c);
    if (!isAlphaNum && !isAllowedSymbol) return false;
  }

  // Domain: basic hostname-style validation with at least one dot.
  if (domain.startsWith(".") || domain.endsWith(".")) return false;
  if (domain.includes("..")) return false;
  const labels = domain.split(".");
  if (labels.length < 2) return false;

  for (const label of labels) {
    if (label.length === 0 || label.length > 63) return false;
    if (label.startsWith("-") || label.endsWith("-")) return false;
    for (let i = 0; i < label.length; i++) {
      const c = label[i];
      const isAlphaNum =
        (c >= "a" && c <= "z") ||
        (c >= "A" && c <= "Z") ||
        (c >= "0" && c <= "9");
      if (!isAlphaNum && c !== "-") return false;
    }
  }

  return true;
}

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
  profileId: string;
  role: string;
};

async function authorize(): Promise<AuthorizedContext | Response> {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
    });
  }

  // Look up role from profiles via Prisma
  const profile = await prisma.profile.findUnique({
    where: { userId: session.user.id },
    select: { id: true, role: true },
  });

  if (!profile) {
    return new Response(JSON.stringify({ error: "Profile not found" }), {
      status: 404,
    });
  }

  const role = (profile.role || "").toLowerCase();
  if (!ALLOWED_ROLES.includes(role)) {
    return new Response(
      JSON.stringify({
        error: "Forbidden - Admin or Moderator access required",
      }),
      { status: 403 }
    );
  }

  return { userId: session.user.id, profileId: profile.id, role };
}

// GET /api/workers - List all workers
export async function GET() {
  const auth = await authorize();
  if (auth instanceof Response) return auth;

  try {
    const workers = await prisma.worker.findMany({
      orderBy: { createdAt: "desc" },
    });

    // Normalize to snake_case for consistent API response
    const normalized: WorkerResponse[] = (workers || []).map((w) => ({
      id: w.id,
      full_name: w.fullName,
      phone_number: w.phoneNumber,
      email: w.email,
      role: w.role,
      status: w.status,
      notes: w.notes,
      profile_id: w.profileId,
      payment_type: w.paymentType,
      per_line_rate: w.perLineRate ? Number(w.perLineRate) : null,
      monthly_rate: w.monthlyRate ? Number(w.monthlyRate) : null,
      created_by: w.createdById,
      created_at: w.createdAt.toISOString(),
      updated_at: w.updatedAt.toISOString(),
    }));

    return new Response(JSON.stringify({ workers: normalized }), {
      status: 200,
    });
  } catch (error: any) {
    console.error("Failed to fetch workers", error);
    return new Response(
      JSON.stringify({
        error: "Failed to fetch workers",
      }),
      { status: 500 }
    );
  }
}

// POST /api/workers - Create a new worker
export async function POST(req: NextRequest) {
  const auth = await authorize();
  if (auth instanceof Response) return auth;

  try {
    const body = await req.json();
    const { full_name, phone_number, email, role, notes, profile_id } =
      body || {};

    // Validation
    if (!full_name || full_name.trim().length === 0) {
      return new Response(JSON.stringify({ error: "Full name is required" }), {
        status: 400,
      });
    }

    if (full_name.trim().length < 2) {
      return new Response(
        JSON.stringify({ error: "Full name must be at least 2 characters" }),
        { status: 400 }
      );
    }

    if (full_name.trim().length > 100) {
      return new Response(
        JSON.stringify({
          error: "Full name must not exceed 100 characters",
        }),
        { status: 400 }
      );
    }

    // Email validation
    if (email && email.trim().length > 0) {
      if (!isValidEmailAddress(email)) {
        return new Response(JSON.stringify({ error: "Invalid email format" }), {
          status: 400,
        });
      }
    }

    // Phone validation
    if (phone_number && phone_number.trim().length > 0) {
      const cleaned = phone_number.replace(/[\s\-()]/g, "");
      if (!/^\+?\d{9,15}$/.test(cleaned)) {
        return new Response(
          JSON.stringify({
            error: "Phone number must be 9-15 digits",
          }),
          { status: 400 }
        );
      }
    }

    // Notes validation
    if (notes && notes.length > 500) {
      return new Response(
        JSON.stringify({ error: "Notes must not exceed 500 characters" }),
        { status: 400 }
      );
    }

    const data = await prisma.worker.create({
      data: {
        fullName: full_name.trim(),
        phoneNumber: phone_number?.trim() || null,
        email: email?.trim() || null,
        role: role || "technician",
        notes: notes?.trim() || null,
        profileId: profile_id || null,
        createdById: auth.profileId,
      },
    });

    const normalized: WorkerResponse = {
      id: data.id,
      full_name: data.fullName,
      phone_number: data.phoneNumber,
      email: data.email,
      role: data.role,
      status: data.status,
      notes: data.notes,
      profile_id: data.profileId,
      payment_type: data.paymentType,
      per_line_rate: data.perLineRate ? Number(data.perLineRate) : null,
      monthly_rate: data.monthlyRate ? Number(data.monthlyRate) : null,
      created_by: data.createdById,
      created_at: data.createdAt.toISOString(),
      updated_at: data.updatedAt.toISOString(),
    };

    return new Response(JSON.stringify({ worker: normalized }), {
      status: 201,
    });
  } catch (error: unknown) {
    return new Response(
      JSON.stringify({
        error: escapeHtml(getErrorMessage(error, "Failed to create worker")),
      }),
      { status: 500 }
    );
  }
}

// PATCH /api/workers - Update a worker
export async function PATCH(req: NextRequest) {
  const auth = await authorize();
  if (auth instanceof Response) return auth;

  try {
    const body = await req.json();
    const {
      id,
      full_name,
      phone_number,
      email,
      role,
      status,
      notes,
      profile_id,
    } = body || {};

    if (!id) {
      return new Response(JSON.stringify({ error: "Worker ID is required" }), {
        status: 400,
      });
    }

    // Validate full_name if provided
    if (full_name !== undefined) {
      if (!full_name || full_name.trim().length === 0) {
        return new Response(
          JSON.stringify({ error: "Full name cannot be empty" }),
          { status: 400 }
        );
      }
      if (full_name.trim().length < 2) {
        return new Response(
          JSON.stringify({
            error: "Full name must be at least 2 characters",
          }),
          { status: 400 }
        );
      }
      if (full_name.trim().length > 100) {
        return new Response(
          JSON.stringify({
            error: "Full name must not exceed 100 characters",
          }),
          { status: 400 }
        );
      }
    }

    // Validate email if provided
    if (email !== undefined && email && email.trim().length > 0) {
      if (!isValidEmailAddress(email)) {
        return new Response(JSON.stringify({ error: "Invalid email format" }), {
          status: 400,
        });
      }
    }

    // Validate phone if provided
    if (
      phone_number !== undefined &&
      phone_number &&
      phone_number.trim().length > 0
    ) {
      const cleaned = phone_number.replace(/[\s\-()]/g, "");
      if (!/^\+?\d{9,15}$/.test(cleaned)) {
        return new Response(
          JSON.stringify({
            error: "Phone number must be 9-15 digits",
          }),
          { status: 400 }
        );
      }
    }

    // Validate notes if provided
    if (notes !== undefined && notes && notes.length > 500) {
      return new Response(
        JSON.stringify({ error: "Notes must not exceed 500 characters" }),
        { status: 400 }
      );
    }

    // Validate status if provided
    if (status !== undefined && !["active", "inactive"].includes(status)) {
      return new Response(
        JSON.stringify({ error: "Status must be 'active' or 'inactive'" }),
        { status: 400 }
      );
    }

    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (full_name !== undefined) updateData.fullName = full_name.trim();
    if (phone_number !== undefined)
      updateData.phoneNumber = phone_number?.trim() || null;
    if (email !== undefined) updateData.email = email?.trim() || null;
    if (role !== undefined) updateData.role = role;
    if (status !== undefined) updateData.status = status;
    if (notes !== undefined) updateData.notes = notes?.trim() || null;
    if (profile_id !== undefined) updateData.profileId = profile_id;
    if (body.payment_type !== undefined) updateData.paymentType = body.payment_type;
    if (body.per_line_rate !== undefined) updateData.perLineRate = body.per_line_rate;
    if (body.monthly_rate !== undefined) updateData.monthlyRate = body.monthly_rate;

    const data = await prisma.worker.update({
      where: { id },
      data: updateData,
    });

    const normalized: WorkerResponse = {
      id: data.id,
      full_name: data.fullName,
      phone_number: data.phoneNumber,
      email: data.email,
      role: data.role,
      status: data.status,
      notes: data.notes,
      profile_id: data.profileId,
      payment_type: data.paymentType,
      per_line_rate: data.perLineRate ? Number(data.perLineRate) : null,
      monthly_rate: data.monthlyRate ? Number(data.monthlyRate) : null,
      created_by: data.createdById,
      created_at: data.createdAt.toISOString(),
      updated_at: data.updatedAt.toISOString(),
    };

    return new Response(JSON.stringify({ worker: normalized }), {
      status: 200,
    });
  } catch (error: unknown) {
    return new Response(
      JSON.stringify({
        error: escapeHtml(getErrorMessage(error, "Failed to update worker")),
      }),
      { status: 500 }
    );
  }
}

// DELETE /api/workers - Delete a worker
export async function DELETE(req: NextRequest) {
  const auth = await authorize();
  if (auth instanceof Response) return auth;

  try {
    const body = await req.json();
    const { id } = body || {};

    if (!id) {
      return new Response(JSON.stringify({ error: "Worker ID is required" }), {
        status: 400,
      });
    }

    await prisma.worker.delete({ where: { id } });

    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  } catch (error: unknown) {
    return new Response(
      JSON.stringify({
        error: escapeHtml(getErrorMessage(error, "Failed to delete worker")),
      }),
      { status: 500 }
    );
  }
}
