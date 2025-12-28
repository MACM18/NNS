"use server";

import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { google } from "googleapis";
import { calculateSmartWastage } from "@/lib/drum-wastage-calculator";
import { updateInventoryFromSheetSync } from "@/lib/inventory-usage-service";

const ALLOWED_ROLES = ["admin", "moderator"];

type AuthContext = { userId: string; role: string };

// NextAuth authorization: use session from auth()
async function authorize(): Promise<AuthContext> {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error("Unauthorized: Please sign in to access this feature");
  }

  const role = (session.user.role || "user").toLowerCase();
  if (!ALLOWED_ROLES.includes(role)) {
    throw new Error("Forbidden: insufficient permissions for this operation");
  }

  return { userId: session.user.id, role };
}

export async function createConnection(payload: {
  month: number;
  year: number;
  sheet_url: string;
  sheet_name?: string | null;
  sheet_tab?: string | null;
}) {
  try {
    const authCtx = await authorize();

    const {
      month,
      year,
      sheet_url,
      sheet_name = null,
      sheet_tab = null,
    } = payload;

    // Input validation
    if (!month || !year || !sheet_url) {
      throw new Error("month, year and sheet_url are required");
    }
    if (Number.isNaN(Number(month)) || Number.isNaN(Number(year))) {
      throw new Error("Invalid month or year format");
    }
    if (month < 1 || month > 12) {
      throw new Error("Month must be between 1 and 12");
    }
    if (year < 2000 || year > 2100) {
      throw new Error("Year must be between 2000 and 2100");
    }

    // Validate sheet URL format
    const spreadsheetId = extractSpreadsheetId(sheet_url);
    if (!spreadsheetId) {
      throw new Error("Invalid Google Sheets URL format");
    }

    // Get Profile ID from User ID (createdById references Profile, not User)
    const profile = await prisma.profile.findUnique({
      where: { userId: authCtx.userId },
      select: { id: true },
    });

    try {
      const created = await prisma.googleSheetConnection.create({
        data: {
          month: Number(month),
          year: Number(year),
          sheetUrl: sheet_url,
          sheetName: sheet_name,
          sheetTab: sheet_tab,
          sheetId: spreadsheetId,
          createdById: profile?.id || null,
        },
        select: { id: true },
      });

      if (!created?.id) {
        throw new Error("Failed to create connection: no ID returned");
      }
      return { id: created.id };
    } catch (e: any) {
      const msg = e?.message || "";
      // Prisma unique constraint violation
      if (e?.code === "P2002" || /unique/i.test(msg)) {
        throw new Error("A connection for this month and year already exists");
      }
      console.error("[createConnection] Prisma error:", e);
      throw new Error(msg || "Failed to create connection");
    }
  } catch (error) {
    console.error("[createConnection] Error:", error);
    throw error instanceof Error
      ? error
      : new Error("Unknown error occurred while creating connection");
  }
}

// Helper server action to accept FormData from a <form action=> submission in the App Router.
export async function createConnectionFromForm(formData: FormData) {
  try {
    const monthRaw = formData.get("month");
    const yearRaw = formData.get("year");
    const sheet_url = String(formData.get("sheet_url") || "");
    const sheet_name = formData.get("sheet_name")
      ? String(formData.get("sheet_name"))
      : null;
    const sheet_tab = formData.get("sheet_tab")
      ? String(formData.get("sheet_tab"))
      : null;

    // Input validation
    if (!monthRaw || !yearRaw || !sheet_url) {
      return { ok: false, error: "month, year and sheet_url are required" };
    }

    const month = Number(monthRaw);
    const year = Number(yearRaw);

    if (Number.isNaN(month) || Number.isNaN(year)) {
      return { ok: false, error: "Invalid month or year format" };
    }

    const result = await createConnection({
      month,
      year,
      sheet_url: sheet_url.trim(),
      sheet_name: sheet_name?.trim() || null,
      sheet_tab: sheet_tab?.trim() || null,
    });
    return { ok: true, id: result.id };
  } catch (error: any) {
    console.error("[createConnectionFromForm] Error:", error);
    const msg = error?.message || String(error);
    return { ok: false, error: msg };
  }
}

