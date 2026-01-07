import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

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

    const task = await prisma.task.findUnique({
      where: { id },
      include: {
        createdBy: {
          select: {
            fullName: true,
            role: true,
          },
        },
      },
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // Transform to snake_case
    const transformedTask = {
      id: task.id,
      task_date: task.taskDate?.toISOString().split("T")[0],
      telephone_no: task.telephoneNo,
      dp: task.dp,
      contact_no: task.contactNo,
      customer_name: task.customerName,
      address: task.address,
      status: task.status,
      connection_type_new: task.connectionTypeNew,
      connection_services: task.connectionServices,
      rejection_reason: task.rejectionReason,
      rejected_by: task.rejectedById,
      rejected_at: task.rejectedAt?.toISOString(),
      completed_at: task.completedAt?.toISOString(),
      completed_by: task.completedById,
      line_details_id: task.lineDetailsId,
      notes: task.notes,
      created_at: task.createdAt.toISOString(),
      created_by: task.createdById,
      profiles: task.createdBy
        ? {
            full_name: task.createdBy.fullName,
            role: task.createdBy.role,
          }
        : null,
    };

    return NextResponse.json({ data: transformedTask });
  } catch (error) {
    console.error("Error fetching task:", error);
    return NextResponse.json(
      { error: "Failed to fetch task" },
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

    // Map snake_case fields to camelCase for Prisma
    const updateData: Record<string, unknown> = {};

    if (body.task_date !== undefined)
      updateData.taskDate = new Date(body.task_date);
    if (body.telephone_no !== undefined)
      updateData.telephoneNo = body.telephone_no;
    if (body.dp !== undefined) updateData.dp = body.dp;
    if (body.contact_no !== undefined) updateData.contactNo = body.contact_no;
    if (body.customer_name !== undefined)
      updateData.customerName = body.customer_name;
    if (body.address !== undefined) updateData.address = body.address;
    if (body.status !== undefined) updateData.status = body.status;
    if (body.connection_type_new !== undefined)
      updateData.connectionTypeNew = body.connection_type_new;
    if (body.connection_services !== undefined)
      updateData.connectionServices = body.connection_services;
    if (body.rejection_reason !== undefined)
      updateData.rejectionReason = body.rejection_reason;
    if (body.rejected_by !== undefined)
      updateData.rejectedById = body.rejected_by;
    if (body.rejected_at !== undefined)
      updateData.rejectedAt = new Date(body.rejected_at);
    if (body.completed_at !== undefined)
      updateData.completedAt = new Date(body.completed_at);
    if (body.completed_by !== undefined)
      updateData.completedById = body.completed_by;
    if (body.assigned_to !== undefined)
      updateData.assignedToId = body.assigned_to;
    if (body.line_details_id !== undefined)
      updateData.lineDetailsId = body.line_details_id;
    if (body.notes !== undefined) updateData.notes = body.notes;

    const task = await prisma.task.update({
      where: { id },
      data: updateData,
    });

    // Transform response to snake_case
    const transformedTask = {
      id: task.id,
      task_date: task.taskDate?.toISOString().split("T")[0],
      telephone_no: task.telephoneNo,
      dp: task.dp,
      contact_no: task.contactNo,
      customer_name: task.customerName,
      address: task.address,
      status: task.status,
      connection_type_new: task.connectionTypeNew,
      connection_services: task.connectionServices,
      rejection_reason: task.rejectionReason,
      rejected_by: task.rejectedById,
      rejected_at: task.rejectedAt?.toISOString(),
      completed_at: task.completedAt?.toISOString(),
      completed_by: task.completedById,
      line_details_id: task.lineDetailsId,
      notes: task.notes,
      created_at: task.createdAt.toISOString(),
      created_by: task.createdById,
    };

    return NextResponse.json({ data: transformedTask });
  } catch (error) {
    console.error("Error updating task:", error);
    return NextResponse.json(
      { error: "Failed to update task" },
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

    // Use a transaction to safely delete task and handle related records
    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // Find the task first
      const task = await tx.task.findUnique({
        where: { id },
        select: { lineDetailsId: true },
      });

      if (!task) {
        throw new Error("Task not found");
      }

      // Find all line_details related to this task
      const lineDetailsIds: string[] = [];

      if (task.lineDetailsId) {
        lineDetailsIds.push(task.lineDetailsId);
      }

      // Find any line_details where task_id points to this task
      const relatedLineDetails = await tx.lineDetails.findMany({
        where: { taskId: id },
        select: { id: true },
      });

      lineDetailsIds.push(
        ...relatedLineDetails.map((ld: { id: string }) => ld.id)
      );

      // Remove duplicates
      const uniqueLineDetailsIds = [...new Set(lineDetailsIds)];

      // If there are related line_details, handle drum_usage and clear task references
      if (uniqueLineDetailsIds.length > 0) {
        // Delete drum_usage records for these line_details
        await tx.drumUsage.deleteMany({
          where: { lineDetailsId: { in: uniqueLineDetailsIds } },
        });

        // Clear task_id reference on line_details
        await tx.lineDetails.updateMany({
          where: { id: { in: uniqueLineDetailsIds } },
          data: { taskId: null },
        });
      }

      // Now delete the task
      await tx.task.delete({
        where: { id },
      });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting task:", error);
    return NextResponse.json(
      { error: "Failed to delete task" },
      { status: 500 }
    );
  }
}
