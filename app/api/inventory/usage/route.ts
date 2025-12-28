import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  getMonthlyInventoryUsageSummary,
  resetMonthlyInventoryUsage,
  recalculateInventoryFromUsage,
} from "@/lib/inventory-usage-service";

/**
 * GET /api/inventory/usage
 *
 * Query params:
 * - month (required): Month number (1-12)
 * - year (required): Year (2000-2100)
 * - all (optional): If "true", return all usage records without month/year filter
 */
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const monthParam = searchParams.get("month");
    const yearParam = searchParams.get("year");
    const all = searchParams.get("all");

    // If "all" is requested, return all usage records grouped by month/year
    if (all === "true") {
      const usages = await prisma.monthlyInventoryUsage.findMany({
        include: {
          item: {
            select: { id: true, name: true, currentStock: true },
          },
        },
        orderBy: [{ year: "desc" }, { month: "desc" }, { totalUsed: "desc" }],
      });

      const grouped = usages.reduce((acc, u) => {
        const key = `${u.year}-${String(u.month).padStart(2, "0")}`;
        if (!acc[key]) {
          acc[key] = {
            month: u.month,
            year: u.year,
            items: [],
          };
        }
        acc[key].items.push({
          itemId: u.item.id,
          itemName: u.item.name,
          totalUsed: Number(u.totalUsed),
          currentStock: Number(u.item.currentStock),
          lastSyncedAt: u.lastSyncedAt,
        });
        return acc;
      }, {} as Record<string, any>);

      return NextResponse.json({
        data: Object.values(grouped),
      });
    }

    // Validate month and year
    if (!monthParam || !yearParam) {
      return NextResponse.json(
        { error: "month and year are required query parameters" },
        { status: 400 }
      );
    }

    const month = parseInt(monthParam);
    const year = parseInt(yearParam);

    if (isNaN(month) || month < 1 || month > 12) {
      return NextResponse.json(
        { error: "month must be a number between 1 and 12" },
        { status: 400 }
      );
    }

    if (isNaN(year) || year < 2000 || year > 2100) {
      return NextResponse.json(
        { error: "year must be a number between 2000 and 2100" },
        { status: 400 }
      );
    }

    const summary = await getMonthlyInventoryUsageSummary(month, year);

    return NextResponse.json({
      data: {
        month,
        year,
        items: summary,
        totalItems: summary.length,
        totalUsed: summary.reduce((sum, item) => sum + item.totalUsed, 0),
      },
    });
  } catch (error) {
    console.error("Error fetching monthly inventory usage:", error);
    return NextResponse.json(
      { error: "Failed to fetch monthly inventory usage" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/inventory/usage
 *
 * Reset monthly usage for a specific month/year (admin only)
 * This will restore inventory amounts that were deducted
 *
 * Body:
 * - month (required): Month number (1-12)
 * - year (required): Year (2000-2100)
 */
export async function DELETE(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin or moderator
    const role = (session.user.role || "user").toLowerCase();
    if (!["admin", "moderator"].includes(role)) {
      return NextResponse.json(
        { error: "Forbidden: Admin access required" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { month, year } = body;

    if (!month || !year) {
      return NextResponse.json(
        { error: "month and year are required in request body" },
        { status: 400 }
      );
    }

    const monthNum = parseInt(month);
    const yearNum = parseInt(year);

    if (isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
      return NextResponse.json(
        { error: "month must be a number between 1 and 12" },
        { status: 400 }
      );
    }

    if (isNaN(yearNum) || yearNum < 2000 || yearNum > 2100) {
      return NextResponse.json(
        { error: "year must be a number between 2000 and 2100" },
        { status: 400 }
      );
    }

    const result = await resetMonthlyInventoryUsage(monthNum, yearNum);

    return NextResponse.json({
      success: true,
      message: `Reset ${result.itemsReset} usage records and restored ${result.inventoryRestored} inventory items`,
      ...result,
    });
  } catch (error) {
    console.error("Error resetting monthly inventory usage:", error);
    return NextResponse.json(
      { error: "Failed to reset monthly inventory usage" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/inventory/usage
 *
 * Recalculate all inventory based on usage records (admin only)
 * Useful for data recovery or consistency checks
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin
    const role = (session.user.role || "user").toLowerCase();
    if (role !== "admin") {
      return NextResponse.json(
        { error: "Forbidden: Admin access required" },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const action = body.action;

    if (action === "recalculate") {
      const result = await recalculateInventoryFromUsage();

      return NextResponse.json({
        success: true,
        message: `Recalculated ${result.itemsProcessed} inventory items based on ${result.totalUsageRecords} usage records`,
        ...result,
      });
    }

    return NextResponse.json(
      { error: "Invalid action. Supported actions: recalculate" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Error processing inventory usage action:", error);
    return NextResponse.json(
      { error: "Failed to process inventory usage action" },
      { status: 500 }
    );
  }
}
