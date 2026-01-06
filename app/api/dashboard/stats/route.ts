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
    const month = parseInt(
      searchParams.get("month") || String(new Date().getMonth() + 1)
    );
    const year = parseInt(
      searchParams.get("year") || String(new Date().getFullYear())
    );

    // Calculate date ranges
    const currentMonthStartDate = new Date(year, month - 1, 1);
    const currentMonthEndDate = new Date(year, month, 0, 23, 59, 59, 999);

    const previousMonth = month === 1 ? 12 : month - 1;
    const previousYear = month === 1 ? year - 1 : year;
    const previousMonthStartDate = new Date(previousYear, previousMonth - 1, 1);
    const previousMonthEndDate = new Date(
      previousYear,
      previousMonth,
      0,
      23,
      59,
      59,
      999
    );

    // Current month stats
    const [currentLines, previousLines] = await Promise.all([
      prisma.lineDetails.count({
        where: {
          date: {
            gte: currentMonthStartDate,
            lte: currentMonthEndDate,
          },
        },
      }),
      prisma.lineDetails.count({
        where: {
          date: {
            gte: previousMonthStartDate,
            lte: previousMonthEndDate,
          },
        },
      }),
    ]);

    // Active tasks (in_progress)
    const [currentTasks, previousTasks] = await Promise.all([
      prisma.task.count({
        where: {
          status: "in_progress",
          createdAt: {
            gte: currentMonthStartDate,
            lte: currentMonthEndDate,
          },
        },
      }),
      prisma.task.count({
        where: {
          status: "in_progress",
          createdAt: {
            gte: previousMonthStartDate,
            lte: previousMonthEndDate,
          },
        },
      }),
    ]);

    // Pending reviews
    const [currentReviews, previousReviews] = await Promise.all([
      prisma.task.count({
        where: {
          status: "pending",
          createdAt: {
            gte: currentMonthStartDate,
            lte: currentMonthEndDate,
          },
        },
      }),
      prisma.task.count({
        where: {
          status: "pending",
          createdAt: {
            gte: previousMonthStartDate,
            lte: previousMonthEndDate,
          },
        },
      }),
    ]);

    // Invoices revenue (A & B types only)
    const [currentInvoices, previousInvoices] = await Promise.all([
      prisma.generatedInvoice.aggregate({
        where: {
          invoiceType: { in: ["A", "B"] },
          invoiceDate: {
            gte: currentMonthStartDate,
            lte: currentMonthEndDate,
          },
        },
        _sum: {
          totalAmount: true,
        },
      }),
      prisma.generatedInvoice.aggregate({
        where: {
          invoiceType: { in: ["A", "B"] },
          invoiceDate: {
            gte: previousMonthStartDate,
            lte: previousMonthEndDate,
          },
        },
        _sum: {
          totalAmount: true,
        },
      }),
    ]);

    // Recent activities (latest 5 tasks)
    const recentTasks = await prisma.task.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        telephoneNo: true,
        address: true,
        status: true,
        createdAt: true,
      },
    });

    // Calculate stats
    const totalLines = currentLines;
    const activeTasks = currentTasks;
    const pendingReviews = currentReviews;
    const monthlyRevenue = Number(currentInvoices._sum.totalAmount ?? 0);

    const prevLines = previousLines;
    const prevTasks = previousTasks;
    const prevReviews = previousReviews;
    const prevRevenue = Number(previousInvoices._sum.totalAmount ?? 0);

    const lineChange =
      prevLines > 0 ? ((totalLines - prevLines) / prevLines) * 100 : 0;
    const taskChange =
      prevTasks > 0 ? ((activeTasks - prevTasks) / prevTasks) * 100 : 0;
    const reviewChange =
      prevReviews > 0
        ? ((pendingReviews - prevReviews) / prevReviews) * 100
        : 0;
    const revenueChange =
      prevRevenue > 0
        ? ((monthlyRevenue - prevRevenue) / prevRevenue) * 100
        : 0;

    // Format activities
    const activities = recentTasks.map((task: any) => ({
      id: task.id,
      action: `Task: ${task.telephoneNo}`,
      location: task.address || "Unknown Location",
      status: task.status,
      created_at: task.createdAt,
    }));

    return NextResponse.json({
      data: {
        stats: {
          totalLines,
          activeTasks,
          pendingReviews,
          monthlyRevenue,
          lineChange,
          taskChange,
          reviewChange,
          revenueChange,
        },
        activities,
      },
    });
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch dashboard stats" },
      { status: 500 }
    );
  }
}
