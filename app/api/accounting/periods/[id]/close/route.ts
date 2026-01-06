// ==========================================
// ACCOUNTING API - CLOSE PERIOD
// POST /api/accounting/periods/[id]/close
// ==========================================

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { closePeriod, hasAccountingAccess } from "@/lib/accounting-service";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const profile = await prisma.profile.findUnique({
      where: { userId: session.user.id },
      select: { id: true, role: true },
    });

    if (!hasAccountingAccess(profile?.role)) {
      return NextResponse.json(
        { error: "Access denied. Moderator or admin role required." },
        { status: 403 }
      );
    }

    // Only admin can close periods
    const role = (profile?.role || "").toLowerCase();
    if (!["admin", "superadmin"].includes(role)) {
      return NextResponse.json(
        { error: "Only administrators can close accounting periods" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const period = await closePeriod(id, profile!.id);

    return NextResponse.json({ data: period });
  } catch (error) {
    console.error("Error closing period:", error);
    return NextResponse.json(
      { error: "Failed to close period" },
      { status: 500 }
    );
  }
}
