import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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
    select: { role: true },
  });

  const role = (profile?.role || "").toLowerCase();
  if (!ALLOWED_ROLES.includes(role)) {
    return new Response(
      JSON.stringify({ error: "Forbidden - Admin access required" }),
      { status: 403 }
    );
  }

  return { userId: session.user.id, role };
}

// GET /api/workers - List all workers
export async function GET() {
  const auth = await authorize();
  if (auth instanceof Response) return auth;

  try {
    const workers = await prisma.worker.findMany({
      orderBy: { createdAt: "desc" },
    });

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
  const auth = await authorize();
  if (auth instanceof Response) return auth;

  try {
    const body = await req.json();
    const { full_name, phone_number, email, role, notes, profile_id } =
      body || {};

    if (!full_name) {
      return new Response(JSON.stringify({ error: "Full name is required" }), {
        status: 400,
      });
    }

    const data = await prisma.worker.create({
      data: {
        fullName: full_name,
        phoneNumber: phone_number,
        email,
        role: role || "technician",
        notes,
        profileId: profile_id || null,
        createdById: auth.userId,
      },
    });

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

    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (full_name !== undefined) updateData.fullName = full_name;
    if (phone_number !== undefined) updateData.phoneNumber = phone_number;
    if (email !== undefined) updateData.email = email;
    if (role !== undefined) updateData.role = role;
    if (status !== undefined) updateData.status = status;
    if (notes !== undefined) updateData.notes = notes;
    if (profile_id !== undefined) updateData.profileId = profile_id;

    const data = await prisma.worker.update({
      where: { id },
      data: updateData,
    });

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
  } catch (error: any) {
    return new Response(
      JSON.stringify({
        error: escapeHtml(error.message) || "Failed to delete worker",
      }),
      { status: 500 }
    );
  }
}
