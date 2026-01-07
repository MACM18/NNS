// ==========================================
// ACCOUNTING API - SUMMARY (Dashboard)
// GET /api/accounting/summary
// ==========================================

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  getAccountingSummary,
  hasAccountingAccess,
} from "@/lib/accounting-service";

export async function GET() {
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

    const summary = await getAccountingSummary();

    return NextResponse.json({ data: summary });
  } catch (error) {
    console.error("Error fetching accounting summary:", error);
    return NextResponse.json(
      { error: "Failed to fetch accounting summary" },
      { status: 500 }
    );
  }
}