export async function deleteConnection(connectionId: string) {
  try {
    await authorize();

    if (!connectionId) {
      throw new Error("connectionId is required");
    }

    // Validate connectionId format (basic UUID check)
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(connectionId)) {
      throw new Error("Invalid connection ID format");
    }

    // Check if connection exists first
    const existing = await prisma.googleSheetConnection.findUnique({
      where: { id: connectionId },
      select: { id: true, createdById: true },
    });
    if (!existing) {
      throw new Error("Connection not found");
    }

    // Optionally, ensure the user is the owner or admin - for now admin/moderator can delete any
    try {
      await prisma.googleSheetConnection.delete({
        where: { id: connectionId },
      });
    } catch (e: any) {
      console.error("[deleteConnection] Prisma delete error:", e);
      const msg = e?.message || "Failed to delete connection";
      throw new Error(msg);
    }

    return { ok: true };
  } catch (error) {
    console.error("[deleteConnection] Error:", error);
    throw error instanceof Error
      ? error
      : new Error("Unknown error occurred while deleting connection");
  }
}

export async function syncConnection(
  connectionId: string,
  onProgress?: (message: string) => void
) {
  try {
    const progress = (m: string) => {
      try {
        onProgress?.(m);
      } catch {}
    };

    progress("Authorizing");
    await authorize();

    if (!connectionId) {
      throw new Error("connectionId is required");
    }

    // Validate connectionId format
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(connectionId)) {
      throw new Error("Invalid connection ID format");
    }

    progress("Fetching connection");
    const conn = await prisma.googleSheetConnection.findUnique({
      where: { id: connectionId },
      select: {
        id: true,
        month: true,
        year: true,
        sheetUrl: true,
        sheetTab: true,
        sheetId: true,
      },
    });

    if (!conn) {
      throw new Error("Connection not found");
    }

    const month: number = Number(conn.month);
    const year: number = Number(conn.year);
    let sheetTab = conn.sheetTab || null;
    const spreadsheetId =
      conn.sheetId || extractSpreadsheetId(conn.sheetUrl || "");

    if (!spreadsheetId) {
      throw new Error("Unable to determine spreadsheetId from URL");
    }

    // Update sheetId if needed
    if (!conn.sheetId || conn.sheetId !== spreadsheetId) {
      await prisma.googleSheetConnection.update({
        where: { id: connectionId },
        data: { sheetId: spreadsheetId },
      });
    }

    progress("Initializing Google Sheets client");
    const sheets = await getSheetsClient();

    // Get available tabs and determine which to use
    progress("Verifying sheet metadata");
    const metaRes = await sheets.spreadsheets.get({
      spreadsheetId,
      fields: "sheets.properties.title",
    });
    const availableTabs = (metaRes.data.sheets || [])
      .map((sheet: any) => sheet?.properties?.title)
      .filter((title: string | undefined): title is string => Boolean(title));

    if (!availableTabs.length) {
      throw new Error("No tabs detected in this spreadsheet");
    }

    // Use stored tab or default to first tab
    if (!sheetTab || !availableTabs.includes(sheetTab)) {
      sheetTab = availableTabs[0];
      await prisma.googleSheetConnection.update({
        where: { id: connectionId },
        data: { sheetTab: sheetTab },
      });
    }

    // Read sheet data
    progress("Reading sheet data");
    const primaryRange = `${sheetTab}!B1:AZ`;
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: primaryRange,
      valueRenderOption: "FORMATTED_VALUE",
      dateTimeRenderOption: "FORMATTED_STRING",
    });

    const values = res.data.values || [];
    if (!values.length) {
      throw new Error("Sheet contains no data");
    }

    const headers = (values[0] || []).map((h: any) =>
      (h ?? "").toString().trim()
    );
    validateHeaders(headers);
    const idx = headerIndex(headers);

    // Map sheet rows to line details
    progress("Processing sheet rows");
    const sheetRows = values
      .slice(1)
      .map((r: any[]) => mapSheetRow(r, idx, month, year))
      .filter((r: any) => r.telephone_no);

    if (!sheetRows.length) {
      throw new Error("No valid rows with telephone numbers found");
    }

    // Upsert lines into database (one-way sync: Sheet → DB)
    progress("Syncing data to database");
    let insertedCount = 0;
    let updatedCount = 0;
    const lineIds: string[] = [];

    for (const row of sheetRows) {
      const payload = sheetToLinePayload(row);
      if (!payload) continue;

      // Check if line exists for this phone + date
      const existing = await prisma.lineDetails.findFirst({
        where: {
          telephoneNo: payload.telephoneNo,
          date: payload.date,
        },
        select: { id: true },
      });

      if (existing) {
        // Update existing record
        await prisma.lineDetails.update({
          where: { id: existing.id },
          data: payload,
        });
        lineIds.push(existing.id);
        updatedCount++;
      } else {
        // Create new record
        const created = await prisma.lineDetails.create({
          data: { ...payload, status: "completed" },
        });
        lineIds.push(created.id);
        insertedCount++;
      }
    }

    // Update hardware inventory using the monthly usage tracking service
    // This prevents duplicate deductions when syncing multiple times
    let hardwareUpdated = 0;
    let hardwareCreated = 0;
    let usageRecordsUpdated = 0;
    try {
      progress("Updating hardware inventory (with usage tracking)");

      const inventoryResult = await updateInventoryFromSheetSync(
        sheetRows,
        month,
        year,
        connectionId
      );

      hardwareUpdated = inventoryResult.itemsUpdated;
      hardwareCreated = inventoryResult.itemsCreated;
      usageRecordsUpdated = inventoryResult.usageRecordsUpdated;

      if (inventoryResult.errors.length > 0) {
        console.warn(
          `[syncConnection] Inventory update warnings:`,
          inventoryResult.errors
        );
      }

      progress(
        `Updated ${hardwareUpdated} items, created ${hardwareCreated} new items, ${usageRecordsUpdated} usage records`
      );
    } catch (hardwareError) {
      console.error(
        "[syncConnection] Hardware inventory update error:",
        hardwareError
      );
      progress("Warning: Some hardware inventory updates failed");
    }

    // Process drum tracking and inventory management
    let drumUsageProcessed = 0;
    let drumUpdated = 0;
    try {
      progress("Processing drum usage & tracking");

      // Get all lines for this month with drum numbers
      const monthStart = new Date(Date.UTC(year, month - 1, 1));
      const monthEnd = new Date(Date.UTC(year, month, 0));

      const monthLines = await prisma.lineDetails.findMany({
        where: {
          date: { gte: monthStart, lte: monthEnd },
          NOT: [{ drumNumber: null }, { drumNumber: "" }],
        },
        select: {
          id: true,
          drumNumber: true,
          cableStart: true,
          cableMiddle: true,
          cableEnd: true,
          date: true,
        },
      });

      if (monthLines.length > 0) {
        // Extract unique drum numbers
        const drumNumbers = Array.from(
          new Set(
            monthLines
              .map((l) => l.drumNumber)
              .filter((n): n is string => Boolean(n))
          )
        );

        // Ensure drum tracking records exist
        const { byNumber, createdNumbers } = await ensureDrumTrackingForNumbers(
          drumNumbers
        );

        // Process each line's drum usage
        for (const line of monthLines) {
          if (!line.drumNumber) continue;

          const drumInfo = byNumber.get(line.drumNumber);
          if (!drumInfo) {
            continue;
          }

          const quantityUsed = computeQuantityUsed(line);
          if (quantityUsed <= 0) {
            continue;
          }

          // Check if usage record exists
          const existingUsage = await prisma.drumUsage.findFirst({
            where: {
              drumId: drumInfo.id,
              lineDetailsId: line.id,
            },
            select: { id: true },
          });

          if (existingUsage) {
            // Update existing usage
            await prisma.drumUsage.update({
              where: { id: existingUsage.id },
              data: {
                quantityUsed,
                cableStartPoint: Number(line.cableStart || 0),
                cableEndPoint: Number(line.cableEnd || 0),
                usageDate: line.date || new Date(),
              },
            });
          } else {
            // Create new usage record
            await prisma.drumUsage.create({
              data: {
                drumId: drumInfo.id,
                lineDetailsId: line.id,
                quantityUsed,
                cableStartPoint: Number(line.cableStart || 0),
                cableEndPoint: Number(line.cableEnd || 0),
                usageDate: line.date || new Date(),
              },
            });
          }
          drumUsageProcessed++;
        }

        // Recalculate drum quantities
        const drumIds = Array.from(byNumber.values()).map((d) => d.id);
        const recalculated = await recalcDrumAggregates(drumIds, month, year);
        drumUpdated = recalculated;

        progress(
          `Processed ${drumUsageProcessed} drum usages, updated ${drumUpdated} drums`
        );
      } else {
        progress("No drum numbers found in this period");
      }
    } catch (drumError) {
      console.error("[syncConnection] Drum processing error:", drumError);
      progress("Warning: Some drum tracking operations failed");
    }

    // Update connection status
    progress("Updating connection status");
    const now = new Date();
    await prisma.googleSheetConnection.update({
      where: { id: connectionId },
      data: {
        lastSynced: now,
        status: "active",
        recordCount: insertedCount + updatedCount,
      },
    });

    return {
      success: true,
      upserted: updatedCount,
      appended: insertedCount,
      total: insertedCount + updatedCount,
      drumUsageInserted: drumUsageProcessed,
      drumProcessed: drumUpdated,
      hardwareUpdated,
      hardwareCreated,
      usageRecordsUpdated,
    };
  } catch (error) {
    console.error("[syncConnection] Error:", error);

    // Try to update connection status to error state
    try {
      await prisma.googleSheetConnection.update({
        where: { id: connectionId },
        data: { status: "error", lastSynced: new Date() },
      });
    } catch (statusError) {
      console.error(
        "[syncConnection] Failed to update error status:",
        statusError
      );
    }

    throw error instanceof Error
      ? error
      : new Error("Unknown error occurred during sync");
  }
}

