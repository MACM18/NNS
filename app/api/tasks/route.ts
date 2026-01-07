import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const status = searchParams.get("status");
    const assignedTo = searchParams.get("assigned_to");
    const search = searchParams.get("search");
    const start = searchParams.get("start");
    const end = searchParams.get("end");
    const dateFilter = searchParams.get("dateFilter"); // 'today', 'week', 'month'

    // Build where clause
    const where: Record<string, unknown> = {
      taskDate: { not: null },
    };

    if (status && status !== "all") {
      where.status = status;
    }

    if (assignedTo) {
      where.assignedToId = assignedTo;
    }

    // Date filter based on 'today', 'week', 'month'
    if (dateFilter) {
      const now = new Date();
      let startDate: Date;

      switch (dateFilter) {
        case "today":
          startDate = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate()
          );
          break;
        case "week":
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case "month":
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        default:
          startDate = new Date(0);
      }

      where.taskDate = {
        gte: startDate,
      };
    } else if (start || end) {
      // Date range filter
      const createdAtFilter: Record<string, Date> = {};
      if (start) {
        createdAtFilter.gte = new Date(start);
      }
      if (end) {
        createdAtFilter.lt = new Date(end);
      }
      where.createdAt = createdAtFilter;
    }

    if (search) {
      where.OR = [
        { customerName: { contains: search, mode: "insensitive" } },
        { telephoneNo: { contains: search, mode: "insensitive" } },
        { address: { contains: search, mode: "insensitive" } },
        { dp: { contains: search, mode: "insensitive" } },
        { notes: { contains: search, mode: "insensitive" } },
      ];
    }

    const [tasks, total] = await Promise.all([
      prisma.task.findMany({
        where,
        include: {
          createdBy: {
            select: {
              fullName: true,
              role: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.task.count({ where }),
    ]);

    // Transform to match the expected snake_case format
    const transformedTasks = tasks.map((task) => ({
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
    }));

    return NextResponse.json({
      data: transformedTasks,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching tasks:", error);
    return NextResponse.json(
      { error: "Failed to fetch tasks" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();

    // Transform snake_case input to camelCase for Prisma
    const task = await prisma.task.create({
      data: {
        taskDate: body.task_date ? new Date(body.task_date) : new Date(),
        telephoneNo: body.telephone_no,
        dp: body.dp,
        contactNo: body.contact_no || null,
        customerName: body.customer_name,
        address: body.address,
        status: body.status || "pending",
        connectionTypeNew: body.connection_type_new || "New",
        connectionServices: body.connection_services || [],
        createdById: body.created_by || session.user.id,
        notes: body.notes || null,
      },
    });

    // Transform response back to snake_case
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
    console.error("Error creating task:", error);
    return NextResponse.json(
      { error: "Failed to create task" },
      { status: 500 }
    );
  }
}
