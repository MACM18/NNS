// ==========================================
// ACCOUNTING API - PERIODS
// GET/POST /api/accounting/periods
// ==========================================

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  createPeriod,
  getCurrentPeriod,
  getPeriods,
  hasAccountingAccess,
} from "@/lib/accounting-service";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const profile = await prisma.profile.findUnique({
      where: { userId: session.user.id },
      select: { role: true },
    });

    if (!hasAccountingAccess(profile?.role)) {
      return NextResponse.json(
        { error: "Access denied. Moderator or admin role required." },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const current = searchParams.get("current") === "true";

    if (current) {
      const period = await getCurrentPeriod();
      return NextResponse.json({ data: period });
    }

    const periods = await getPeriods();
    return NextResponse.json({ data: periods });
  } catch (error) {
    console.error("Error fetching periods:", error);
    return NextResponse.json(
      { error: "Failed to fetch periods" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const profile = await prisma.profile.findUnique({
      where: { userId: session.user.id },
      select: { role: true },
    });

    if (!hasAccountingAccess(profile?.role)) {
      return NextResponse.json(
        { error: "Access denied. Moderator or admin role required." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { name, periodType, startDate, endDate, notes } = body;

    if (!name || !periodType || !startDate || !endDate) {
      return NextResponse.json(
        { error: "Name, period type, start date, and end date are required" },
        { status: 400 }
      );
    }

    const period = await createPeriod({
      name,
      periodType,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      notes,
    });

    return NextResponse.json({ data: period }, { status: 201 });
  } catch (error) {
    console.error("Error creating period:", error);
    return NextResponse.json(
      { error: "Failed to create period" },
      { status: 500 }
    );
  }
}
