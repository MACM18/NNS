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

    const formatted = {
      id: drum.id,
      drum_number: drum.drumNumber,
      item_id: drum.itemId ?? null,
      initial_quantity: Number(drum.initialQuantity),
      current_quantity: Number(drum.currentQuantity),
      status: drum.status,
      received_date: drum.receivedDate ? drum.receivedDate.toISOString() : null,
      created_at: drum.createdAt?.toISOString(),
      updated_at: drum.updatedAt?.toISOString(),
    };

    return NextResponse.json({ data: formatted });
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

    const updateData: any = {};
    if (body.drum_number !== undefined || body.drumNumber !== undefined)
      updateData.drumNumber = body.drum_number ?? body.drumNumber;
    if (
      body.initial_quantity !== undefined ||
      body.initialQuantity !== undefined
    )
      updateData.initialQuantity = Number(
        body.initial_quantity ?? body.initialQuantity
      );
    if (
      body.current_quantity !== undefined ||
      body.currentQuantity !== undefined
    )
      updateData.currentQuantity = Number(
        body.current_quantity ?? body.currentQuantity
      );
    if (body.received_date !== undefined || body.receivedDate !== undefined)
      updateData.receivedDate = body.received_date
        ? new Date(body.received_date)
        : new Date(body.receivedDate);
    if (body.status !== undefined) updateData.status = body.status;

    const drum = await prisma.drumTracking.update({
      where: { id },
      data: updateData,
    });

    const formatted = {
      id: drum.id,
      drum_number: drum.drumNumber,
      item_id: drum.itemId ?? null,
      initial_quantity: Number(drum.initialQuantity),
      current_quantity: Number(drum.currentQuantity),
      status: drum.status,
      received_date: drum.receivedDate ? drum.receivedDate.toISOString() : null,
      created_at: drum.createdAt?.toISOString(),
      updated_at: drum.updatedAt?.toISOString(),
    };

    return NextResponse.json({ data: formatted });
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
      // First delete related drum usage records (use Prisma field name drumId)
      await tx.drumUsage.deleteMany({
        where: { drumId: id },
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
