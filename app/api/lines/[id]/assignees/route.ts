import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const assignees = await prisma.lineAssignee.findMany({
      where: { line_id: id },
      include: {
        profile: {
          select: {
            id: true,
            full_name: true,
            role: true,
            email: true,
          },
        },
      },
    });

    const assigneeProfiles = assignees
      .map((a: any) => a.profile)
      .filter(Boolean);

    return NextResponse.json({ data: assigneeProfiles });
  } catch (error) {
    console.error("Error fetching line assignees:", error);
    return NextResponse.json(
      { error: "Failed to fetch assignees" },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: lineId } = await params;
    const body = await req.json();
    const { userIds } = body; // Array of user IDs to assign

    if (!Array.isArray(userIds)) {
      return NextResponse.json(
        { error: "userIds must be an array" },
        { status: 400 }
      );
    }

    // Get current assignees
    const currentAssignees = await prisma.lineAssignee.findMany({
      where: { line_id: lineId },
      select: { user_id: true },
    });

    const currentIds = new Set(currentAssignees.map((a: any) => a.user_id));
    const newIds = new Set(userIds);

    // Find users to add and remove
    const toAdd = userIds.filter((id: string) => !currentIds.has(id));
    const toRemove = Array.from(currentIds).filter((id) => !newIds.has(id));

    // Use transaction to update assignees
    await prisma.$transaction(async (tx: any) => {
      // Remove assignees
      if (toRemove.length > 0) {
        await tx.lineAssignee.deleteMany({
          where: {
            line_id: lineId,
            user_id: { in: toRemove },
          },
        });
      }

      // Add new assignees
      if (toAdd.length > 0) {
        await tx.lineAssignee.createMany({
          data: toAdd.map((userId: string) => ({
            line_id: lineId,
            user_id: userId,
            assigned_at: new Date(),
          })),
        });
      }
    });

    // Fetch updated assignees
    const updatedAssignees = await prisma.lineAssignee.findMany({
      where: { line_id: lineId },
      include: {
        profile: {
          select: {
            id: true,
            full_name: true,
            role: true,
            email: true,
          },
        },
      },
    });

    const assigneeProfiles = updatedAssignees
      .map((a: any) => a.profile)
      .filter(Boolean);

    return NextResponse.json({ data: assigneeProfiles });
  } catch (error) {
    console.error("Error updating line assignees:", error);
    return NextResponse.json(
      { error: "Failed to update assignees" },
      { status: 500 }
    );
  }
}
