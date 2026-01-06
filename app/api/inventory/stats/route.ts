import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get total inventory items count
    const totalItems = await prisma.inventoryItem.count();

    // Get low stock items count (where current_stock <= reorder_level)
    const lowStockItems = await prisma.inventoryItem.findMany({
      select: { id: true, currentStock: true, reorderLevel: true },
    });

    // Manual comparison since Prisma doesn't support field-to-field comparison easily
    const lowStockAlerts = lowStockItems.filter((item) => {
      const current = Number(item.currentStock ?? 0);
      const reorder = Number(item.reorderLevel ?? 0);
      return current <= reorder;
    }).length;

    // Get active drums count
    const activeDrums = await prisma.drumTracking.count({
      where: { status: "active" },
    });

    // Get waste data for current month
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const wasteData = await prisma.wasteTracking.aggregate({
      where: {
        wasteDate: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
      },
      _sum: { quantity: true },
    });

    const totalStockData = await prisma.inventoryItem.aggregate({
      _sum: { currentStock: true },
    });

    const totalWaste = Number(wasteData._sum.quantity ?? 0);
    const totalStock = Number(totalStockData._sum.currentStock ?? 1);
    const monthlyWastePercentage =
      totalStock > 0 ? Number(((totalWaste / totalStock) * 100).toFixed(1)) : 0;

    return NextResponse.json({
      data: {
        totalItems,
        lowStockAlerts,
        activeDrums,
        monthlyWastePercentage,
      },
    });
  } catch (error) {
    console.error("Error fetching inventory stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch inventory stats" },
      { status: 500 }
    );
  }
}
