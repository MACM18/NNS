// ==========================================
// ACCOUNTING API - JOURNAL ENTRIES
// GET/POST /api/accounting/journal-entries
// ==========================================

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  createJournalEntry,
  getJournalEntries,
  hasAccountingAccess,
} from "@/lib/accounting-service";
import type { JournalEntryStatusType } from "@/types/accounting";

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
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const status = searchParams.get("status") as JournalEntryStatusType | null;
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    const accountId = searchParams.get("accountId");
    const search = searchParams.get("search");
    const referenceType = searchParams.get("referenceType");

    const { entries, total } = await getJournalEntries(
      {
        status: status || undefined,
        dateFrom: dateFrom ? new Date(dateFrom) : undefined,
        dateTo: dateTo ? new Date(dateTo) : undefined,
        accountId: accountId || undefined,
        search: search || undefined,
        referenceType: referenceType || undefined,
      },
      page,
      limit
    );

    return NextResponse.json({
      data: entries,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching journal entries:", error);
    return NextResponse.json(
      { error: "Failed to fetch journal entries" },
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
      select: { id: true, role: true },
    });

    if (!hasAccountingAccess(profile?.role)) {
      return NextResponse.json(
        { error: "Access denied. Moderator or admin role required." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const {
      date,
      description,
      reference,
      referenceType,
      referenceId,
      periodId,
      currencyId,
      exchangeRate,
      notes,
      lines,
    } = body;

    if (
      !date ||
      !description ||
      !lines ||
      !Array.isArray(lines) ||
      lines.length < 2
    ) {
      return NextResponse.json(
        { error: "Date, description, and at least 2 entry lines are required" },
        { status: 400 }
      );
    }

    // Validate lines
    for (const line of lines) {
      if (!line.accountId) {
        return NextResponse.json(
          { error: "Each line must have an account" },
          { status: 400 }
        );
      }
      if (line.debitAmount === undefined && line.creditAmount === undefined) {
        return NextResponse.json(
          { error: "Each line must have a debit or credit amount" },
          { status: 400 }
        );
      }
    }

    const entry = await createJournalEntry(
      {
        date: new Date(date),
        description,
        reference,
        referenceType,
        referenceId,
        periodId,
        currencyId,
        exchangeRate,
        notes,
        lines: lines.map(
          (l: {
            accountId: string;
            description?: string;
            debitAmount?: number;
            creditAmount?: number;
          }) => ({
            accountId: l.accountId,
            description: l.description,
            debitAmount: l.debitAmount || 0,
            creditAmount: l.creditAmount || 0,
          })
        ),
      },
      profile!.id
    );

    return NextResponse.json({ data: entry }, { status: 201 });
  } catch (error) {
    console.error("Error creating journal entry:", error);
    const message =
      error instanceof Error ? error.message : "Failed to create journal entry";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
