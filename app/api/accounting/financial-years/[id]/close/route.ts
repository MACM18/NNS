import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { closeFinancialYear } from "@/lib/partnership-accounting-service";

export async function POST(
  _req: Request,
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
      return NextResponse.json({ error: "Only administrators can close financial years" }, { status: 403 });
    }
    const { id } = await params;
    return NextResponse.json({ data: await closeFinancialYear(id, profile!.id) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to close financial year";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
