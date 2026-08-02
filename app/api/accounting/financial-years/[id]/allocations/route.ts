import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { savePartnerAllocation } from "@/lib/partnership-accounting-service";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const profile = await prisma.profile.findUnique({ where: { userId: session.user.id }, select: { role: true } });
    if (!["admin", "superadmin"].includes((profile?.role || "").toLowerCase())) {
      return NextResponse.json({ error: "Only administrators can configure allocations" }, { status: 403 });
    }
    const { id } = await params;
    const body = await req.json();
    if (!Array.isArray(body.allocations) || body.allocations.length === 0) {
      return NextResponse.json({ error: "allocations are required" }, { status: 400 });
    }
    const total = body.allocations.reduce((sum: number, item: any) => sum + Number(item.percentage), 0);
    if (Math.abs(total - 100) > 0.01) return NextResponse.json({ error: "Partner allocations must total 100%" }, { status: 400 });
    const result = [];
    for (const allocation of body.allocations) {
      result.push(await savePartnerAllocation({
        financialYearId: id,
        partnerId: allocation.partnerId,
        percentage: Number(allocation.percentage),
      }));
    }
    return NextResponse.json({ data: result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to save allocations";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
