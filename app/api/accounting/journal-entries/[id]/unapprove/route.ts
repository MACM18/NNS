// ==========================================
// ACCOUNTING API - UNAPPROVE JOURNAL ENTRY
// POST /api/accounting/journal-entries/[id]/unapprove
// ==========================================

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  unapproveJournalEntry,
  hasAccountingAccess,
} from "@/lib/accounting-service";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
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
        { status: 403 },
      );
    }

    // Only admin can unapprove entries
    const role = (profile?.role || "").toLowerCase();
    if (!["admin", "superadmin"].includes(role)) {
      return NextResponse.json(
        { error: "Only administrators can unapprove journal entries" },
        { status: 403 },
      );
    }

    const { id } = await params;
    const entry = await unapproveJournalEntry(id);

    return NextResponse.json({ data: entry });
  } catch (error) {
    console.error("Error unapproving journal entry:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: message },
      { status: message.includes("not found") ? 404 : 400 },
    );
  }
}
