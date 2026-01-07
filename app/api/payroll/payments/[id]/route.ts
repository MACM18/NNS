// Single Worker Payment API
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  getWorkerPaymentById,
  updateWorkerPaymentStatus,
  generateSalarySlipData,
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
    const searchParams = request.nextUrl.searchParams;
    const action = searchParams.get("action");

    if (action === "salary-slip") {
      const slipData = await generateSalarySlipData(id);
      return NextResponse.json({ success: true, data: slipData });
    }

    const payment = await getWorkerPaymentById(id);

    if (!payment) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: payment });
  } catch (error) {
    console.error("Error fetching worker payment:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch worker payment" },
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
    const { status, paymentMethod, paymentRef } = body;

    const payment = await updateWorkerPaymentStatus(id, status, {
      paymentMethod,
      paymentRef,
    });

    return NextResponse.json({ success: true, data: payment });
  } catch (error) {
    console.error("Error updating worker payment:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update worker payment" },
      { status: 500 }
    );
  }
}