// ==========================================
// HELPER FUNCTIONS
// ==========================================

function extractSpreadsheetId(url: string): string | null {
  if (!url) return null;
  const m = url.match(/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return m ? m[1] : null;
}

async function getSheetsClient() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const keyRaw = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;

  if (!email || !keyRaw) {
    throw new Error(
      "Google service account credentials are not configured. Please check GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_SERVICE_ACCOUNT_KEY environment variables."
    );
  }

  // Parse the full key.json content and extract the private_key
  let key: string;
  try {
    const creds = JSON.parse(keyRaw);
    if (!creds.private_key) {
      throw new Error("Invalid JSON credentials: missing private_key field");
    }
    key = creds.private_key;
  } catch (e) {
    // Fallback: if it's not JSON, assume it's the raw key with escaped newlines
    key = keyRaw.replace(/\\n/g, "\n");

    // Validate that it looks like a private key
    if (
      !key.includes("-----BEGIN PRIVATE KEY-----") &&
      !key.includes("-----BEGIN RSA PRIVATE KEY-----")
    ) {
      throw new Error(
        "Invalid private key format. Expected PEM format starting with -----BEGIN PRIVATE KEY-----"
      );
    }
  }

  try {
    const authClient = new google.auth.JWT({
      email,
      key,
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    await authClient.authorize();
    return google.sheets({ version: "v4", auth: authClient });
  } catch (error) {
    console.error("[getSheetsClient] Authentication failed:", error);
    throw new Error(
      `Google Sheets API authentication failed: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

function requiredHeaders(): string[] {
  return [
    "Date",
    "Number",
    "DP",
    "Power (DP)",
    "Power (inbox)",
    "Name",
    "Address",
    "Cable Start",
    "Cable Middle",
    "Cable End",
  ];
}

function validateHeaders(headers: string[]) {
  const lower = headers.map((h) => h.toLowerCase());
  const req = requiredHeaders();
  for (const h of req) {
    const alt = h === "Address" ? ["Addras", "Address"] : [h];
    const ok = alt.some((a) => lower.includes(a.toLowerCase()));
    if (!ok) {
      throw new Error(`Missing required column '${h}' in sheet header`);
    }
  }
}

function headerIndex(headers: string[]) {
  const mapLower: Record<string, number> = {};
  headers.forEach((h, i) => (mapLower[h.toLowerCase()] = i));

  const pick = (name: string, alts: string[] = []) => {
    const candidates = [name, ...alts];
    for (const c of candidates) {
      const idx = mapLower[c.toLowerCase()];
      if (typeof idx === "number") return idx;
    }
    return -1;
  };

  return {
    date: pick("Date"),
    number: pick("Number"),
    dp: pick("DP"),
    power_dp: pick("Power (DP)"),
    power_inbox: pick("Power (inbox)"),
    name: pick("Name"),
    address: pick("Address", ["Addras"]),
    cable_start: pick("Cable Start"),
    cable_middle: pick("Cable Middle"),
    cable_end: pick("Cable End"),
    f1: pick("F1"),
    g1: pick("G1"),
    total: pick("Total"),
    retainers: pick("Retainers"),
    l_hook: pick("L-Hook"),
    top_bolt: pick("Top-Bolt"),
    c_hook: pick("C-Hook"),
    fiber_rosette: pick("Fiber-rosatte", ["Fiber-rosette"]),
    internal_wire: pick("Internal Wire"),
    s_rosette: pick("S-Rosette"),
    fac: pick("FAC"),
    casing: pick("Casing"),
    c_tie: pick("C-Tie"),
    c_clip: pick("C-Clip"),
    conduit: pick("Conduit"),
    tag_tie: pick("Tag Tie"),
    ont: pick("ONT"),
    voice_test_no: pick("Voice Test Number"),
    stb: pick("STB"),
    flexible: pick("Flexible"),
    rj45: pick("RJ 45"),
    cat5: pick("Cat 5"),
    pole_67: pick("Pole-6.7"),
    pole: pick("Pole-5.6"),
    concrete_nail: pick("Concrete nail"),
    roll_plug: pick("Roll Plug"),
    u_clip: pick("U-Clip"),
    socket: pick("Socket"),
    bend: pick("Bend"),
    rj11: pick("RJ 11"),
    rj12: pick("RJ 12"),
    nut_bolt: pick("Nut&Bolt", ["Nut Bolt"]),
    screw_nail: pick("Screw Nail", ["Screw Nail 1 1/2"]),
    drum_number: pick("Drum Number", ["Drum No", "Drum", "Drum #"]),
  } as const;
}

function toNumber(v: any): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function normalizeTelephoneCanonical(raw: any): string {
  const s = (raw ?? "").toString().trim();
  if (!s) return s;
  // If contains letters, accept as-is
  if (/[a-zA-Z]/.test(s)) return s;
  const digits = s.replace(/\D+/g, "");
  if (!digits) return s;
  if (digits.length === 10) return digits;
  if (digits.length === 9) return `0${digits}`;
  if (digits.length === 7) return `034${digits}`;
  // Invalid length: return empty to filter out
  return "";
}

// Enforce that the date's month/year match the google_sheet_connections (month/year),
// keeping the day part; if the day exceeds the target month's length, clamp to last day.
function enforceConnectionDate(
  dateISO: string | null,
  monthContext?: number,
  yearContext?: number
): string | null {
  if (!dateISO) return null;
  if (typeof monthContext !== "number" || typeof yearContext !== "number") {
    return dateISO;
  }

  // Extract day from parsed date
  const parsed = new Date(dateISO);
  const day = parsed.getUTCDate();

  // Get last day of the target month
  const lastDay = new Date(Date.UTC(yearContext, monthContext, 0)).getUTCDate();
  const safeDay = Math.min(day, lastDay);

  // Return date with enforced month/year
  return new Date(Date.UTC(yearContext, monthContext - 1, safeDay))
    .toISOString()
    .slice(0, 10);
}

function toDateISO(
  v: any,
  monthContext?: number,
  yearContext?: number
): string | null {
  if (!v) return null;

  // Handle numeric (Google Sheets serial) values
  if (typeof v === "number") {
    const serial = v;
    const epoch = new Date(Date.UTC(1899, 11, 30));
    const d = new Date(epoch.getTime() + serial * 24 * 60 * 60 * 1000);
    if (isNaN(d.getTime())) return null;
    const dateISO = d.toISOString().slice(0, 10);
    // Enforce connection month/year even for serial dates
    return enforceConnectionDate(dateISO, monthContext, yearContext);
  }

  const s = String(v).trim();

  // If the string is a simple day number like "1" or "08", use connection month/year
  if (
    /^\d{1,2}$/.test(s) &&
    typeof monthContext === "number" &&
    typeof yearContext === "number"
  ) {
    const day = Number(s);
    if (day >= 1 && day <= 31) {
      const dt = new Date(Date.UTC(yearContext, monthContext - 1, day));
      return dt.toISOString().slice(0, 10);
    }
  }

  // Handle two-part dates like "8/1" or "1-8" (day/month or month/day)
  const twoPart = s.match(/^(\d{1,2})[/\-](\d{1,2})$/);
  if (
    twoPart &&
    typeof monthContext === "number" &&
    typeof yearContext === "number"
  ) {
    const part1 = Number(twoPart[1]);
    const part2 = Number(twoPart[2]);

    // Assume it's day/month if part1 <= 31 and part2 matches monthContext
    if (part1 <= 31 && part2 === monthContext) {
      const dt = new Date(Date.UTC(yearContext, monthContext - 1, part1));
      return dt.toISOString().slice(0, 10);
    }
    // Or if part2 <= 31 and part1 matches monthContext (month/day format)
    if (part2 <= 31 && part1 === monthContext) {
      const dt = new Date(Date.UTC(yearContext, monthContext - 1, part2));
      return dt.toISOString().slice(0, 10);
    }
    // Default: treat as day and use connection month
    if (part1 <= 31) {
      const dt = new Date(Date.UTC(yearContext, monthContext - 1, part1));
      return dt.toISOString().slice(0, 10);
    }
  }

  // Try parsing as full date, then enforce connection month/year
  try {
    const parsed = new Date(s);
    if (!isNaN(parsed.getTime())) {
      const dateISO = parsed.toISOString().slice(0, 10);
      // CRITICAL: Always enforce connection month/year to prevent wrong years like 2001
      return enforceConnectionDate(dateISO, monthContext, yearContext);
    }
  } catch {}

  return null;
}

function mapSheetRow(r: any[], idx: any, month: number, year: number): any {
  const date = toDateISO(r[idx.date], month, year);
  const telephone_no = normalizeTelephoneCanonical(r[idx.number]);

  return {
    date,
    telephone_no,
    dp: (r[idx.dp] ?? "").toString().trim(),
    power_dp: toNumber(r[idx.power_dp]),
    power_inbox: toNumber(r[idx.power_inbox]),
    name: (r[idx.name] ?? "").toString().trim(),
    address: (r[idx.address] ?? "").toString().trim(),
    cable_start: toNumber(r[idx.cable_start]),
    cable_middle: toNumber(r[idx.cable_middle]),
    cable_end: toNumber(r[idx.cable_end]),
    retainers: toNumber(r[idx.retainers]),
    l_hook: toNumber(r[idx.l_hook]),
    top_bolt: toNumber(r[idx.top_bolt]),
    c_hook: toNumber(r[idx.c_hook]),
    fiber_rosette: toNumber(r[idx.fiber_rosette]),
    internal_wire: toNumber(r[idx.internal_wire]),
    s_rosette: toNumber(r[idx.s_rosette]),
    fac: toNumber(r[idx.fac]),
    casing: toNumber(r[idx.casing]),
    c_tie: toNumber(r[idx.c_tie]),
    c_clip: toNumber(r[idx.c_clip]),
    conduit: toNumber(r[idx.conduit]),
    tag_tie: toNumber(r[idx.tag_tie]),
    ont: (r[idx.ont] ?? "").toString().trim(),
    voice_test_no: (r[idx.voice_test_no] ?? "").toString().trim(),
    stb: (r[idx.stb] ?? "").toString().trim(),
    flexible: toNumber(r[idx.flexible]),
    rj45: toNumber(r[idx.rj45]),
    cat5: toNumber(r[idx.cat5]),
    pole_67: toNumber(r[idx.pole_67]),
    pole: toNumber(r[idx.pole]),
    concrete_nail: toNumber(r[idx.concrete_nail]),
    roll_plug: toNumber(r[idx.roll_plug]),
    u_clip: toNumber(r[idx.u_clip]),
    socket: toNumber(r[idx.socket]),
    bend: toNumber(r[idx.bend]),
    rj11: toNumber(r[idx.rj11]),
    rj12: toNumber(r[idx.rj12]),
    nut_bolt: toNumber(r[idx.nut_bolt]),
    screw_nail: toNumber(r[idx.screw_nail]),
    drum_number: (r[idx.drum_number] ?? "").toString().trim(),
  };
}

function sheetToLinePayload(r: any): any | null {
  const telephone_no = normalizeTelephoneCanonical(r.telephone_no);
  if (!telephone_no) return null;

  const date = r.date ? new Date(r.date) : new Date();

  // Calculate F1, G1, and total
  const cableStart = Number(r.cable_start || 0);
  const cableMiddle = Number(r.cable_middle || 0);
  const cableEnd = Number(r.cable_end || 0);
  const f1 = cableMiddle - cableStart;
  const g1 = cableEnd - cableMiddle;
  const totalCable = f1 + g1;

  // Calculate wastage (20% of total as default if not specified)
  const wastage = totalCable > 0 ? totalCable * 0.2 : 0;

  return {
    date,
    telephoneNo: telephone_no,
    dp: r.dp || "",
    powerDp: Number(r.power_dp || 0),
    powerInbox: Number(r.power_inbox || 0),
    name: r.name || "",
    address: r.address || "",
    cableStart,
    cableMiddle,
    cableEnd,
    wastage,
    retainers: Number(r.retainers || 0),
    lHook: Number(r.l_hook || 0),
    topBolt: Number(r.top_bolt || 0),
    cHook: Number(r.c_hook || 1),
    fiberRosette: Number(r.fiber_rosette || 1),
    internalWire: Number(r.internal_wire || 0),
    sRosette: Number(r.s_rosette || 0),
    fac: Number(r.fac || 2),
    casing: Number(r.casing || 0),
    cTie: Number(r.c_tie || 0),
    cClip: Number(r.c_clip || 0),
    conduit: Number(r.conduit || 0),
    tagTie: Number(r.tag_tie || 1),
    ont: r.ont || null,
    voiceTestNo: r.voice_test_no || null,
    stb: r.stb || null,
    flexible: Number(r.flexible || 2),
    rj45: Number(r.rj45 || 0),
    cat5: Number(r.cat5 || 0),
    pole67: Number(r.pole_67 || 0),
    pole: Number(r.pole || 0),
    concreteNail: Number(r.concrete_nail || 0),
    rollPlug: Number(r.roll_plug || 0),
    uClip: Number(r.u_clip || 0),
    socket: Number(r.socket || 0),
    bend: Number(r.bend || 0),
    rj11: Number(r.rj11 || 0),
    rj12: Number(r.rj12 || 0),
    nutBolt: Number(r.nut_bolt || 0),
    screwNail: Number(r.screw_nail || 0),
    drumNumber: r.drum_number?.trim() || null,
  };
}

// ==========================================
// DRUM TRACKING & INVENTORY HELPERS
// ==========================================

// Compute quantity used for a line (computed from cableStart/cableEnd since totalCable is generated)
function computeQuantityUsed(l: any): number {
  // Prefer explicit cable start/middle/end when available, otherwise fall back to total_cable
  const start = Number(l.cableStart ?? l.cable_start ?? 0);
  const middle = Number(l.cableMiddle ?? l.cable_middle ?? 0);
  const end = Number(l.cableEnd ?? l.cable_end ?? 0);

  if (
    (middle !== 0 || start !== 0 || end !== 0) &&
    Number.isFinite(middle) &&
    Number.isFinite(start) &&
    Number.isFinite(end)
  ) {
    const f1 = middle - start;
    const g1 = end - middle;
    const total = f1 + g1;
    if (Number.isFinite(total) && total > 0) return total;
  }

  // If middle is missing but start and end exist, use end - start as a fallback
  if (Number.isFinite(end) && Number.isFinite(start) && end > start) {
    const fallback = end - start;
    if (fallback > 0) return fallback;
  }

  return 0;
}

// Ensure drum_tracking rows exist for the given drum numbers
async function ensureDrumTrackingForNumbers(drumNumbers: string[]) {
  const unique = Array.from(new Set((drumNumbers || []).filter(Boolean)));
  if (!unique.length) {
    return {
      byNumber: new Map<
        string,
        { id: string; itemId?: string; status: string }
      >(),
      createdNumbers: [],
    };
  }

  const existing = await prisma.drumTracking.findMany({
    where: { drumNumber: { in: unique } },
    select: { id: true, drumNumber: true, itemId: true, status: true },
  });

  const byNumber = new Map<
    string,
    { id: string; itemId?: string; status: string }
  >();
  for (const d of existing || []) {
    if (d.drumNumber) {
      byNumber.set(d.drumNumber, {
        id: d.id,
        itemId: d.itemId || undefined,
        status: d.status || "active",
      });
    }
  }

  // Find the 'Drop Wire Cable' inventory item
  let defaultItem: { id: string; drumSize?: number | null } | null = null;
  try {
    const item = await prisma.inventoryItem.findFirst({
      where: {
        name: { contains: "Drop Wire Cable", mode: "insensitive" },
      },
      select: { id: true, drumSize: true },
    });

    if (item) {
      defaultItem = {
        id: item.id,
        drumSize: item.drumSize ? Number(item.drumSize) : null,
      };
    }
  } catch (err) {
    // Silent fail
  }

  const toCreate = unique.filter((n) => !byNumber.has(n));
  const createdNumbers: string[] = [];

  for (const num of toCreate) {
    try {
      const initialQty = defaultItem?.drumSize || 2000;
      const created = await prisma.drumTracking.create({
        data: {
          drumNumber: num,
          itemId: defaultItem?.id || null,
          initialQuantity: initialQty,
          currentQuantity: initialQty,
          status: "active",
        },
        select: { id: true, drumNumber: true, itemId: true, status: true },
      });

      if (created.drumNumber) {
        byNumber.set(created.drumNumber, {
          id: created.id,
          itemId: created.itemId || undefined,
          status: created.status || "active",
        });
        createdNumbers.push(created.drumNumber);
      }
    } catch (e) {
      // Silent fail for individual drum creations
    }
  }

  return { byNumber, createdNumbers };
}

// Recalculate drum current quantities using calculateSmartWastage
async function recalcDrumAggregates(
  drumIds: string[],
  month: number,
  year: number
): Promise<number> {
  if (!drumIds.length) return 0;
  let recalced = 0;

  // Fetch drums with related item capacity
  const drums = await prisma.drumTracking.findMany({
    where: { id: { in: drumIds } },
    include: {
      item: { select: { drumSize: true } },
      drumUsages: {
        select: {
          id: true,
          cableStartPoint: true,
          cableEndPoint: true,
          usageDate: true,
          quantityUsed: true,
        },
      },
    },
  });

  for (const d of drums || []) {
    try {
      const drumSizeDecimal = d.item?.drumSize;
      const capacity = drumSizeDecimal ? Number(drumSizeDecimal) : 2000;
      const usages = (d.drumUsages || []).map((u: any) => ({
        id: u.id,
        cable_start_point: Number(u.cableStartPoint || 0),
        cable_end_point: Number(u.cableEndPoint || 0),
        usage_date: u.usageDate?.toISOString() || new Date().toISOString(),
        quantity_used: Number(u.quantityUsed || 0),
      }));

      const result = calculateSmartWastage(
        usages,
        capacity,
        undefined,
        d.status || "active"
      );

      // Update drum with calculated values
      await prisma.drumTracking.update({
        where: { id: d.id },
        data: {
          currentQuantity: result.calculatedCurrentQuantity,
        },
      });
      recalced++;
    } catch (err) {
      console.error(`Failed to recalc drum ${d.id}:`, err);
    }
  }

  return recalced;
}

// Exported function to recalculate all drum quantities
export async function recalculateAllDrumQuantities() {
  try {
    await authorize();

    const drums = await prisma.drumTracking.findMany({
      select: { id: true },
    });

    if (!drums.length) {
      return { success: true, recalculated: 0 };
    }

    const drumIds = drums.map((d) => d.id);
    const now = new Date();
    const recalculated = await recalcDrumAggregates(
      drumIds,
      now.getMonth() + 1,
      now.getFullYear()
    );

    return { success: true, recalculated };
  } catch (error) {
    console.error("[recalculateAllDrumQuantities] Error:", error);
    throw error instanceof Error
      ? error
      : new Error("Unknown error occurred while recalculating drum quantities");
  }
}
