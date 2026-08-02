import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasAccountingAccess } from "@/lib/accounting-service";
import { convertOpeningBalances } from "@/lib/partnership-accounting-service";

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
    if (!["admin", "superadmin"].includes((profile?.role || "").toLowerCase())) {
      return NextResponse.json({ error: "Only administrators can complete opening conversion" }, { status: 403 });
    }
    const { id } = await params;
    const body = await req.json();
    if (!Array.isArray(body.lines) || body.lines.length < 2) {
      return NextResponse.json({ error: "At least two opening balance lines are required" }, { status: 400 });
    }
    const entry = await convertOpeningBalances({
      financialYearId: id,
      lines: body.lines.map((line: any) => ({
        accountId: line.accountId,
        description: line.description,
        debitAmount: Number(line.debitAmount || 0),
        creditAmount: Number(line.creditAmount || 0),
      })),
      receivables: Array.isArray(body.receivables) ? body.receivables : undefined,
      createdById: profile!.id,
    });
    return NextResponse.json({ data: entry }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to complete opening conversion";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
