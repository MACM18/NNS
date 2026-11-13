import { NextRequest, NextResponse } from "next/server";
import { getMobilePrincipal } from "@/lib/mobile-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function parseMonth(monthValue: string | null, yearValue: string | null) {
  const month = Number(monthValue);
  const year = Number(yearValue);
  if (!Number.isInteger(month) || month < 1 || month > 12 || !Number.isInteger(year) || year < 2000 || year > 2200) return null;
  return { month, year, start: new Date(Date.UTC(year, month - 1, 1)), end: new Date(Date.UTC(year, month, 1)) };
}

export async function GET(request: NextRequest) {
  const principal = await getMobilePrincipal(request);
  if (!principal) return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: { "Cache-Control": "no-store" } });

  const selected = parseMonth(request.nextUrl.searchParams.get("month"), request.nextUrl.searchParams.get("year"));
  if (!selected) return NextResponse.json({ error: "Choose a valid month and year" }, { status: 400, headers: { "Cache-Control": "no-store" } });

  try {
    const lines = await prisma.lineDetails.findMany({
      where: { date: { gte: selected.start, lt: selected.end } },
      select: {
        date: true, status: true, completedDate: true,
        cableStart: true, cableMiddle: true, cableEnd: true,
        workAssignments: { select: { worker: { select: { id: true, fullName: true } } } },
      },
      orderBy: { date: "asc" },
    });

    const daily = new Map<string, { date: string; total: number; completed: number; inProgress: number; f1: number; g1: number; cable: number }>();
    const crew = new Map<string, { workerId: string; workerName: string; lines: number; completed: number; cable: number }>();
    let completed = 0;
    let inProgress = 0;
    let pending = 0;
    let f1Total = 0;
    let g1Total = 0;

    for (const line of lines) {
      const date = line.date.toISOString().slice(0, 10);
      const start = Number(line.cableStart || 0);
      const middle = Number(line.cableMiddle || 0);
      const end = Number(line.cableEnd || 0);
      const f1 = Math.abs(middle - start);
      const g1 = Math.abs(end - middle);
      const cable = f1 + g1;
      const isCompleted = Boolean(line.completedDate || line.status === "completed");
      if (isCompleted) completed += 1;
      else if (line.status === "in_progress") inProgress += 1;
      else pending += 1;
      f1Total += f1;
      g1Total += g1;

      const day = daily.get(date) || { date, total: 0, completed: 0, inProgress: 0, f1: 0, g1: 0, cable: 0 };
      day.total += 1;
      if (isCompleted) day.completed += 1;
      else if (line.status === "in_progress") day.inProgress += 1;
      day.f1 += f1; day.g1 += g1; day.cable += cable;
      daily.set(date, day);

      for (const assignment of line.workAssignments) {
        const id = assignment.worker.id;
        const person = crew.get(id) || { workerId: id, workerName: assignment.worker.fullName, lines: 0, completed: 0, cable: 0 };
        person.lines += 1;
        if (isCompleted) person.completed += 1;
        person.cable += cable;
        crew.set(id, person);
      }
    }

    return NextResponse.json({
      month: `${selected.year}-${String(selected.month).padStart(2, "0")}`,
      totals: { lines: lines.length, completed, inProgress, pending, f1: f1Total, g1: g1Total, cable: f1Total + g1Total },
      daily: [...daily.values()],
      crew: [...crew.values()].sort((left, right) => right.lines - left.lines || left.workerName.localeCompare(right.workerName)),
      fetchedAt: new Date().toISOString(),
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Mobile line summary failed", error);
    return NextResponse.json({ error: "Could not load the line summary" }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}
