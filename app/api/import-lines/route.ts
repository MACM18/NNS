import { NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import {
  fetchSheetRange,
  validateHeaderRow,
  validateSheetName,
  REQUIRED_HEADER_ROW,
} from "@/lib/google-sheets";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

type ImportBody = {
  sheetUrl: string;
  sheetName: string;
  month: number; // 1-12
  year: number; // yyyy
};

function monthStartEnd(month: number, year: number) {
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 0));
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
}

function parseDateValue(v: any): Date | null {
  if (!v && v !== 0) return null;
  if (v instanceof Date) return v;
  const s = String(v);
  // Try ISO/string parse first
  const d1 = new Date(s);
  if (!isNaN(d1.getTime())) return d1;
  // Google Sheets serial date (days since 1899-12-30)
  const n = Number(v);
  if (!isNaN(n)) {
    const base = new Date(Date.UTC(1899, 11, 30));
    const ms = n * 24 * 60 * 60 * 1000;
    return new Date(base.getTime() + ms);
  }
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const supabase = supabaseServer;
    // Enforce server-side role check (admin/moderator)
    const cookieStore = await cookies();
    const authClient = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set(name: string, value: string, options: any) {
            cookieStore.set(name, value, options);
          },
          remove(name: string, options: any) {
            cookieStore.set(name, "", { ...(options || {}), maxAge: 0 });
          },
        },
      }
    );
    const { data: userRes } = await authClient.auth.getUser();
    const user = userRes?.user;
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
      });
    }
    const { data: profile, error: profErr } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    if (profErr) {
      return new Response(JSON.stringify({ error: "Profile lookup failed" }), {
        status: 403,
      });
    }
    const role = (profile?.role || "").toLowerCase();
    if (!["admin", "moderator"].includes(role)) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
      });
    }
    const body = (await req.json()) as ImportBody;
    const { sheetUrl, sheetName, month, year } = body;

    if (!sheetUrl || !sheetName || !month || !year) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400 }
      );
    }

    if (!validateSheetName(sheetName)) {
      return new Response(
        JSON.stringify({ error: "Sheet name must include 'nns'" }),
        { status: 400 }
      );
    }

    const rows = await fetchSheetRange(sheetUrl, sheetName);
    if (!rows.length) {
      return new Response(
        JSON.stringify({ error: "Empty sheet or no access" }),
        { status: 400 }
      );
    }

    const header = rows[0];
    const headerCheck = validateHeaderRow(header);
    if (!headerCheck.valid) {
      return new Response(
        JSON.stringify({
          error: "Header mismatch",
          missing: headerCheck.missing,
          expected: REQUIRED_HEADER_ROW,
        }),
        { status: 400 }
      );
    }

    const dataRows = rows
      .slice(1)
      .filter((r) => r.some((c) => (c ?? "").toString().trim() !== ""));
    const headerLower = header.map((h: any) =>
      String(h ?? "")
        .trim()
        .toLowerCase()
    );
    const idx = (name: string) =>
      headerLower.findIndex((h: string) => h === name.toLowerCase());
    const col = {
      Date: idx("Date"),
      Number: idx("Number"),
      DP: idx("DP"),
      PowerDP: idx("Power (DP)"),
      PowerInbox: idx("Power (inbox)"),
      Name: idx("Name"),
      Addras: idx("Addras"),
      CableStart: idx("Cable Start"),
      CableMiddle: idx("Cable Middle"),
      CableEnd: idx("Cable End"),
      F1: idx("F1"),
      G1: idx("G1"),
      Total: idx("Total"),
      Retainers: idx("Retainers"),
      LHook: idx("L-Hook"),
      NutBolt: idx("Nut&Bolt"),
      TopBolt: idx("Top-Bolt"),
      CHook: idx("C-Hook"),
      FiberRosatte: idx("Fiber-rosatte"),
      InternalWire: idx("Internal Wire"),
      SRosette: idx("S-Rosette"),
      FAC: idx("FAC"),
      Casing: idx("Casing"),
      CTie: idx("C-Tie"),
      CClip: idx("C-Clip"),
      Conduit: idx("Conduit"),
      TagTie: idx("Tag Tie"),
      ONT: idx("ONT"),
      Voice: idx("Voice Test Number"),
      STB: idx("STB"),
      Flexible: idx("Flexible"),
      RJ45: idx("RJ 45"),
      Cat5: idx("Cat 5"),
      Pole67: idx("Pole-6.7"),
      Pole56: idx("Pole-5.6"),
      ConcreteNail: idx("Concrete nail"),
      RollPlug: idx("Roll Plug"),
      ScrewNail: idx("Screw Nail"),
      ScrewNail112: idx("Screw Nail 1 1/2"),
      UClip: idx("U-Clip"),
      Socket: idx("Socket"),
      Bend: idx("Bend"),
      RJ11: idx("RJ 11"),
      RJ12: idx("RJ 12"),
    };

    const { start, end } = monthStartEnd(month, year);

    // Build normalized records from rows
    const records = dataRows
      .map((r) => {
        const dateVal = r[col.Date];
        const date = parseDateValue(dateVal);
        const toNum = (v: any) =>
          v === "" || v == null ? null : Number(String(v).replace(/,/g, ""));
        const toInt = (v: any) =>
          v === "" || v == null ? null : parseInt(String(v), 10);
        return {
          date: date ? date.toISOString().slice(0, 10) : null,
          phone_number: r[col.Number]?.toString().trim() || null,
          telephone_no: r[col.Number]?.toString().trim() || null,
          dp: r[col.DP]?.toString().trim() || null,
          power_dp: toNum(r[col.PowerDP]) ?? null,
          power_inbox: toNum(r[col.PowerInbox]) ?? null,
          name: r[col.Name]?.toString().trim() || null,
          address: r[col.Addras]?.toString().trim() || null,
          cable_start: toNum(r[col.CableStart]) ?? 0,
          cable_middle: toNum(r[col.CableMiddle]) ?? 0,
          cable_end: toNum(r[col.CableEnd]) ?? 0,
          f1: toNum(r[col.F1]) ?? undefined,
          g1: toNum(r[col.G1]) ?? undefined,
          total_cable: toNum(r[col.Total]) ?? undefined,
          retainers: toInt(r[col.Retainers]) ?? 0,
          l_hook: toInt(r[col.LHook]) ?? 0,
          nut_bolt: toInt(r[col.NutBolt]) ?? 0,
          top_bolt: toInt(r[col.TopBolt]) ?? 0,
          c_hook: toInt(r[col.CHook]) ?? 0,
          fiber_rosette: toInt(r[col.FiberRosatte]) ?? 0,
          internal_wire: toNum(r[col.InternalWire]) ?? 0,
          s_rosette: toInt(r[col.SRosette]) ?? 0,
          fac: toInt(r[col.FAC]) ?? 0,
          casing: toNum(r[col.Casing]) ?? 0,
          c_tie: toInt(r[col.CTie]) ?? 0,
          c_clip: toInt(r[col.CClip]) ?? 0,
          conduit: toNum(r[col.Conduit]) ?? 0,
          tag_tie: toInt(r[col.TagTie]) ?? 0,
          ont: r[col.ONT]?.toString().trim() || null,
          voice_test_no: r[col.Voice]?.toString().trim() || null,
          stb: r[col.STB]?.toString().trim() || null,
          flexible: toInt(r[col.Flexible]) ?? 0,
          rj45: toInt(r[col.RJ45]) ?? 0,
          cat5: toNum(r[col.Cat5]) ?? 0,
          pole_67: toInt(r[col.Pole67]) ?? 0,
          pole: toInt(r[col.Pole56]) ?? 0,
          concrete_nail: toInt(r[col.ConcreteNail]) ?? 0,
          roll_plug: toInt(r[col.RollPlug]) ?? 0,
          screw_nail: toInt(r[col.ScrewNail]) ?? 0,
          u_clip: toInt(r[col.UClip]) ?? 0,
          socket: toInt(r[col.Socket]) ?? 0,
          bend: toInt(r[col.Bend]) ?? 0,
          rj11: toInt(r[col.RJ11]) ?? 0,
          rj12: toInt(r[col.RJ12]) ?? 0,
          status: "completed",
        };
      })
      .filter((rec) => rec.phone_number);

    // Overwrite behavior: remove existing rows for the month for those phone_numbers, then insert new
    const phoneNumbers = Array.from(
      new Set(records.map((r) => r.phone_number))
    );
    if (phoneNumbers.length) {
      const { error: delErr } = await supabase
        .from("line_details")
        .delete()
        .in("phone_number", phoneNumbers)
        .gte("date", start)
        .lte("date", end);
      if (delErr) {
        return new Response(JSON.stringify({ error: delErr.message }), {
          status: 500,
        });
      }
    }

    // Insert new rows
    if (records.length) {
      const { error: insErr, count } = await supabase
        .from("line_details")
        .insert(records, { count: "exact" });
      if (insErr) {
        return new Response(JSON.stringify({ error: insErr.message }), {
          status: 500,
        });
      }
      return new Response(
        JSON.stringify({ ok: true, inserted: count, month, year }),
        { status: 200 }
      );
    }

    return new Response(
      JSON.stringify({ ok: true, inserted: 0, month, year }),
      { status: 200 }
    );
  } catch (e: any) {
    return new Response(
      JSON.stringify({ error: e?.message || "Unknown error" }),
      { status: 500 }
    );
  }
}
