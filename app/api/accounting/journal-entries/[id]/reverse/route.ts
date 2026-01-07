// ==========================================
// ACCOUNTING API - REVERSE JOURNAL ENTRY
// POST /api/accounting/journal-entries/[id]/reverse
// ==========================================

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  hasAccountingAccess,
  reverseJournalEntry,
} from "@/lib/accounting-service";

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

    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const reason = body.reason as string | undefined;

    const reversalEntry = await reverseJournalEntry(id, profile!.id, reason);

    return NextResponse.json({
      data: reversalEntry,
      message: "Journal entry reversed successfully",
    });
  } catch (error) {
    console.error("Error reversing journal entry:", error);
    const message =
      error instanceof Error
        ? error.message
        : "Failed to reverse journal entry";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
