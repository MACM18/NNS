// ==========================================
// ACCOUNTING API - SINGLE JOURNAL ENTRY
// GET /api/accounting/journal-entries/[id]
// POST /api/accounting/journal-entries/[id]/approve
// POST /api/accounting/journal-entries/[id]/reverse
// ==========================================

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  approveJournalEntry,
  getJournalEntry,
  hasAccountingAccess,
  reverseJournalEntry,
} from "@/lib/accounting-service";

export async function GET(
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
      select: { role: true },
    });

    if (!hasAccountingAccess(profile?.role)) {
      return NextResponse.json(
        { error: "Access denied. Moderator or admin role required." },
        { status: 403 }
      );
    }

    const { id } = await params;
    const entry = await getJournalEntry(id);

    if (!entry) {
      return NextResponse.json(
        { error: "Journal entry not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: entry });
  } catch (error) {
    console.error("Error fetching journal entry:", error);
    return NextResponse.json(
      { error: "Failed to fetch journal entry" },
      { status: 500 }
    );
  }
}
