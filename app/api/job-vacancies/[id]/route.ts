import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const job = await prisma.jobVacancies.findUnique({
      where: { id: parseInt(id) },
    });

    if (!job) {
      return NextResponse.json(
        { error: "Job vacancy not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: job });
  } catch (error) {
    console.error("Error fetching job vacancy:", error);
    return NextResponse.json(
      { error: "Failed to fetch job vacancy" },
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

    const job = await prisma.jobVacancies.update({
      where: { id: parseInt(id) },
      data: {
        ...body,
        application_deadline: body.application_deadline
          ? new Date(body.application_deadline)
          : undefined,
        updated_at: new Date(),
      },
    });

    return NextResponse.json({ data: job });
  } catch (error) {
    console.error("Error updating job vacancy:", error);
    return NextResponse.json(
      { error: "Failed to update job vacancy" },
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

    await prisma.jobVacancies.delete({
      where: { id: parseInt(id) },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting job vacancy:", error);
    return NextResponse.json(
      { error: "Failed to delete job vacancy" },
      { status: 500 }
    );
  }
}
