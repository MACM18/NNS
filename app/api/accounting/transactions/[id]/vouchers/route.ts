import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasAccountingAccess } from "@/lib/accounting-service";
import { encrypt } from "@/lib/encryption";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const profile = await prisma.profile.findUnique({
      where: { userId: session.user.id },
      select: { id: true, role: true },
    });
    if (!hasAccountingAccess(profile?.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const { id } = await params;
    const body = await req.json();
    if (!body.fileUrl) return NextResponse.json({ error: "fileUrl is required" }, { status: 400 });
    const transaction = await prisma.businessTransaction.findUnique({ where: { id } });
    if (!transaction) return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
    const voucher = await prisma.voucher.create({
      data: {
        businessTransactionId: id,
        fileUrl: body.fileUrl,
        receiptNo: body.receiptNo,
        payeeName: body.payeeName,
        payeeNicEncrypted: body.payeeNic ? encrypt(String(body.payeeNic)) : undefined,
        createdById: profile!.id,
      },
    });
    return NextResponse.json({ data: { ...voucher, payeeNicEncrypted: undefined } }, { status: 201 });
  } catch (error) {
    console.error("Error creating accounting voucher:", error);
    return NextResponse.json({ error: "Failed to create accounting voucher" }, { status: 500 });
  }
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const profile = await prisma.profile.findUnique({
      where: { userId: session.user.id },
      select: { role: true },
    });
    if (!hasAccountingAccess(profile?.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const { id } = await params;
    const vouchers = await prisma.voucher.findMany({
      where: { businessTransactionId: id },
      orderBy: { createdAt: "desc" },
      select: { id: true, fileUrl: true, receiptNo: true, payeeName: true, createdAt: true, businessTransactionId: true },
    });
    return NextResponse.json({ data: vouchers });
  } catch (error) {
    console.error("Error fetching accounting vouchers:", error);
    return NextResponse.json({ error: "Failed to fetch accounting vouchers" }, { status: 500 });
  }
}
