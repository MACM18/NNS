import { NextRequest, NextResponse } from "next/server";
import { getMobilePrincipal } from "@/lib/mobile-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const noStore = { "Cache-Control": "no-store" };

function selectedMonth(value: string | null) {
  if (!value || !/^\d{4}-(0[1-9]|1[0-2])$/.test(value)) return null;
  const [year, month] = value.split("-").map(Number);
  if (year < 2000 || year > 2200) return null;
  return { start: new Date(Date.UTC(year, month - 1, 1)), end: new Date(Date.UTC(year, month, 1)) };
}

function serialize(line: any) {
  return {
    id: line.id,
    date: line.date.toISOString().slice(0, 10),
    telephoneNo: line.telephoneNo,
    name: line.name,
    dp: line.dp,
    status: line.status,
  };
}

export async function GET(request: NextRequest) {
  const principal = await getMobilePrincipal(request);
  if (!principal) return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: noStore });

  const month = selectedMonth(request.nextUrl.searchParams.get("month"));
  if (!month) return NextResponse.json({ error: "Choose a valid month" }, { status: 400, headers: noStore });

  const query = (request.nextUrl.searchParams.get("q") || "").trim().slice(0, 100);
  const cursor = request.nextUrl.searchParams.get("cursor");
  const rawLimit = Number(request.nextUrl.searchParams.get("limit") || 30);
  const limit = Number.isInteger(rawLimit) ? Math.max(1, Math.min(rawLimit, 50)) : 30;

  try {
    if (cursor) {
      const validCursor = await prisma.lineDetails.findFirst({
        where: { id: cursor, date: { gte: month.start, lt: month.end } },
        select: { id: true },
      });
      if (!validCursor) return NextResponse.json({ error: "Refresh the list before loading more" }, { status: 400, headers: noStore });
    }

    const where = {
      date: { gte: month.start, lt: month.end },
      ...(query ? { OR: [
        { telephoneNo: { contains: query } },
        { name: { contains: query, mode: "insensitive" as const } },
        { address: { contains: query, mode: "insensitive" as const } },
        { dp: { contains: query, mode: "insensitive" as const } },
      ] } : {}),
    };
    const rows = await prisma.lineDetails.findMany({
      where,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      take: limit + 1,
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      select: {
        id: true, date: true, telephoneNo: true, name: true, dp: true, status: true,
      },
    });
    const hasMore = rows.length > limit;
    const page = rows.slice(0, limit);
    return NextResponse.json({
      data: page.map(serialize),
      nextCursor: hasMore ? page[page.length - 1]?.id ?? null : null,
    }, { headers: noStore });
  } catch {
    return NextResponse.json({ error: "Could not load this month’s lines" }, { status: 500, headers: noStore });
  }
}
