// Payroll Periods API
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  getPayrollPeriods,
  createPayrollPeriod,
  getPayrollSummary,
} from "@/lib/payroll-service";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const action = searchParams.get("action");

    if (action === "summary") {
      const summary = await getPayrollSummary();
      return NextResponse.json({ success: true, data: summary });
    }

    const status = searchParams.get("status") || undefined;
    const year = searchParams.get("year")
      ? parseInt(searchParams.get("year")!)
      : undefined;
    const page = searchParams.get("page")
      ? parseInt(searchParams.get("page")!)
      : 1;
    const pageSize = searchParams.get("pageSize")
      ? parseInt(searchParams.get("pageSize")!)
      : 10;

    const result = await getPayrollPeriods({ status, year, page, pageSize });

    return NextResponse.json({
      success: true,
      data: result.periods,
      pagination: {
        total: result.total,
        page,
        pageSize,
        totalPages: Math.ceil(result.total / pageSize),
      },
    });
  } catch (error) {
    console.error("Error fetching payroll periods:", error);
    return NextResponse.json(
      { error: "Failed to fetch payroll periods" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check role - only admin and moderator can create payroll
    const userRole = session.user.role?.toLowerCase();
    if (userRole !== "admin" && userRole !== "moderator") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { name, month, year, startDate, endDate } = body;

    if (!name || !month || !year || !startDate || !endDate) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const period = await createPayrollPeriod(
      { name, month, year, startDate, endDate },
      session.user.id
    );

    return NextResponse.json({ success: true, data: period }, { status: 201 });
  } catch (error) {
    console.error("Error creating payroll period:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create payroll period" },
      { status: 500 }
    );
  }
}
