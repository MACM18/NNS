import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { applyInventorySheetRefresh } from "@/lib/inventory-sheet-refresh";

const MANAGER_ROLES = ["admin", "moderator", "superadmin"];

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Sign in to refresh inventory." }, { status: 401 });
    const profile = await prisma.profile.findUnique({ where: { userId: session.user.id }, select: { role: true } });
    if (!MANAGER_ROLES.includes((profile?.role || session.user.role || "").toLowerCase())) {
      return NextResponse.json({ error: "You do not have permission to refresh inventory." }, { status: 403 });
    }
    const body = await request.json().catch(() => null);
    if (!body || body.confirmed !== true || typeof body.previewId !== "string" || !/^[a-f0-9]{64}$/.test(body.previewId)) {
      return NextResponse.json({ error: "Confirm the preview before updating inventory." }, { status: 400 });
    }
    const result = await applyInventorySheetRefresh({ previewId: body.previewId, userId: session.user.id });
    return NextResponse.json({ data: result });
  } catch (error) {
    console.error("Inventory sheet refresh failed:", error);
    const status = Number((error as { status?: number })?.status) || 400;
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not update inventory." }, { status });
  }
}
