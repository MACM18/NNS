import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

const ALLOWED_ROLES = ["admin", "moderator", "superadmin"];

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!ALLOWED_ROLES.includes(String(session.user.role || "user").toLowerCase())) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const importId = searchParams.get("importId");
    const connectionId = searchParams.get("connectionId");
    const imported = await prisma.materialBalanceImport.findFirst({
      where: {
        ...(importId ? { id: importId } : {}),
        ...(connectionId ? { connectionId } : {}),
      },
      orderBy: { importedAt: "desc" },
      select: {
        id: true,
        connectionId: true,
        importedAt: true,
        monthlySourceTab: true,
        monthlyChecksum: true,
        reconciliationCount: true,
        stockChanges: true,
        warnings: true,
      },
    });

    if (!imported) return NextResponse.json({ data: null });
    return NextResponse.json({
      data: {
        ...imported,
        importedAt: imported.importedAt.toISOString(),
        stockChanges: Array.isArray(imported.stockChanges) ? imported.stockChanges : [],
        warnings: Array.isArray(imported.warnings) ? imported.warnings : [],
      },
    });
  } catch (error) {
    console.error("[material-balance-reconciliation] GET failed", error);
    return NextResponse.json({ error: "Failed to load Material Balance reconciliation" }, { status: 500 });
  }
}
