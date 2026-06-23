import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email-service";

export async function GET(req: NextRequest) {
  try {
    // Check cron authorization header if available
    const authHeader = req.headers.get("authorization");
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();
    let targetMonth = now.getMonth(); // past month (1-12 range)
    let targetYear = now.getFullYear();
    if (targetMonth === 0) {
      targetMonth = 12;
      targetYear -= 1;
    }

    const monthStart = new Date(Date.UTC(targetYear, targetMonth - 1, 1));
    const monthEnd = new Date(Date.UTC(targetYear, targetMonth, 0, 23, 59, 59, 999));

    const completedLinesCount = await prisma.lineDetails.count({
      where: {
        date: { gte: monthStart, lte: monthEnd },
        status: "completed",
      },
    });

    const totalLinesCount = await prisma.lineDetails.count({
      where: {
        date: { gte: monthStart, lte: monthEnd },
      },
    });

    const payrollPeriod = await prisma.payrollPeriod.findFirst({
      where: { month: targetMonth, year: targetYear },
    });

    const totalPayroll = payrollPeriod ? Number(payrollPeriod.totalAmount) : 0;

    const items = await prisma.inventoryItem.findMany();
    const lowStockItems = items.filter(
      (item) =>
        Number(item.reorderLevel) > 0 &&
        Number(item.currentStock) <= Number(item.reorderLevel)
    );

    const monthName = new Date(targetYear, targetMonth - 1).toLocaleString("default", {
      month: "long",
    });

    const html = `
      <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; border: 1px solid #e5e7eb; border-radius: 8px;">
        <h2 style="color: #1e3a8a; margin-top: 0; border-bottom: 2px solid #3b82f6; padding-bottom: 10px;">
          Monthly Operations Digest — ${monthName} ${targetYear}
        </h2>
        <p style="font-size: 15px; color: #4b5563;">
          Here is the monthly operations summary for NNS Enterprise:
        </p>
        
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <tr style="background: #f8fafc;">
            <th style="text-align: left; padding: 10px; border-bottom: 1px solid #e2e8f0; color: #475569;">Metric</th>
            <th style="text-align: right; padding: 10px; border-bottom: 1px solid #e2e8f0; color: #475569;">Value</th>
          </tr>
          <tr>
            <td style="padding: 10px; border-bottom: 1px solid #f1f5f9; color: #334155;">Total Installations Synced</td>
            <td style="text-align: right; padding: 10px; border-bottom: 1px solid #f1f5f9; font-weight: bold; color: #334155;">${totalLinesCount}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border-bottom: 1px solid #f1f5f9; color: #334155;">Completed Installations</td>
            <td style="text-align: right; padding: 10px; border-bottom: 1px solid #f1f5f9; font-weight: bold; color: #16a34a;">${completedLinesCount}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border-bottom: 1px solid #f1f5f9; color: #334155;">Payroll Period Status</td>
            <td style="text-align: right; padding: 10px; border-bottom: 1px solid #f1f5f9; color: #334155;">
              ${payrollPeriod ? payrollPeriod.status.toUpperCase() : "NOT CREATED"}
            </td>
          </tr>
          <tr>
            <td style="padding: 10px; border-bottom: 1px solid #f1f5f9; color: #334155;">Total Approved Payroll</td>
            <td style="text-align: right; padding: 10px; border-bottom: 1px solid #f1f5f9; font-weight: bold; color: #334155;">
              LKR ${totalPayroll.toLocaleString()}
            </td>
          </tr>
          <tr>
            <td style="padding: 10px; border-bottom: 1px solid #f1f5f9; color: #334155;">Active Low Stock Items</td>
            <td style="text-align: right; padding: 10px; border-bottom: 1px solid #f1f5f9; font-weight: bold; color: ${
              lowStockItems.length > 0 ? "#dc2626" : "#16a34a"
            };">
              ${lowStockItems.length}
            </td>
          </tr>
        </table>

        ${
          lowStockItems.length > 0
            ? `
          <div style="background: #fef2f2; padding: 15px; border-radius: 6px; border-left: 4px solid #dc2626; margin-bottom: 20px;">
            <h4 style="margin: 0 0 10px 0; color: #991b1b;">Low Stock Warning List:</h4>
            <ul style="margin: 0; padding-left: 20px; color: #7f1d1d; font-size: 14px;">
              ${lowStockItems
                .map(
                  (item) =>
                    `<li>${item.name}: ${item.currentStock} ${item.unit} remaining</li>`
                )
                .join("")}
            </ul>
          </div>
        `
            : ""
        }

        <div style="margin-top: 25px; text-align: center;">
          <a href="${process.env.NEXTAUTH_URL || "https://nns.lk"}/dashboard" 
             style="background: #1e3a8a; color: white; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-weight: 500; font-size: 14px;">
            Go to Dashboard
          </a>
        </div>

        <hr style="margin: 25px 0; border: 0; border-top: 1px solid #e5e7eb;" />
        <p style="font-size: 12px; color: #9ca3af; margin-bottom: 0; text-align: center;">
          NNS Enterprise Automated Operations Service
        </p>
      </div>
    `;

    // Query all admin emails
    const admins = await prisma.profile.findMany({
      where: { role: { in: ["admin", "moderator"] } },
      select: { email: true },
    });

    const adminEmails = admins.map((a) => a.email).filter((e): e is string => Boolean(e));

    if (adminEmails.length > 0) {
      await sendEmail({
        to: adminEmails,
        subject: `NNS Operations Digest — ${monthName} ${targetYear}`,
        html,
      });
    }

    return NextResponse.json({
      success: true,
      month: targetMonth,
      year: targetYear,
      recipients: adminEmails.length,
    });
  } catch (error) {
    console.error("Monthly digest cron failed:", error);
    return NextResponse.json(
      { error: "Failed to generate monthly digest" },
      { status: 500 }
    );
  }
}
