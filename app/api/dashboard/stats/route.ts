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
      searchParams.get("month") || String(new Date().getMonth() + 1),
    );
    const year = parseInt(
      searchParams.get("year") || String(new Date().getFullYear()),
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
      999,
    );

    // Fetch lines in the current and previous month (we'll compute counts by status)
    const [currentLinesRaw, previousLinesRaw] = await Promise.all([
      prisma.lineDetails.findMany({
        where: {
          date: {
            gte: currentMonthStartDate,
            lte: currentMonthEndDate,
          },
        },
        select: {
          id: true,
          cableStart: true,
          cableMiddle: true,
          cableEnd: true,
          status: true,
          completedDate: true,
        },
      }),
      prisma.lineDetails.findMany({
        where: {
          date: {
            gte: previousMonthStartDate,
            lte: previousMonthEndDate,
          },
        },
        select: {
          id: true,
          cableStart: true,
          cableMiddle: true,
          cableEnd: true,
          status: true,
          completedDate: true,
        },
      }),
    ]);

    // Helper to compute totals and counts for a set of lines
    const { computeCableMeasurements } = await import("@/lib/db");

    // Load company settings for pricing tiers
    const companySettings = await prisma.companySettings.findFirst();

    const normalizePricingTiers = (tiers: any) => {
      if (!tiers) return [];
      if (typeof tiers === "string") {
        try {
          tiers = JSON.parse(tiers);
        } catch {
          return [];
        }
      }
      if (typeof tiers === "object" && !Array.isArray(tiers)) {
        return Object.entries(tiers).map(([range, rate]) => {
          if (range === "500+")
            return {
              min_length: 501,
              max_length: 999999,
              rate: Number(rate) || 0,
            };
          const [min, max] = range.split("-").map(Number);
          return {
            min_length: Number(min) || 0,
            max_length: Number(max) || 999999,
            rate: Number(rate) || 0,
          };
        });
      }
      if (Array.isArray(tiers)) {
        return tiers.map((t: any) => ({
          min_length: Number(t.min_length) || 0,
          max_length:
            t.max_length === 999999 || String(t.max_length) === ""
              ? 999999
              : Number(t.max_length) || 999999,
          rate: Number(t.rate) || 0,
        }));
      }
      return [];
    };

    const pricingTiers = normalizePricingTiers(companySettings?.pricingTiers);

    const calculateRate = (cableLength: number) => {
      if (
        !pricingTiers ||
        !Array.isArray(pricingTiers) ||
        pricingTiers.length === 0
      ) {
        // Default pricing (match frontend defaults)
        if (cableLength <= 100) return 6000;
        if (cableLength <= 200) return 6500;
        if (cableLength <= 300) return 7200;
        if (cableLength <= 400) return 7800;
        if (cableLength <= 500) return 8200;
        return 8400;
      }

      const tier = pricingTiers.find(
        (t: any) => cableLength >= t.min_length && cableLength <= t.max_length,
      );
      return tier ? tier.rate : 8400;
    };

    const summarizeLines = (lines: any[]) => {
      let total = 0;
      let completed = 0;
      let inProgress = 0;
      let pending = 0;

      for (const line of lines) {
        const { totalCable } = computeCableMeasurements(
          Number(line.cableStart || 0),
          Number(line.cableMiddle || 0),
          Number(line.cableEnd || 0),
        );
        const isCompleted = Boolean(
          line.completedDate || line.status === "completed",
        );
        if (isCompleted) {
          completed += 1;
          total += calculateRate(totalCable);
        } else if (line.status === "in_progress") {
          inProgress += 1;
        } else {
          pending += 1;
        }
      }

      return {
        count: lines.length,
        completed,
        inProgress,
        pending,
        totalAmount: total,
      };
    };

    const currentSummary = summarizeLines(currentLinesRaw);
    const previousSummary = summarizeLines(previousLinesRaw);

    // Monthly revenue is 90% of total rates (invoice A logic)
    const monthlyRevenue = Math.round(currentSummary.totalAmount * 0.9);
    const prevRevenue = Math.round(previousSummary.totalAmount * 0.9);

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

    // Calculate stats from the summaries
    const totalLines = currentSummary.count;
    const completed = currentSummary.completed;
    const inProgress = currentSummary.inProgress;
    const pending = currentSummary.pending;

    const prevTotalLines = previousSummary.count;
    const prevCompleted = previousSummary.completed;
    const prevInProgress = previousSummary.inProgress;
    const prevPending = previousSummary.pending;

    const monthlyRevenueValue = monthlyRevenue; // already calculated (90% of rates)
    const previousMonthlyRevenue = prevRevenue;

    const percentChange = (current: number, previous: number) =>
      previous > 0 ? ((current - previous) / previous) * 100 : 0;

    const lineChange = percentChange(totalLines, prevTotalLines);
    const completedChange = percentChange(completed, prevCompleted);
    const inProgressChange = percentChange(inProgress, prevInProgress);
    const pendingChange = percentChange(pending, prevPending);
    const revenueChange = percentChange(
      monthlyRevenueValue,
      previousMonthlyRevenue,
    );

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
          completed,
          inProgress,
          pending,
          monthlyRevenue: monthlyRevenueValue,
          lineChange,
          completedChange,
          inProgressChange,
          pendingChange,
          revenueChange,
        },
        activities,
      },
    });
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch dashboard stats" },
      { status: 500 },
    );
  }
}
