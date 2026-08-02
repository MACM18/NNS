import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasAccountingAccess } from "@/lib/accounting-service";

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_TYPES = new Map([
  ["application/pdf", ".pdf"],
  ["image/jpeg", ".jpg"],
  ["image/png", ".png"],
]);

async function authorized() {
  const session = await auth();
  if (!session?.user?.id) return false;
  const profile = await prisma.profile.findUnique({
    where: { userId: session.user.id },
    select: { role: true },
  });
  return hasAccountingAccess(profile?.role);
}

export async function POST(request: NextRequest) {
  try {
    if (!(await authorized())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) return NextResponse.json({ error: "A voucher file is required" }, { status: 400 });
    if (file.size <= 0 || file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "Voucher files must be between 1 byte and 10 MB" }, { status: 400 });
    }
    const extension = ALLOWED_TYPES.get(file.type);
    if (!extension) return NextResponse.json({ error: "Only PDF, JPG, and PNG vouchers are supported" }, { status: 400 });

    const storageId = randomUUID();
    const directory = process.env.ACCOUNTING_VOUCHER_STORAGE_DIR || path.join(process.cwd(), "storage", "accounting-vouchers");
    await mkdir(directory, { recursive: true });
    const bytes = new Uint8Array(await file.arrayBuffer());
    await writeFile(path.join(directory, `${storageId}${extension}`), bytes as unknown as Uint8Array<ArrayBuffer>, { flag: "wx" });

    return NextResponse.json({
      data: {
        fileUrl: `/api/accounting/vouchers/${storageId}`,
        name: file.name,
        size: file.size,
        contentType: file.type,
      },
    }, { status: 201 });
  } catch (error) {
    console.error("Error uploading accounting voucher:", error);
    return NextResponse.json({ error: "Failed to upload voucher" }, { status: 500 });
  }
}
