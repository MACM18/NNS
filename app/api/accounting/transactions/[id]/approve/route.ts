import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { approveBusinessTransaction } from "@/lib/partnership-accounting-service";

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
    if (!profile || !["admin", "superadmin"].includes((profile.role || "").toLowerCase())) {
      return NextResponse.json({ error: "Only administrators can approve transactions" }, { status: 403 });
    }
    const { id } = await params;
    const transaction = await approveBusinessTransaction(id, profile.id);
    return NextResponse.json({ data: transaction });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to approve transaction";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
