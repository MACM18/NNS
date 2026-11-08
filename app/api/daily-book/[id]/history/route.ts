import { NextResponse } from "next/server";
import { getApiPrincipal } from "@/lib/mobile-auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const principal = await getApiPrincipal(req);
  if (!principal) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  try {
    const line = await prisma.lineDetails.findUnique({ where: { id }, select: { id: true } });
    if (!line) return NextResponse.json({ error: "Daily Book entry not found" }, { status: 404 });
    const revisions = await prisma.lineDetailsRevision.findMany({
      where: { lineId: id }, orderBy: { createdAt: "desc" },
      include: { actor: { select: { fullName: true } } },
    });
    return NextResponse.json({ data: revisions.map((revision) => ({
      id: revision.id,
      createdAt: revision.createdAt,
      actor: revision.actor.fullName || "Team member",
      changedFields: revision.changedFields,
      beforeValues: revision.beforeValues,
      afterValues: revision.afterValues,
    })) });
  } catch (error) {
    console.error("Daily Book history load failed", error);
    return NextResponse.json({ error: "Could not load edit history" }, { status: 500 });
  }
}
