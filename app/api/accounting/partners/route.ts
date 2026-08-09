import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getPartners, savePartnerAllocation } from "@/lib/partnership-accounting-service";
import { hasAccountingAccess } from "@/lib/accounting-service";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const profile = await prisma.profile.findUnique({ where: { userId: session.user.id }, select: { role: true } });
  if (!hasAccountingAccess(profile?.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const role = (profile?.role || "").toLowerCase();
  const includeInactive = req.nextUrl.searchParams.get("includeInactive") === "true";
  return NextResponse.json({
    data: await getPartners({
      includeInactive: includeInactive && ["admin", "superadmin"].includes(role),
    }),
  });
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const profile = await prisma.profile.findUnique({ where: { userId: session.user.id }, select: { role: true } });
    if (!["admin", "superadmin"].includes((profile?.role || "").toLowerCase())) {
      return NextResponse.json({ error: "Only administrators can configure partners" }, { status: 403 });
    }
    const body = await req.json();
    if (!body.code || !body.name) return NextResponse.json({ error: "code and name are required" }, { status: 400 });
    const partner = await prisma.partnershipPartner.upsert({
      where: { code: body.code },
      create: {
        code: body.code,
        name: body.name,
        capitalAccountId: body.capitalAccountId,
        drawingsAccountId: body.drawingsAccountId,
      },
      update: {
        name: body.name,
        capitalAccountId: body.capitalAccountId,
        drawingsAccountId: body.drawingsAccountId,
        isActive: body.isActive !== false,
      },
    });
    if (body.financialYearId && body.percentage !== undefined) {
      await savePartnerAllocation({
        financialYearId: body.financialYearId,
        partnerId: partner.id,
        percentage: Number(body.percentage),
      });
    }
    return NextResponse.json({ data: partner }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to configure partner";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
