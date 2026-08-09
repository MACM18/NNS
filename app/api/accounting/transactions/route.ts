import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasAccountingAccess } from "@/lib/accounting-service";
import { createBusinessTransaction } from "@/lib/partnership-accounting-service";

async function getAuthorizedProfile() {
  const session = await auth();
  if (!session?.user?.id) return null;
  const profile = await prisma.profile.findUnique({
    where: { userId: session.user.id },
    select: { id: true, role: true },
  });
  if (!hasAccountingAccess(profile?.role)) return null;
  return { session, profile };
}

export async function GET(req: NextRequest) {
  try {
    const authorized = await getAuthorizedProfile();
    if (!authorized || !authorized.profile) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const yearId = req.nextUrl.searchParams.get("financialYearId") || undefined;
    const transactions = await prisma.businessTransaction.findMany({
      where: yearId ? { financialYearId: yearId } : undefined,
      include: { partner: true, vouchers: true, financialYear: true },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    });
    return NextResponse.json({ data: transactions });
  } catch (error) {
    console.error("Error fetching accounting transactions:", error);
    return NextResponse.json({ error: "Failed to fetch accounting transactions" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const authorized = await getAuthorizedProfile();
    if (!authorized || !authorized.profile) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const body = await req.json();
    const amount = Number(body.amount);
    const type = body.type;
    if (!body.date || !body.description || !body.cashAccountId || !body.offsetAccountId) {
      return NextResponse.json(
        { error: "Date, description, cash account, and offset account are required" },
        { status: 400 },
      );
    }
    if (!["income", "expense", "drawing", "internal_transfer"].includes(type)) {
      return NextResponse.json({ error: "Invalid transaction type" }, { status: 400 });
    }
    const transaction = await createBusinessTransaction({
      date: new Date(body.date),
      amount,
      type,
      category: body.category,
      description: body.description,
      isDeductible: body.isDeductible === true,
      partnerId: body.partnerId,
      paymentMethod: body.paymentMethod,
      cashAccountId: body.cashAccountId,
      offsetAccountId: body.offsetAccountId,
      financialYearId: body.financialYearId,
      createdById: authorized.profile.id,
      autoApprove: ["admin", "superadmin"].includes((authorized.profile.role || "").toLowerCase()),
      voucher: body.voucher,
    });
    return NextResponse.json({ data: transaction }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create accounting transaction";
    console.error("Error creating accounting transaction:", error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
