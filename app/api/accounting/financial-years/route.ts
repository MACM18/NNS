import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  createFinancialYear,
  getFinancialYearBounds,
  getFinancialYears,
} from "@/lib/partnership-accounting-service";
import { hasAccountingAccess } from "@/lib/accounting-service";

async function profileForRequest() {
  const session = await auth();
  if (!session?.user?.id) return null;
  const profile = await prisma.profile.findUnique({
    where: { userId: session.user.id },
    select: { id: true, role: true },
  });
  return { session, profile };
}

export async function GET() {
  try {
    const request = await profileForRequest();
    if (!request || !hasAccountingAccess(request.profile?.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.json({ data: await getFinancialYears() });
  } catch (error) {
    console.error("Error fetching financial years:", error);
    return NextResponse.json({ error: "Failed to fetch financial years" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const request = await profileForRequest();
    const role = (request?.profile?.role || "").toLowerCase();
    if (!request || !["admin", "superadmin"].includes(role)) {
      return NextResponse.json({ error: "Only administrators can create financial years" }, { status: 403 });
    }
    const body = await req.json();
    const defaults = getFinancialYearBounds(new Date());
    const year = await createFinancialYear({
      name: body.name,
      yearOfAssessment: body.yearOfAssessment,
      startDate: body.startDate ? new Date(body.startDate) : defaults.startDate,
      endDate: body.endDate ? new Date(body.endDate) : defaults.endDate,
      createdById: request.profile!.id,
    });
    return NextResponse.json({ data: year }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create financial year";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
