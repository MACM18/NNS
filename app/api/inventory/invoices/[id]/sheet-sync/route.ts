import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { processPendingIssuedWrites, queueInventoryInvoice } from "@/lib/google-sheet-issued-sync";

export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id || !["admin", "moderator", "superadmin"].includes((session.user.role || "").toLowerCase())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  const invoice = await prisma.inventoryInvoice.findUnique({ where: { id }, select: { id: true, isSystemGenerated: true, date: true } });
  if (!invoice || invoice.isSystemGenerated) return NextResponse.json({ error: "Manual inventory invoice not found" }, { status: 404 });
  const connection = await prisma.googleSheetConnection.findFirst({ where: { year: invoice.date.getUTCFullYear(), month: invoice.date.getUTCMonth() + 1, status: "active" }, orderBy: { createdAt: "desc" } });
  if (!connection) return NextResponse.json({ error: "No connected sheet exists for this invoice month" }, { status: 409 });
  await prisma.$transaction(async (tx) => { await queueInventoryInvoice(id, tx, true); });
  await processPendingIssuedWrites(connection.id);
  return NextResponse.json({ ok: true });
}
