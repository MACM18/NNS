import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const connection = await prisma.googleSheetConnection.findUnique({
      where: { id },
      select: { id: true, month: true, year: true, sheetUrl: true }
    });

    if (!connection) {
      return NextResponse.json({ error: "Connection not found" }, { status: 404 });
    }

    const logs = await prisma.googleSheetSyncLog.findMany({
      where: { connectionId: id },
      orderBy: { syncDate: "desc" }
    });

    return NextResponse.json({
      connection,
      logs
    });
  } catch (error: any) {
    console.error("[logs API] Error fetching logs:", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
