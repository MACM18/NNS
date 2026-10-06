import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { buildInventorySheetRefreshPreview } from "@/lib/inventory-sheet-refresh";

const MANAGER_ROLES = ["admin", "moderator", "superadmin"];

export async function POST() {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Sign in to refresh inventory." }, { status: 401 });
    const profile = await prisma.profile.findUnique({ where: { userId: session.user.id }, select: { role: true } });
    if (!MANAGER_ROLES.includes((profile?.role || session.user.role || "").toLowerCase())) {
      return NextResponse.json({ error: "You do not have permission to refresh inventory." }, { status: 403 });
    }
    const preview = await buildInventorySheetRefreshPreview();
    return NextResponse.json({ data: preview });
  } catch (error) {
    console.error("Inventory sheet preview failed:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not preview the current sheet." }, { status: 400 });
  }
}
