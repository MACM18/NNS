import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

import { supabaseServer } from "@/lib/supabase-server";

const ALLOWED_ROLES = ["admin", "moderator"];

type AuthorizedContext = {
  userId: string;
  role: string;
};

type LineDetail = {
  id: string;
  date: string;
  telephone_no: string | null;
  name: string | null;
  address: string | null;
  dp: string | null;
};

type AssignmentRow = {
  id: string;
  line_id: string;
  assigned_date: string;
  worker_id: string;
};

type WorkerProfile = {
  id: string;
  full_name: string | null;
  role: string | null;
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
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
    });
  }

  return { userId: user.id, role };
}

function monthStartEnd(month: number, year: number) {
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 0));
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
}

export async function GET(req: NextRequest) {
  const auth = await authorize(req);
  if (auth instanceof Response) return auth;

  const searchParams = req.nextUrl.searchParams;
  const month = Number(searchParams.get("month"));
  const year = Number(searchParams.get("year"));

  if (!month || !year || Number.isNaN(month) || Number.isNaN(year)) {
    return new Response(JSON.stringify({ error: "Invalid month or year" }), {
      status: 400,
    });
  }

  const { start, end } = monthStartEnd(month, year);

  try {
    const { data: lines, error: lineErr } = await supabaseServer
      .from("line_details")
      .select("id, date, telephone_no, name, address, dp")
      .gte("date", start)
      .lte("date", end);

    if (lineErr) throw lineErr;

    const { data: assignments, error: assignmentErr } = await supabaseServer
      .from("work_assignments")
      .select("id, line_id, assigned_date, worker_id")
      .gte("assigned_date", start)
      .lte("assigned_date", end);

    if (assignmentErr) throw assignmentErr;

    const workerIds = Array.from(
      new Set((assignments || []).map((row: AssignmentRow) => row.worker_id))
    );

    let workerDetails: WorkerProfile[] = [];
    if (workerIds.length) {
      const { data: workerProfiles, error: workerErr } = await supabaseServer
        .from("profiles")
        .select("id, full_name, role")
        .in("id", workerIds);

      if (workerErr) throw workerErr;
      workerDetails = workerProfiles || [];
    }

    const { data: workerOptions, error: optionsErr } = await supabaseServer
      .from("profiles")
      .select("id, full_name, role")
      .eq("role", "employee")
      .order("full_name", { ascending: true });

    if (optionsErr) throw optionsErr;

    const workerLookup = new Map<string, WorkerProfile>();
    workerDetails.forEach((worker) => workerLookup.set(worker.id, worker));

    const lineMap = new Map<string, any>();
    const dayMap = new Map<string, { date: string; lines: any[] }>();

    (lines || []).forEach((line: LineDetail) => {
      const dateKey = line.date;
      const lineEntry = {
        id: line.id,
        date: line.date,
        telephone_no: line.telephone_no,
        customer_name: line.name,
        address: line.address,
        dp: line.dp,
        assignments: [] as any[],
      };
      lineMap.set(`${line.id}_${dateKey}`, lineEntry);

      if (!dayMap.has(dateKey)) {
        dayMap.set(dateKey, { date: dateKey, lines: [] });
      }
      dayMap.get(dateKey)!.lines.push(lineEntry);
    });

    (assignments || []).forEach((assignment: AssignmentRow) => {
      const key = `${assignment.line_id}_${assignment.assigned_date}`;
      const lineEntry = lineMap.get(key);
      if (!lineEntry) return;
      const worker = workerLookup.get(assignment.worker_id);
      lineEntry.assignments.push({
        id: assignment.id,
        worker_id: assignment.worker_id,
        worker_name: worker?.full_name || "Unnamed",
        worker_role: worker?.role || null,
        assigned_date: assignment.assigned_date,
      });
    });

    const days = Array.from(dayMap.values()).sort((a, b) =>
      a.date.localeCompare(b.date)
    );

    return new Response(
      JSON.stringify({
        month,
        year,
        days,
        workers: (workerOptions || []).map((worker: WorkerProfile) => ({
          id: worker.id,
          full_name: worker.full_name,
          role: worker.role,
        })),
      }),
      { status: 200 }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message || "Failed to load assignments" }),
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const auth = await authorize(req);
  if (auth instanceof Response) return auth;

  try {
    const body = await req.json();
    const { lineId, workerId, date } = body || {};

    if (!lineId || !workerId || !date) {
      return new Response(
        JSON.stringify({ error: "lineId, workerId and date are required" }),
        { status: 400 }
      );
    }

    const { data, error } = await supabaseServer
      .from("work_assignments")
      .insert({
        line_id: lineId,
        worker_id: workerId,
        assigned_date: date,
        created_by: auth.userId,
      })
      .select("id")
      .single();

    if (error) {
      if (error.code === "23505") {
        return new Response(
          JSON.stringify({
            error: "Worker already assigned for this line and date",
          }),
          { status: 409 }
        );
      }
      throw error;
    }

    return new Response(JSON.stringify({ id: data?.id }), { status: 201 });
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message || "Failed to assign worker" }),
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  const auth = await authorize(req);
  if (auth instanceof Response) return auth;

  try {
    const body = await req.json();
    const { assignmentId } = body || {};

    if (!assignmentId) {
      return new Response(
        JSON.stringify({ error: "assignmentId is required" }),
        { status: 400 }
      );
    }

    const { error } = await supabaseServer
      .from("work_assignments")
      .delete()
      .eq("id", assignmentId);

    if (error) throw error;

    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message || "Failed to remove assignment" }),
      { status: 500 }
    );
  }
}
