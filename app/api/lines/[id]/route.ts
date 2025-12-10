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

    const line = await prisma.lineDetails.findUnique({
      where: { id },
    });

    if (!line) {
      return NextResponse.json({ error: "Line not found" }, { status: 404 });
    }

    return NextResponse.json({ data: line });
  } catch (error) {
    console.error("Error fetching line:", error);
    return NextResponse.json(
      { error: "Failed to fetch line" },
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

    const { id } = await params;
    const body = await req.json();

    const line = await prisma.lineDetails.update({
      where: { id },
      data: body,
    });

    return NextResponse.json({ data: line });
  } catch (error) {
    console.error("Error updating line:", error);
    return NextResponse.json(
      { error: "Failed to update line" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Use a transaction to handle cascading deletes
    await prisma.$transaction(async (tx: any) => {
      // Remove dependent drum usage records
      await tx.drumUsage.deleteMany({
        where: { line_details_id: id },
      });

      // Remove any line assignees
      await tx.lineAssignees.deleteMany({
        where: { line_id: id },
      });

      // Null out any tasks that reference this line
      await tx.tasks.updateMany({
        where: { line_details_id: id },
        data: { line_details_id: null },
      });

      // Finally delete the line
      await tx.lineDetails.delete({
        where: { id },
      });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting line:", error);
    return NextResponse.json(
      { error: "Failed to delete line" },
      { status: 500 }
    );
  }
}
