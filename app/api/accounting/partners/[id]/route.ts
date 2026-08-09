import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function getAdministratorProfile() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const profile = await prisma.profile.findUnique({
    where: { userId: session.user.id },
    select: { id: true, role: true },
  });
  const role = (profile?.role || "").toLowerCase();
  if (!profile || !["admin", "superadmin"].includes(role)) return null;
  return profile;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const profile = await getAdministratorProfile();
    if (!profile) return NextResponse.json({ error: "Only administrators can manage partners" }, { status: 403 });

    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    if (typeof body.isActive !== "boolean") {
      return NextResponse.json({ error: "isActive must be a boolean" }, { status: 400 });
    }

    const partner = await prisma.partnershipPartner.update({
      where: { id },
      data: { isActive: body.isActive },
    });
    return NextResponse.json({ data: partner });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update partner status";
    return NextResponse.json({ error: message }, { status: message.includes("No record") ? 404 : 400 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const profile = await getAdministratorProfile();
    if (!profile) return NextResponse.json({ error: "Only administrators can remove partners" }, { status: 403 });

    const { id } = await params;
    await prisma.$transaction(async (tx) => {
      const partner = await tx.partnershipPartner.findUnique({
        where: { id },
        select: {
          id: true,
          isActive: true,
          _count: { select: { allocations: true, businessTransactions: true } },
        },
      });
      if (!partner) throw new Error("Partner not found");

      if (partner._count.allocations > 0 || partner._count.businessTransactions > 0) {
        const error = new Error("This partner has accounting history and cannot be permanently deleted. Archive the partner instead.");
        error.name = "PARTNER_HAS_HISTORY";
        throw error;
      }

      await tx.partnershipPartner.delete({ where: { id } });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    return NextResponse.json({ data: { id, deleted: true } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to permanently delete partner";
    if (message === "Partner not found") return NextResponse.json({ error: message }, { status: 404 });
    if (error instanceof Error && error.name === "PARTNER_HAS_HISTORY") {
      return NextResponse.json({ error: message }, { status: 409 });
    }
    if ((error as { code?: string })?.code === "P2034") {
      return NextResponse.json({ error: "The partner changed while it was being removed. Please retry." }, { status: 409 });
    }
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
