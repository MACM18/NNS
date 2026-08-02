import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { calculateInvoicePricingPreview } from "@/lib/pricing-service";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const profile = await prisma.profile.findUnique({ where: { userId: session.user.id }, select: { role: true } });
    if (!["admin", "moderator", "superadmin"].includes((profile?.role || "").toLowerCase())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const body = await request.json();
    const pricing = await calculateInvoicePricingPreview({ lineDetailsIds: body.lineDetailsIds, invoiceType: body.invoiceType });
    return NextResponse.json({ data: pricing });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to calculate invoice pricing";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
