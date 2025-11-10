import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { getDriveClientForUser } from "@/lib/google-oauth";

export async function GET(req: NextRequest) {
  // Must be authenticated
  const {
    data: { session },
  } = await supabaseServer.auth.getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const drive = await getDriveClientForUser(session.user.id);
    // List spreadsheets (mimeType for Google Sheets)
    const search = new URL(req.url).searchParams.get("q") || "";
    const qParts = [
      "mimeType='application/vnd.google-apps.spreadsheet'",
      "trashed=false",
    ];
    if (search) {
      const safe = search.replace(/['"]/g, "");
      qParts.push(`name contains '${safe}'`);
    }
    const q = qParts.join(" and ");
    const res = await drive.files.list({
      q,
      fields: "files(id,name,webViewLink,owners(displayName))",
      pageSize: 50,
      supportsAllDrives: false,
    });
    return NextResponse.json({ ok: true, files: res.data.files || [] });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e.message || "drive_list_failed" },
      { status: 500 }
    );
  }
}
