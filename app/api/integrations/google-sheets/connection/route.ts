import { NextRequest, NextResponse } from "next/server";
import { deleteConnection } from "@/app/dashboard/integrations/google-sheets/actions";
import { createConnection } from "@/app/dashboard/integrations/google-sheets/actions";

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

    const result = await createConnection(
      {
        month: Number(month),
        year: Number(year),
        sheet_url: String(sheet_url),
        sheet_name: sheet_name ? String(sheet_name) : null,
        sheet_tab: sheet_tab ? String(sheet_tab) : null,
      }
    );

    return NextResponse.json({ ok: true, id: result.id }, { status: 200 });
  } catch (error: any) {
    const message = error?.message || String(error);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
