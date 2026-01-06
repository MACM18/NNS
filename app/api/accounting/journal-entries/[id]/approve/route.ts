// ==========================================
// ACCOUNTING API - APPROVE JOURNAL ENTRY
// POST /api/accounting/journal-entries/[id]/approve
// ==========================================

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { approveJournalEntry, hasAccountingAccess } from "@/lib/accounting-service";

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

    // Only admin can approve entries
    const role = (profile?.role || "").toLowerCase();
    if (!["admin", "superadmin"].includes(role)) {
      return NextResponse.json(
        { error: "Only administrators can approve journal entries" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const entry = await approveJournalEntry(id, profile!.id);

    return NextResponse.json({ data: entry });
  } catch (error) {
    console.error("Error approving journal entry:", error);
    const message = error instanceof Error ? error.message : "Failed to approve journal entry";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
