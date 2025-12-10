import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/tasks/available - accepted tasks that are not yet assigned to any line_details
export async function GET(_req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get all task IDs that are already used by line_details
    const assigned = await prisma.lineDetails.findMany({
      where: { taskId: { not: null } },
      select: { taskId: true },
    });
    const assignedIds = assigned
      .map((r: { taskId: string | null }) => r.taskId!)
      .filter(Boolean) as string[];

    // Fetch accepted tasks not in assignedIds
    const tasks = await prisma.task.findMany({
      where: {
        status: "accepted",
        id: assignedIds.length > 0 ? { notIn: assignedIds } : undefined,
      },
      orderBy: { createdAt: "desc" },
    });

    // Transform to snake_case expected by the client list renderer
    const result = tasks.map((task: any) => ({
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
      notes: task.notes,
    }));

    return NextResponse.json({ data: result });
  } catch (error) {
    console.error("Error fetching available tasks:", error);
    return NextResponse.json(
      { error: "Failed to fetch available tasks" },
      { status: 500 }
    );
  }
}
