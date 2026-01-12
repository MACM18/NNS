import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const ALLOWED_ROLES = ["admin", "moderator"];

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/\//g, "&#x2F;");
}

type AuthorizedContext = { userId: string; profileId: string; role: string };

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

/**
 * Worker data structure representing a field technician or installer.
 * Workers are tracked separately from user accounts for flexibility.
 */
interface Worker {
  /** Unique identifier for the worker */
  id: string;
  /** Worker's full name */
  fullName: string | null;
  /** Worker's role/position (e.g., technician, installer) */
  role: string | null;
  /** Worker's current status (active or inactive) */
  status: string | null;
}

interface WorkerResponse {
  id: string;
  full_name: string | null;
  role: string | null;
}

async function authorize(): Promise<AuthorizedContext | Response> {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
    });
  }

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
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
    });
  }

  return { userId: session.user.id, profileId: profile.id, role };
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
  const auth = await authorize();
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
    const lines = await prisma.lineDetails.findMany({
      where: { date: { gte: new Date(start), lte: new Date(end) } },
      select: {
        id: true,
        date: true,
        telephoneNo: true,
        name: true,
        address: true,
        dp: true,
      },
      orderBy: { date: "asc" },
    });

    const assignments = await prisma.workAssignment.findMany({
      where: { assignedDate: { gte: new Date(start), lte: new Date(end) } },
      select: { id: true, lineId: true, assignedDate: true, workerId: true },
      orderBy: { assignedDate: "asc" },
    });

    const workerIds = Array.from(
      new Set((assignments as any[]).map((a: any) => a.workerId))
    );

    let workerDetails: Worker[] = [];
    if (workerIds.length) {
      const workers = await prisma.worker.findMany({
        where: { id: { in: workerIds } },
        select: { id: true, fullName: true, role: true, status: true },
      });
      workerDetails = workers as Worker[];
    }

    const workerOptions = await prisma.worker.findMany({
      where: { status: "active" },
      select: { id: true, fullName: true, role: true, status: true },
      orderBy: { fullName: "asc" },
    });

    const workerLookup = new Map<string, Worker>();
    workerDetails.forEach((worker) => workerLookup.set(worker.id, worker));

    const lineMap = new Map<string, any>();
    const dayMap = new Map<string, { date: string; lines: any[] }>();

    (lines || []).forEach((line: any) => {
      const dateKey = (line.date as Date).toISOString().slice(0, 10);
      const lineEntry = {
        id: line.id,
        date: dateKey,
        telephone_no: line.telephoneNo,
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

    (assignments || []).forEach((assignment: any) => {
      const dateKey = (assignment.assignedDate as Date)
        .toISOString()
        .slice(0, 10);
      const key = `${assignment.lineId}_${dateKey}`;
      const lineEntry = lineMap.get(key);
      if (!lineEntry) return;
      const worker = workerLookup.get(assignment.workerId);
      lineEntry.assignments.push({
        id: assignment.id,
        worker_id: assignment.workerId,
        worker_name: worker?.fullName || "Unnamed",
        worker_role: worker?.role || null,
        assigned_date: dateKey,
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
        workers: (workerOptions || []).map(
          (worker: Worker): WorkerResponse => ({
            id: worker.id,
            full_name: worker.fullName,
            role: worker.role,
          })
        ),
      }),
      { status: 200 }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({
        error: escapeHtml(error.message) || "Failed to load assignments",
      }),
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const auth = await authorize();
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

    try {
      const created = await prisma.workAssignment.create({
        data: {
          lineId,
          workerId,
          assignedDate: new Date(date),
          createdById: auth.profileId,
        },
        select: { id: true },
      });
      return new Response(JSON.stringify({ id: created.id }), { status: 201 });
    } catch (e: any) {
      if (e?.code === "P2002") {
        return new Response(
          JSON.stringify({
            error: "Worker already assigned for this line and date",
          }),
          { status: 409 }
        );
      }
      throw e;
    }
  } catch (error: any) {
    return new Response(
      JSON.stringify({
        error: escapeHtml(error.message) || "Failed to assign worker",
      }),
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  const auth = await authorize();
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

    await prisma.workAssignment.delete({ where: { id: assignmentId } });
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  } catch (error: any) {
    return new Response(
      JSON.stringify({
        error: escapeHtml(error.message) || "Failed to remove assignment",
      }),
      { status: 500 }
    );
  }
}
