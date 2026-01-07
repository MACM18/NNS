// Worker Payments API
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getWorkerPayments } from "@/lib/payroll-service";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const periodId = searchParams.get("periodId");

    if (!periodId) {
      return NextResponse.json(
        { error: "Period ID is required" },
        { status: 400 }
      );
    }

    const payments = await getWorkerPayments(periodId);

    return NextResponse.json({ success: true, data: payments });
  } catch (error) {
    console.error("Error fetching worker payments:", error);
    return NextResponse.json(
      { error: "Failed to fetch worker payments" },
      { status: 500 }
    );
  }
}
