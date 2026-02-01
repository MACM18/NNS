// Single Payroll Period API
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  getPayrollPeriodById,
  updatePayrollPeriod,
  deletePayrollPeriod,
  calculatePayrollForPeriod,
  approvePayrollPeriod,
  markPayrollAsPaid,
  payWorkerPayment,
} from "@/lib/payroll-service";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const period = await getPayrollPeriodById(id);

    if (!period) {
      return NextResponse.json({ error: "Period not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: period });
  } catch (error) {
    console.error("Error fetching payroll period:", error);
    return NextResponse.json(
      { error: "Failed to fetch payroll period" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = session.user.role?.toLowerCase();
    if (userRole !== "admin" && userRole !== "moderator") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();

    const period = await updatePayrollPeriod(id, body);
    return NextResponse.json({ success: true, data: period });
  } catch (error) {
    console.error("Error updating payroll period:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to update payroll period",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = session.user.role?.toLowerCase();
    if (userRole !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    await deletePayrollPeriod(id);

    return NextResponse.json({ success: true, message: "Period deleted" });
  } catch (error) {
    console.error("Error deleting payroll period:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to delete payroll period",
      },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = session.user.role?.toLowerCase();
    if (userRole !== "admin" && userRole !== "moderator") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { action, paidDate } = body;

    let result;
    switch (action) {
      case "calculate":
        result = await calculatePayrollForPeriod(id, session.user.id);
        return NextResponse.json({
          success: true,
          message: "Payroll calculated",
          data: result,
        });

      case "approve":
        result = await approvePayrollPeriod(id);
        return NextResponse.json({
          success: true,
          message: "Payroll approved",
          data: result,
        });

      case "pay":
        result = await markPayrollAsPaid(id, paidDate);
        return NextResponse.json({
          success: true,
          message: "Payroll marked as paid",
          data: result,
        });

      case "pay-worker":
        const { paymentId, paymentMethod, paymentRef } = body;
        if (!paymentId) {
          return NextResponse.json(
            { error: "Payment ID is required" },
            { status: 400 }
          );
        }
        result = await payWorkerPayment(
          paymentId,
          { paymentMethod, paymentRef },
          session.user.id
        );
        return NextResponse.json({
          success: true,
          message: "Worker payment recorded",
          data: result,
        });

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("Error processing payroll action:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to process action",
      },
      { status: 500 }
    );
  }
}
