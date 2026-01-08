// ==========================================
// ACCOUNTING API - PERIOD BY ID
// PUT/DELETE /api/accounting/periods/[id]
// ==========================================

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
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

    // Only admin can update periods
    if (profile?.role?.toLowerCase() !== "admin") {
      return NextResponse.json(
        { error: "Access denied. Admin role required." },
        { status: 403 }
      );
    }

    const { id } = params;
    const body = await req.json();
    const { name, periodType, startDate, endDate, notes } = body;

    // Check if period exists and is not closed
    const existingPeriod = await prisma.accountingPeriod.findUnique({
      where: { id },
    });

    if (!existingPeriod) {
      return NextResponse.json({ error: "Period not found" }, { status: 404 });
    }

    if (existingPeriod.isClosed) {
      return NextResponse.json(
        { error: "Cannot update a closed period" },
        { status: 400 }
      );
    }

    // Update the period
    const updatedPeriod = await prisma.accountingPeriod.update({
      where: { id },
      data: {
        name: name || existingPeriod.name,
        periodType: periodType || existingPeriod.periodType,
        startDate: startDate ? new Date(startDate) : existingPeriod.startDate,
        endDate: endDate ? new Date(endDate) : existingPeriod.endDate,
        notes: notes !== undefined ? notes : existingPeriod.notes,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({ data: updatedPeriod });
  } catch (error) {
    console.error("Error updating period:", error);
    return NextResponse.json(
      { error: "Failed to update period" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
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

    // Only admin can delete periods
    if (profile?.role?.toLowerCase() !== "admin") {
      return NextResponse.json(
        { error: "Access denied. Admin role required." },
        { status: 403 }
      );
    }

    const { id } = params;

    // Check if period exists
    const existingPeriod = await prisma.accountingPeriod.findUnique({
      where: { id },
    });

    if (!existingPeriod) {
      return NextResponse.json({ error: "Period not found" }, { status: 404 });
    }

    // Check if period is closed
    if (existingPeriod.isClosed) {
      return NextResponse.json(
        { error: "Cannot delete a closed period" },
        { status: 400 }
      );
    }

    // Check if period has any journal entries
    const entryCount = await prisma.journalEntry.count({
      where: { periodId: id },
    });

    if (entryCount > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete period with ${entryCount} journal entries. Please move or delete them first.`,
        },
        { status: 400 }
      );
    }

    // Delete the period
    await prisma.accountingPeriod.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting period:", error);
    return NextResponse.json(
      { error: "Failed to delete period" },
      { status: 500 }
    );
  }
}
