import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { deleteConnection } from "@/app/dashboard/integrations/google-sheets/actions";
import { createConnection } from "@/app/dashboard/integrations/google-sheets/actions";

const ALLOWED_ROLES = ["admin", "moderator", "superadmin"];

async function authorizeRead() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  const role = String(session.user.role || "user").toLowerCase();
  if (!ALLOWED_ROLES.includes(role)) throw new Error("Forbidden");
  return session;
}

export async function GET() {
  try {
    await authorizeRead();
    const connections = await prisma.googleSheetConnection.findMany({
      orderBy: [{ year: "desc" }, { month: "desc" }, { createdAt: "desc" }],
      select: {
        id: true,
        month: true,
        year: true,
        sheetName: true,
        sheetTab: true,
        status: true,
        lastSynced: true,
        materialBalanceImports: {
          orderBy: { importedAt: "desc" },
          take: 1,
          select: { importedAt: true, status: true, updatedStockCount: true },
        },
      },
    });

    return NextResponse.json({
      data: connections.map((connection) => ({
        id: connection.id,
        month: connection.month,
        year: connection.year,
        sheetName: connection.sheetName,
        sheetTab: connection.sheetTab,
        status: connection.status,
        lastSynced: connection.lastSynced?.toISOString() || null,
        materialBalanceImport: connection.materialBalanceImports[0]
          ? {
              importedAt: connection.materialBalanceImports[0].importedAt.toISOString(),
              status: connection.materialBalanceImports[0].status,
              updatedStockCount: connection.materialBalanceImports[0].updatedStockCount,
            }
          : null,
      })),
    });
  } catch (error: any) {
    const message = error?.message || "Failed to load Google Sheet connections";
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const connectionId = body?.connectionId as string | undefined;
    if (!connectionId) {
      return NextResponse.json(
        { error: "connectionId is required" },
        { status: 400 }
      );
    }

    const result = await deleteConnection(connectionId);
    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    const message = error?.message || "Delete failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const month = body?.month;
    const year = body?.year;
    const sheet_url = body?.sheet_url;
    const sheet_name = body?.sheet_name ?? null;
    const sheet_tab = body?.sheet_tab ?? null;

    if (!month || !year || !sheet_url) {
      return NextResponse.json(
        { ok: false, error: "month, year and sheet_url are required" },
        { status: 400 }
      );
    }

    const result = await createConnection({
      month: Number(month),
      year: Number(year),
      sheet_url: String(sheet_url),
      sheet_name: sheet_name ? String(sheet_name) : null,
      sheet_tab: sheet_tab ? String(sheet_tab) : null,
    });

    return NextResponse.json({ ok: true, id: result.id }, { status: 200 });
  } catch (error: any) {
    const message = error?.message || String(error);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
