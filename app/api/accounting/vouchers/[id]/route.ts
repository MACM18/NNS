import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasAccountingAccess } from "@/lib/accounting-service";

async function hasAccess() {
  const session = await auth();
  if (!session?.user?.id) return false;
  const profile = await prisma.profile.findUnique({ where: { userId: session.user.id }, select: { role: true } });
  return hasAccountingAccess(profile?.role);
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!(await hasAccess())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const { id } = await params;
    if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "Invalid voucher" }, { status: 400 });
    const voucher = await prisma.voucher.findFirst({ where: { fileUrl: `/api/accounting/vouchers/${id}` }, select: { id: true } });
    if (!voucher) return NextResponse.json({ error: "Voucher not found" }, { status: 404 });
    const directory = process.env.ACCOUNTING_VOUCHER_STORAGE_DIR || path.join(process.cwd(), "storage", "accounting-vouchers");
    const files = [".pdf", ".jpg", ".png"];
    for (const extension of files) {
      try {
        const buffer = await readFile(path.join(directory, `${id}${extension}`));
        const contentType = extension === ".pdf" ? "application/pdf" : extension === ".jpg" ? "image/jpeg" : "image/png";
        return new NextResponse(buffer as unknown as BodyInit, { headers: { "Content-Type": contentType, "Content-Disposition": "inline" } });
      } catch {
        // Try the next supported extension.
      }
    }
    return NextResponse.json({ error: "Voucher file not found" }, { status: 404 });
  } catch (error) {
    console.error("Error retrieving accounting voucher:", error);
    return NextResponse.json({ error: "Failed to retrieve voucher" }, { status: 500 });
  }
}
