// Payroll Adjustments API
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { addAdjustment, deleteAdjustment } from "@/lib/payroll-service";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = session.user.role?.toLowerCase();
    if (userRole !== "admin" && userRole !== "moderator") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { workerPaymentId, type, category, description, amount } = body;

    if (
      !workerPaymentId ||
      !type ||
      !category ||
      !description ||
      amount === undefined
    ) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const adjustment = await addAdjustment(
      { workerPaymentId, type, category, description, amount },
      session.user.id
    );

    return NextResponse.json(
      { success: true, data: adjustment },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error adding adjustment:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to add adjustment",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = session.user.role?.toLowerCase();
    if (userRole !== "admin" && userRole !== "moderator") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Adjustment ID is required" },
        { status: 400 }
      );
    }

    await deleteAdjustment(id);

    return NextResponse.json({ success: true, message: "Adjustment deleted" });
  } catch (error) {
    console.error("Error deleting adjustment:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to delete adjustment",
      },
      { status: 500 }
    );
  }
}
