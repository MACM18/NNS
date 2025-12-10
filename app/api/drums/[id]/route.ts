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

    const drum = await prisma.drumTracking.findUnique({
      where: { id },
    });

    if (!drum) {
      return NextResponse.json({ error: "Drum not found" }, { status: 404 });
    }

    return NextResponse.json({ data: drum });
  } catch (error) {
    console.error("Error fetching drum:", error);
    return NextResponse.json(
      { error: "Failed to fetch drum" },
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

    const drum = await prisma.drumTracking.update({
      where: { id },
      data: body,
    });

    return NextResponse.json({ data: drum });
  } catch (error) {
    console.error("Error updating drum:", error);
    return NextResponse.json(
      { error: "Failed to update drum" },
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

    // Delete in transaction to ensure consistency
    await prisma.$transaction(async (tx: any) => {
      // First delete related drum usage records
      await tx.drumUsage.deleteMany({
        where: { drum_id: id },
      });

      // Then delete the drum
      await tx.drumTracking.delete({
        where: { id },
      });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting drum:", error);
    return NextResponse.json(
      { error: "Failed to delete drum" },
      { status: 500 }
    );
  }
}
