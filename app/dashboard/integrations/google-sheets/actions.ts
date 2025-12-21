// @ts-nocheck
// Migrated: Supabase references removed; uses Prisma + NextAuth
// Temporarily disabled TypeScript checking during migration
"use server";

import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { google } from "googleapis";
import { calculateSmartWastage } from "@/lib/drum-wastage-calculator";

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
    const auth = await authorize();

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

    try {
      const created = await prisma.googleSheetConnection.create({
        data: {
          month: Number(month),
          year: Number(year),
          sheetUrl: sheet_url,
          sheetName: sheet_name,
          sheetTab: sheet_tab,
          sheetId: spreadsheetId,
          createdById: auth.userId,
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
    // Debug: log incoming form data keys only (never values/tokens)
    try {
      console.log("[createConnectionFromForm] Received FormData (keys only)");
      for (const entry of Array.from((formData as any).keys())) {
        if (entry === "sb_access_token") continue; // never log tokens
        console.log("   ", entry);
      }
    } catch (e) {
      console.warn("[createConnectionFromForm] Failed to dump FormData:", e);
    }

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
    const normalized = /generated column/i.test(msg)
      ? "One or more generated fields (F1/G1/Total) cannot be set explicitly."
      : msg;
    return { ok: false, error: normalized };
  }
}

export async function deleteConnection(connectionId: string) {
  try {
    const auth = await authorize();

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
    const auth = await authorize();

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
    // Fetch connection with better error handling
    let conn: any;
    try {
      const connData = await prisma.googleSheetConnection.findUnique({
        where: { id: connectionId },
        select: {
          id: true,
          month: true,
          year: true,
          sheetUrl: true,
          sheetName: true,
          sheetTab: true,
          sheetId: true,
        },
      });

      if (!connData) {
        throw new Error("Connection not found");
      }
      conn = connData;
    } catch (error) {
      console.error("[syncConnection] Failed to fetch connection:", error);
      throw error;
    }

    const month: number = Number(conn.month);
    const year: number = Number(conn.year);
    const storedSheetTab = conn.sheetTab
      ? conn.sheetTab.toString().trim()
      : null;
    let sheetTab = storedSheetTab;
    const spreadsheetId =
      conn.sheetId || extractSpreadsheetId(conn.sheetUrl || "");

    if (!spreadsheetId) {
      throw new Error("Unable to determine spreadsheetId from URL or sheet_id");
    }

    if (!conn.sheetId || conn.sheetId !== spreadsheetId) {
      try {
        await prisma.googleSheetConnection.update({
          where: { id: connectionId },
          data: { sheetId: spreadsheetId },
        });
      } catch (persistErr) {
        console.warn(
          "[syncConnection] Failed to persist spreadsheetId:",
          persistErr
        );
      }
    }

    progress("Initializing Google Sheets client");
    // Initialize Google Sheets API with error handling
    let sheets: any;
    try {
      sheets = await getSheetsClient();
    } catch (error) {
      console.error(
        "[syncConnection] Failed to initialize Google Sheets client:",
        error
      );
      throw new Error(
        `Google Sheets API initialization failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }

    let availableTabs: string[] = [];
    try {
      progress("Verifying sheet metadata");
      const metaRes = await sheets.spreadsheets.get({
        spreadsheetId,
        fields: "sheets.properties.title",
      });
      availableTabs = (metaRes.data.sheets || [])
        .map((sheet: any) => sheet?.properties?.title)
        .filter((title: string | undefined): title is string => Boolean(title));

      if (!sheetTab) {
        if (!availableTabs.length) {
          throw new Error("No tabs detected in this spreadsheet.");
        }
        sheetTab = availableTabs[0];
        if (!storedSheetTab) {
          try {
            await prisma.googleSheetConnection.update({
              where: { id: connectionId },
              data: { sheetTab: sheetTab },
            });
          } catch (persistTabErr) {
            console.warn(
              "[syncConnection] Failed to persist default sheet tab:",
              persistTabErr
            );
          }
        }
      } else if (!availableTabs.includes(sheetTab)) {
        const hint = availableTabs.length
          ? `Available tabs: ${availableTabs.join(", ")}`
          : "No tabs detected in this spreadsheet.";
        throw new Error(`Tab '${sheetTab}' not found in spreadsheet. ${hint}`);
      }
    } catch (error: any) {
      console.error("[syncConnection] Failed to verify sheet metadata:", error);
      if (error?.code === 403) {
        throw new Error(
          "Access denied while verifying sheet metadata. Please ensure the service account has at least viewer access."
        );
      }
      if (error?.code === 404) {
        throw new Error(
          "Spreadsheet not found while verifying metadata. Please confirm the connection is pointing to the correct sheet."
        );
      }
      throw new Error(
        `Unable to verify sheet metadata: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }

    if (!sheetTab) {
      throw new Error("Failed to resolve a sheet tab to read from.");
    }
    // Establish month window & read primary sheet data
    const { start, end } = monthStartEnd(month, year);
    progress("Reading sheet data");
    const primaryRange = `${sheetTab}!B1:AZ`;
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: primaryRange,
      // Use FORMATTED_VALUE so computed/formula results in the primary sheet's
      // telephone number column are returned as the displayed values and not
      // as raw/unformatted values which can be empty for formulas.
      valueRenderOption: "FORMATTED_VALUE",
      dateTimeRenderOption: "FORMATTED_STRING",
    });
    const values = res.data.values || [];
    if (!values.length) {
      throw new Error("Selected sheet tab contains no data rows");
    }
    const headers = (values[0] || []).map((h: any) =>
      (h ?? "").toString().trim()
    );
    validateHeaders(headers);
    const idx = headerIndex(headers);

    // Map sheet rows -> normalized row objects
    const sheetRows = values
      .slice(1)
      .map((r: any[]) => mapSheetRow(r, idx, month, year))
      .filter((r: any) => r.telephone_no); // keep only rows with a number

    // Collect telephone numbers for existing line lookup
    const numbers = sheetRows.map((r: any) => r.telephone_no).filter(Boolean);
    const existingLines = await fetchExistingLines(numbers, start, end);
    const existingByPhone = new Map<string, any>(
      existingLines.map((l: any) => [l.telephone_no, l])
    );

    // Utilities for merge/dedupe logic
    const isBlank = (v: any) =>
      v == null || (typeof v === "string" && v.toString().trim() === "");
    const isNumberLike = (v: any) => {
      if (v == null || v === "") return false;
      if (typeof v === "number") return Number.isFinite(v);
      if (typeof v === "string") return /^[-+]?\d+(\.\d+)?$/.test(v.trim());
      return false;
    };

    // Merge two row objects preferring non-empty / more specific incoming values
    const mergeRows = (a: any, b: any) => {
      const out: any = { ...a };
      for (const k of Object.keys(b)) {
        const av = out[k];
        const bv = b[k];
        if (k === "telephone_no") continue; // identical keys
        if (k === "date") {
          if (isBlank(av) && !isBlank(bv)) out[k] = bv;
          continue;
        }
        if (isBlank(bv)) continue;
        if (isNumberLike(bv)) {
          const num = Number(bv);
          if ((Number.isFinite(num) && num !== 0) || isBlank(av)) out[k] = num;
          continue;
        }
        if (typeof bv === "string") {
          const s = bv.toString().trim();
          if (s !== "") out[k] = s;
          continue;
        }
        out[k] = bv;
      }
      return out;
    };

    // Deduplicate sheet rows by (telephone_no,date)
    const seen = new Map<string, any>();
    const mergedKeys: string[] = [];

    for (const row of sheetRows) {
      const phone = (row.telephone_no || "").toString().trim();
      const d = (row.date || "").toString().trim();
      const key = `${phone}::${d}`;
      if (!phone) continue; // skip entries without phone here
      if (seen.has(key)) {
        const existing = seen.get(key);
        const merged = mergeRows(existing, row);
        seen.set(key, merged);
        mergedKeys.push(key);
        continue;
      }
      seen.set(key, row);
    }
    if (mergedKeys.length) {
      console.warn(
        "[syncConnection] Merged duplicate rows detected in sheet for same telephone_no+date; merged keys:",
        mergedKeys.slice(0, 10)
      );
    }

    const dedupedRows = Array.from(seen.values());

    // Upsert lines row-by-row using Prisma
    let upsertedCount = 0;
    try {
      progress("Upserting lines into database");
      for (let index = 0; index < dedupedRows.length; index++) {
        const row = dedupedRows[index];
        try {
          const payload = sheetToLinePayload(row);
          if (!payload) {
            console.log(
              `[syncConnection] Skipping row ${
                index + 1
              } due to invalid telephone number`
            );
            continue;
          }
          // Try to find an existing line for the same telephone_no and date
          const existing = await prisma.line_details.findFirst({
            where: {
              telephone_no: payload.telephone_no,
              date: payload.date,
            },
            select: { id: true },
          });

          if (existing) {
            await prisma.line_details.update({
              where: { id: existing.id },
              data: payload,
            });
            upsertedCount++;
            await ensureTaskForLine(existing.id, row);
          } else {
            const inserted = await prisma.line_details.create({
              data: { ...payload, status: "completed" },
              select: { id: true },
            });
            upsertedCount++;
            await ensureTaskForLine(inserted.id, row);
          }
        } catch (error) {
          console.error(
            `[syncConnection] Error processing row ${index + 1}:`,
            error
          );
          throw new Error(
            `Failed to process sheet row ${index + 1}: ${
              error instanceof Error ? error.message : "Unknown error"
            }`
          );
        }
      }
    } catch (error) {
      console.error("[syncConnection] Line upsert failed:", error);
      throw new Error(
        `Failed to sync sheet data: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }

    // Safety-net: ensure tasks exist for all lines we just upserted/updated.
    // This covers any path that might have missed task creation (bulk upsert, fallback, etc.).
    try {
      const finalLines = await prisma.line_details.findMany({
        where: {
          telephone_no: { in: numbers },
          date: { gte: new Date(start), lte: new Date(end) },
        },
        select: { id: true, telephone_no: true },
      });

      const rowByPhone = new Map<string, any>(
        sheetRows.map((r: any) => [r.telephone_no, r])
      );

      for (const l of finalLines || []) {
        const row = rowByPhone.get(l.telephone_no);
        if (!row) continue;
        try {
          // ensureTaskForLine will not duplicate tasks if one already exists
          // and will create a completed task for this line
          // (we pass the task-related fields via the sheet row)
          // Note: ignore errors per-line to avoid failing the whole sync
          // for task creation issues.
          // eslint-disable-next-line no-await-in-loop
          await ensureTaskForLine(l.id, row);
        } catch (e) {
          console.warn(
            "[syncConnection] ensureTaskForLine failed for",
            l.telephone_no,
            (e as Error).message || e
          );
        }
      }
    } catch (err) {
      console.warn(
        "[syncConnection] Post-upsert task ensure skipped:",
        (err as Error).message || err
      );
    }

    // Project -> Sheet: update rows by phone (match on digit-only numbers) or fill gap rows, then append with A numbering
    let updatedInSheet = 0;
    let appendedInSheet = 0;
    try {
      progress("Preparing write-back to sheet");
      const monthLines = await prisma.line_details.findMany({
        where: { date: { gte: new Date(start), lte: new Date(end) } },
      });

      // Read column A to detect gaps and get last sequence number
      const aRes = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${sheetTab}!A1:A`,
        valueRenderOption: "UNFORMATTED_VALUE",
      });
      const colA: any[] = (aRes.data.values || []).map((r: any) => r?.[0]);

      const sheetDataRows = values.slice(1); // B.. data rows (skip header)
      const core = (v: any) => {
        const s = (v ?? "").toString();
        return normalizeTelephoneCanonical(s) || "";
      };
      // Map existing sheet core numbers -> sheet row index (1-based).
      // Keys are the digit-only phone strings as displayed in the sheet.
      const sheetCoreToRow = new Map<string, number>();
      for (let i = 0; i < sheetDataRows.length; i++) {
        const r = sheetDataRows[i];
        const num = r[idx.number];
        const base = core(num);
        if (!base) continue;
        sheetCoreToRow.set(base, i + 2);
      }

      // Find gap rows: A filled but B empty
      const gapRows: number[] = [];
      for (let j = 2; j <= sheetDataRows.length + 1; j++) {
        const aVal = colA[j - 1];
        const bEmpty = !(sheetDataRows[j - 2]?.[idx.number] ?? "")
          .toString()
          .trim();
        if (aVal != null && aVal !== "" && bEmpty) gapRows.push(j);
      }

      // Last sequence in column A (max numeric value)
      let lastSeq = 0;
      for (let j = 1; j < colA.length; j++) {
        const n = Number(colA[j]);
        if (Number.isFinite(n)) lastSeq = Math.max(lastSeq, n);
      }

      const updatesForB: Array<{ range: string; values: any[][] }> = [];
      const updatesForA: Array<{ range: string; values: any[][] }> = [];
      const toAppend: any[][] = [];

      for (const l of monthLines || []) {
        if (!l?.telephone_no) continue;
        const outB = buildSheetRowFromLine(l, headers);
        const normalized = core(l.telephone_no);
        // Match using the digit-only normalized value
        const matchedRow = normalized
          ? sheetCoreToRow.get(normalized)
          : undefined;
        if (matchedRow) {
          // Update existing row's B:AZ
          updatesForB.push({
            range: `${sheetTab}!B${matchedRow}`,
            values: [outB],
          });
          continue;
        }
        if (gapRows.length) {
          // Fill the first available gap row
          const rowNum = gapRows.shift()!;
          updatesForB.push({ range: `${sheetTab}!B${rowNum}`, values: [outB] });
          // If column A is empty, assign next sequence
          const aExisting = colA[rowNum - 1];
          if (aExisting == null || aExisting === "") {
            lastSeq += 1;
            updatesForA.push({
              range: `${sheetTab}!A${rowNum}`,
              values: [[lastSeq]],
            });
          }
          continue;
        }
        // No match and no gap -> append later (we will include A numbering)
        toAppend.push(outB);
      }

      // Apply updates (B) and A numbering if needed
      if (updatesForB.length || updatesForA.length) {
        progress(
          `Updating ${updatesForB.length} existing/gap rows in sheet` +
            (updatesForA.length ? ` (+${updatesForA.length} A-cells)` : "")
        );
        const data = [...updatesForB, ...updatesForA];
        await sheets.spreadsheets.values.batchUpdate({
          spreadsheetId,
          requestBody: {
            valueInputOption: "USER_ENTERED",
            data,
          },
        });
        updatedInSheet = updatesForB.length;
      }

      // Append new rows including A numbering
      if (toAppend.length) {
        progress(
          `Appending ${toAppend.length} new rows to sheet with numbering`
        );
        // Build rows with [A, ...B..]
        const rowsWithA = toAppend.map((bRow) => {
          lastSeq += 1;
          return [lastSeq, ...bRow];
        });
        await sheets.spreadsheets.values.append({
          spreadsheetId,
          range: `${sheetTab}!A1`,
          valueInputOption: "USER_ENTERED",
          insertDataOption: "INSERT_ROWS",
          requestBody: { values: rowsWithA },
        });
        appendedInSheet = rowsWithA.length;
      }
    } catch (error) {
      console.error("[syncConnection] Sheet write-back failed:", error);
      console.warn("Continuing sync despite sheet write-back failure");
    }

    // (Old drum usage block removed; replaced with improved pipeline after Drum Number tab sync)

    // Also process the 'Drum Number' tab bidirectionally if present
    let drumProcessed = 0;
    let drumAppended = 0;
    let drumCreatedNumbers: string[] = [];
    try {
      progress("Syncing Drum Number tab");
      const drumTab = "Drum Number";
      const drumRange = `${drumTab}!B1:AZ`;
      const drumRes = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: drumRange,
        // Use FORMATTED_VALUE so we receive the computed/displayed result of any
        // formulas in the TP column (rather than raw/unformatted values that
        // can appear empty when a formula is present).
        valueRenderOption: "FORMATTED_VALUE",
        dateTimeRenderOption: "FORMATTED_STRING",
      });
      const drumValues = drumRes.data.values || [];
      if (drumValues.length) {
        const drumHeaders = (drumValues[0] || []).map((h: any) =>
          (h ?? "").toString().trim()
        );
        validateDrumHeaders(drumHeaders);
        const dIdx = headerIndexDrum(drumHeaders);
        const drumRowsRaw = drumValues
          .slice(1)
          .filter((r: any) => (r[dIdx.tp] ?? "").toString().trim() !== "");
        const drumRows = drumRowsRaw.map((r: any) => mapDrumRow(r, dIdx));

        // 2) Insert drum numbers to tracking table BEFORE updating line_details
        const drumNumbersFromSheet = Array.from(
          new Set(
            drumRows
              .map((r: any) => (r.drum_number || "").toString().trim())
              .filter(Boolean)
          )
        );
        if (drumNumbersFromSheet.length) {
          const ensured = await ensureDrumTrackingForNumbers(
            drumNumbersFromSheet as string[]
          );
          const ensuredKeys = Array.from(ensured.byNumber.keys());
          const newlyCreatedKeys = ensuredKeys.filter((k) =>
            drumNumbersFromSheet.includes(k)
          );
          drumProcessed += newlyCreatedKeys.length;
          // record created drum numbers for debug/confirmation
          if (newlyCreatedKeys.length) {
            drumCreatedNumbers.push(...newlyCreatedKeys);
            console.log(
              "[syncConnection] Created drum_tracking rows for:",
              newlyCreatedKeys
            );
          }
        }

        // 3) Add numbers to line details (update existing line_details with drum numbers)
        const monthLines = await prisma.line_details.findMany({
          where: { date: { gte: new Date(start), lte: new Date(end) } },
        });

        const monthLinesByPhone = new Map<string, any[]>();
        for (const l of monthLines || []) {
          if (!l.telephone_no) continue;
          const key = l.telephone_no;
          const arr = monthLinesByPhone.get(key) || [];
          arr.push(l);
          monthLinesByPhone.set(key, arr);
        }
        const pickLatest = (arr: any[]) => {
          return arr.sort(
            (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
          )[0];
        };

        // Prepare updates for line_details by primary key id
        const updates: any[] = [];
        for (const r of drumRows) {
          const arr = monthLinesByPhone.get(r.tp);
          if (!arr || arr.length === 0) continue;
          const target = pickLatest(arr);
          const update: any = { id: target.id };
          if (typeof r.dw_c_hook === "number") update.c_hook = r.dw_c_hook;
          // Only overwrite name if DW CUS looks like a proper name (has letters)
          if (r.dw_cus && looksAlphabetic(r.dw_cus))
            update.name = String(r.dw_cus).trim();
          if (r.drum_number) update.drum_number = r.drum_number;
          updates.push(update);
        }

        if (updates.length > 0) {
          for (const u of updates) {
            const { id, ...data } = u;
            await prisma.line_details.update({ where: { id }, data });
          }
          drumProcessed += updates.length;
        }

        // Project -> Drum sheet: append missing entries for this month
        const drumTPs = new Set(drumRows.map((r: any) => r.tp).filter(Boolean));
        const missingInDrum = (monthLines || []).filter(
          (l: any) => l.telephone_no && !drumTPs.has(l.telephone_no)
        );
        if (missingInDrum.length > 0) {
          const drumAppendRows = missingInDrum.map((l) =>
            buildDrumSheetRowFromLine(l, drumHeaders)
          );
          await sheets.spreadsheets.values.append({
            spreadsheetId,
            range: `${drumTab}!B1`,
            valueInputOption: "USER_ENTERED",
            insertDataOption: "INSERT_ROWS",
            requestBody: { values: drumAppendRows },
          });
          drumAppended = drumAppendRows.length;
        }
        // Ensure drum_tracking entries exist for any drum numbers present in the Drum Number tab
        // Note: This is now handled in the drum pipeline below to ensure proper ordering
      }
    } catch (e) {
      // If tab is missing or validation fails, don't fail the entire sync
      console.warn("Drum Number tab sync skipped:", (e as Error).message);
    }

    // Drum pipeline: ensure drum tracking, upsert usage per line, recalc quantities & inventory
    let drumUsageInserted = 0;
    let drumUsageUpdated = 0;
    let drumsRecalculated = 0;
    try {
      progress("Processing drum usage & inventory");

      const monthLines = await prisma.line_details.findMany({
        where: { date: { gte: new Date(start), lte: new Date(end) } },
      });

      const linesWithDrum = (monthLines || []).filter(
        (l: any) => l.drum_number || l.drum_number_new
      );
      if (!linesWithDrum.length) {
        progress("No drum numbers found in this period");
      } else {
        const drumNumbers = Array.from(
          new Set(
            linesWithDrum
              .map((l: any) => (l.drum_number || l.drum_number_new) as string)
              .filter(Boolean)
          )
        );

        // Drum tracking should already be ensured in the Drum Number tab sync
        // Create a map for existing drum_tracking (assume all exist)
        const drumMap = new Map<
          string,
          { id: string; item_id?: string; status: string }
        >();
        if (drumNumbers.length) {
          const existingDrums = await prisma.drum_tracking.findMany({
            where: { drum_number: { in: drumNumbers } },
            select: {
              id: true,
              drum_number: true,
              item_id: true,
              status: true,
            },
          });
          for (const d of existingDrums || [])
            drumMap.set(d.drum_number, {
              id: d.id,
              item_id: d.item_id || undefined,
              status: d.status,
            });
        }

        // 4) Finally add drum usage
        const idsToCheck = linesWithDrum.map((l: any) => l.id);
        const existingUsages = await prisma.drum_usage.findMany({
          where: { line_details_id: { in: idsToCheck } },
          select: { id: true, line_details_id: true },
        });
        const usageByLine = new Map<string, any>();
        for (const u of existingUsages || [])
          usageByLine.set(u.line_details_id, u);

        const affectedDrumIds = new Set<string>();

        for (const l of linesWithDrum) {
          const num = (l.drum_number || l.drum_number_new) as string;
          const drum = drumMap.get(num);
          if (!drum) continue; // should not happen after ensure
          const quantity = computeQuantityUsed(l);
          const payload = {
            drum_id: drum.id,
            line_details_id: l.id,
            quantity_used: quantity,
            usage_date: l.date,
            cable_start_point: Number(l.cable_start || 0),
            cable_end_point: Number(l.cable_end || 0),
            wastage_calculated: 0, // Initialize wastage to 0, will be calculated later if needed
          };
          const existing = usageByLine.get(l.id);
          if (existing?.id) {
            await prisma.drum_usage.update({
              where: { id: existing.id },
              data: payload,
            });
            drumUsageUpdated++;
          } else {
            await prisma.drum_usage.create({ data: payload });
            drumUsageInserted++;
          }
          affectedDrumIds.add(drum.id);
        }

        // 3) Recalculate per-drum current quantities and set status
        drumsRecalculated += await recalcDrumAggregates(
          Array.from(affectedDrumIds),
          month,
          year
        );

        // 4) Update inventory item stock totals based on active drums remaining amounts for 'Drop Wire Cable'
        try {
          // Find the 'Drop Wire Cable' inventory item
          const dropWireItem = await prisma.inventory_items.findFirst({
            where: { name: "Drop Wire Cable" },
            select: { id: true },
          });

          if (!dropWireItem) {
            console.warn(
              "[syncConnection] 'Drop Wire Cable' inventory item not found, skipping inventory update"
            );
          } else {
            // Get all active drums for this item and sum their remaining quantities
            const activeDrums = await prisma.drum_tracking.findMany({
              where: { item_id: dropWireItem.id, status: "active" },
              select: { current_quantity: true },
            });

            // Calculate total remaining cable from active drums
            const totalRemainingCable = (activeDrums || []).reduce(
              (acc: number, drum: any) =>
                acc + Number(drum.current_quantity || 0),
              0
            );

            // Update inventory item with the dynamic remaining cable amount
            await prisma.inventory_items.update({
              where: { id: dropWireItem.id },
              data: { current_stock: totalRemainingCable },
            });

            console.log(
              `[syncConnection] Updated 'Drop Wire Cable' inventory with total remaining cable: ${totalRemainingCable}`
            );
          }
        } catch (invErr) {
          console.warn("[syncConnection] Inventory update error:", invErr);
        }
      }
    } catch (e) {
      console.warn("Drum pipeline warnings:", (e as Error).message);
    }

    // Update connection status
    const now = new Date().toISOString();
    const totalProcessed =
      sheetRows.length +
      updatedInSheet +
      appendedInSheet +
      drumProcessed +
      drumAppended +
      drumUsageInserted;

    try {
      progress("Updating connection status");
      const data = await prisma.googleSheetConnection.update({
        where: { id: connectionId },
        data: {
          lastSynced: new Date(now),
          status: "active",
          recordCount: totalProcessed,
        },
        select: {
          id: true,
          lastSynced: true,
          status: true,
          recordCount: true,
        },
      });

      // Recalculate all drum quantities at the end of sync
      try {
        progress("Recalculating all drum quantities");
        const recalcResult = await recalculateAllDrumQuantities();
        console.log(
          "[syncConnection] Drum recalculation completed:",
          recalcResult
        );
      } catch (recalcErr) {
        console.warn("[syncConnection] Drum recalculation failed:", recalcErr);
        // Don't fail the entire sync for recalculation issues
      }

      return {
        connection: data,
        upserted: upsertedCount,
        appended: appendedInSheet,
        updatedInSheet,
        drumProcessed,
        drumAppended,
        drumUsageInserted,
        drumUsageUpdated,
        drumsRecalculated,
        drumCreated: drumCreatedNumbers,
      };
    } catch (error) {
      console.error("[syncConnection] Final status update failed:", error);
      throw new Error(
        `Sync completed but failed to update status: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
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

// Helpers
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
    const auth = new google.auth.JWT({
      email,
      key,
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    await auth.authorize();
    return google.sheets({ version: "v4", auth });
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
    "F1",
    "G1",
    "Total",
    "Retainers",
    "L-Hook",
    "Nut&Bolt",
    "Top-Bolt",
    "C-Hook",
    "Fiber-rosatte",
    "Internal Wire",
    "S-Rosette",
    "FAC",
    "Casing",
    "C-Tie",
    "C-Clip",
    "Conduit",
    "Tag Tie",
    "ONT",
    "Voice Test Number",
    "STB",
    "Flexible",
    "RJ 45",
    "Cat 5",
    "Pole-6.7",
    "Pole-5.6",
    "Concrete nail",
    "Roll Plug",
    "Screw Nail",
    "Screw Nail 1 1/2",
    "U-Clip",
    "Socket",
    "Bend",
    "RJ 11",
    "RJ 12",
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
    address: pick("Address", ["Address"]),
    cable_start: pick("Cable Start"),
    cable_middle: pick("Cable Middle"),
    cable_end: pick("Cable End"),
    f1: pick("F1"),
    g1: pick("G1"),
    total: pick("Total"),
    retainers: pick("Retainers"),
    l_hook: pick("L-Hook"),
    nut_bolt: pick("Nut&Bolt"),
    top_bolt: pick("Top-Bolt"),
    c_hook: pick("C-Hook"),
    fiber_rosette: pick("Fiber-rosatte", ["Fiber-rosette", "Fiber Rosette"]),
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
    screw_nail: pick("Screw Nail"),
    screw_nail_2: pick("Screw Nail 1 1/2"),
    u_clip: pick("U-Clip"),
    socket: pick("Socket"),
    bend: pick("Bend"),
    rj11: pick("RJ 11"),
    rj12: pick("RJ 12"),
  } as const;
}

function toNumber(v: any): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

// Normalize telephone numbers from sheet -> project using the same rules as checkTelephoneForInsert
// - If contains any letters, return as-is
// - If numeric: apply prefix rules and return normalized 10-digit string
// - If invalid digit length, return "" (to be filtered out)
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

function toDateISO(
  v: any,
  monthContext?: number,
  yearContext?: number
): string | null {
  if (!v) return null;

  // Handle numeric (Google Sheets serial) values
  if (typeof v === "number") {
    // Google Sheets / Excel date serial (days since 1899-12-30)
    // Convert serial to JS Date
    const serial = v;
    // Excel quirk: serial 60 is 1900-02-29 (non-existent) - but Google tends to align; keep simple
    const epoch = new Date(Date.UTC(1899, 11, 30));
    const d = new Date(epoch.getTime() + serial * 24 * 60 * 60 * 1000);
    if (isNaN(d.getTime())) return null;
    return d.toISOString().slice(0, 10);
  }

  // If value is a string, try to handle common partial formats
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

  // If the string is two parts like "8/1" or "1-8", try to resolve using the connection context
  const twoPart = s.match(/^(\d{1,2})[\/\-](\d{1,2})$/);
  if (twoPart && twoPart.length === 3 && typeof yearContext === "number") {
    const a = Number(twoPart[1]);
    const b = Number(twoPart[2]);

    let month: number | undefined;
    let day: number | undefined;

    // Prefer to use the connection month when ambiguous or when user requested cohesion
    if (typeof monthContext === "number") {
      // If one of the parts equals the connection month, use the other as day
      if (a === monthContext) {
        month = monthContext;
        day = b;
      } else if (b === monthContext) {
        month = monthContext;
        day = a;
      } else if (a > 12 && b <= 12) {
        // a can't be month -> treat as day/month
        day = a;
        month = b;
      } else if (b > 12 && a <= 12) {
        // b can't be month -> treat as month/day
        month = a;
        day = b;
      } else {
        // Ambiguous: default to connection month and take the other as day
        month = monthContext;
        // choose the part that is plausible as day (<=31), prefer second as day
        day = b <= 31 ? b : a;
      }
    } else {
      // No context month available: assume mm/dd (month/day)
      month = a;
      day = b;
    }

    if (month && day && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      const dt = new Date(Date.UTC(yearContext, month - 1, day));
      if (!isNaN(dt.getTime())) return dt.toISOString().slice(0, 10);
    }
  }

  // Fall back to default Date parsing
  const d = new Date(s);
  if (isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

// Enforce that the date's month/year match the google_sheet_connections (month/year),
// keeping the day part; if the day exceeds the target month's length, clamp to last day.
function enforceConnectionDate(
  dateISO: string | null,
  monthContext?: number,
  yearContext?: number
): string | null {
  if (typeof monthContext !== "number" || typeof yearContext !== "number") {
    return dateISO;
  }
  const day =
    dateISO && /^\d{4}-\d{2}-\d{2}$/.test(dateISO)
      ? Math.min(Math.max(parseInt(dateISO.slice(8, 10), 10) || 1, 1), 31)
      : 1;
  const lastDay = new Date(Date.UTC(yearContext, monthContext, 0)).getUTCDate();
  const safeDay = Math.min(day, lastDay);
  return new Date(Date.UTC(yearContext, monthContext - 1, safeDay))
    .toISOString()
    .slice(0, 10);
}

function mapSheetRow(
  row: any[],
  idx: ReturnType<typeof headerIndex>,
  monthContext?: number,
  yearContext?: number
) {
  const rawNumber = (row[idx.number] ?? "").toString().trim();
  const normalizedNumber = normalizeTelephoneCanonical(rawNumber);
  const rawDate = toDateISO(row[idx.date], monthContext, yearContext);
  const normalizedDate = enforceConnectionDate(
    rawDate,
    monthContext,
    yearContext
  );
  const cable_start = toNumber(row[idx.cable_start]);
  const cable_middle = toNumber(row[idx.cable_middle]);
  const cable_end = toNumber(row[idx.cable_end]);
  const f1 =
    row[idx.f1] != null
      ? toNumber(row[idx.f1])
      : Math.abs(cable_start - cable_middle);
  const g1 =
    row[idx.g1] != null
      ? toNumber(row[idx.g1])
      : Math.abs(cable_middle - cable_end);
  const total = row[idx.total] != null ? toNumber(row[idx.total]) : f1 + g1;
  const screwNailSum =
    toNumber(row[idx.screw_nail]) + toNumber(row[idx.screw_nail_2]);

  return {
    date: normalizedDate,
    telephone_no: normalizedNumber,
    dp: (row[idx.dp] ?? "").toString().trim(),
    power_dp: toNumber(row[idx.power_dp]),
    power_inbox: toNumber(row[idx.power_inbox]),
    name: (row[idx.name] ?? "").toString().trim(),
    address: (row[idx.address] ?? "").toString().trim(),
    cable_start,
    cable_middle,
    cable_end,
    f1,
    g1,
    total_cable: total,
    retainers: toNumber(row[idx.retainers]),
    l_hook: toNumber(row[idx.l_hook]),
    nut_bolt: toNumber(row[idx.nut_bolt]),
    top_bolt: toNumber(row[idx.top_bolt]),
    c_hook: toNumber(row[idx.c_hook]),
    fiber_rosette: toNumber(row[idx.fiber_rosette]),
    internal_wire: toNumber(row[idx.internal_wire]),
    s_rosette: toNumber(row[idx.s_rosette]),
    fac: toNumber(row[idx.fac]),
    casing: toNumber(row[idx.casing]),
    c_tie: toNumber(row[idx.c_tie]),
    c_clip: toNumber(row[idx.c_clip]),
    conduit: toNumber(row[idx.conduit]),
    tag_tie: toNumber(row[idx.tag_tie]),
    ont: (row[idx.ont] ?? "").toString().trim(),
    voice_test_no: (row[idx.voice_test_no] ?? "").toString().trim(),
    stb: (row[idx.stb] ?? "").toString().trim(),
    flexible: toNumber(row[idx.flexible]),
    rj45: toNumber(row[idx.rj45]),
    cat5: toNumber(row[idx.cat5]),
    pole_67: toNumber(row[idx.pole_67]),
    pole: toNumber(row[idx.pole]),
    concrete_nail: toNumber(row[idx.concrete_nail]),
    roll_plug: toNumber(row[idx.roll_plug]),
    screw_nail: screwNailSum,
    u_clip: toNumber(row[idx.u_clip]),
    socket: toNumber(row[idx.socket]),
    bend: toNumber(row[idx.bend]),
    rj11: toNumber(row[idx.rj11]),
    rj12: toNumber(row[idx.rj12]),
  };
}

function looksAlphabetic(raw: any): boolean {
  const s = (raw ?? "").toString();
  return /[a-zA-Z]/.test(s);
}

function sheetToLinePayload(r: any): any | null {
  // Validate telephone number first
  const validatedTelephone = checkTelephoneForInsert(r.telephone_no);
  if (validatedTelephone === "wrong number") {
    return null; // Skip rows with invalid telephone numbers
  }

  // Payload matches line_details columns
  const payload: any = {
    date: r.date || new Date().toISOString().slice(0, 10),
    // Use the validated telephone number
    telephone_no: validatedTelephone,
    phone_number: validatedTelephone,
    dp: String(r.dp || ""),
    power_dp: r.power_dp,
    power_inbox: r.power_inbox,
    name: String(r.name || ""),
    address: r.address,
    cable_start: r.cable_start,
    cable_middle: r.cable_middle,
    cable_end: r.cable_end,
    // Do not set generated columns (f1, g1, total_cable)
    retainers: r.retainers,
    l_hook: r.l_hook,
    nut_bolt: r.nut_bolt,
    top_bolt: r.top_bolt,
    c_hook: r.c_hook,
    fiber_rosette: r.fiber_rosette,
    internal_wire: r.internal_wire,
    s_rosette: r.s_rosette,
    fac: r.fac,
    casing: r.casing,
    c_tie: r.c_tie,
    c_clip: r.c_clip,
    conduit: r.conduit,
    tag_tie: r.tag_tie,
    ont: r.ont,
    voice_test_no: r.voice_test_no,
    stb: r.stb,
    flexible: r.flexible,
    rj45: r.rj45,
    cat5: r.cat5,
    pole_67: r.pole_67,
    pole: r.pole,
    concrete_nail: r.concrete_nail,
    roll_plug: r.roll_plug,
    screw_nail: r.screw_nail,
    u_clip: r.u_clip,
    socket: r.socket,
    bend: r.bend,
    rj11: r.rj11,
    rj12: r.rj12,
  };
  return payload;
}

// Validate/normalize telephone for DB insertion according to rules:
// - If value contains any letters, accept as-is (return original string)
// - If numeric:
//   - 10 digits: return as-is
//   - 9 digits: prefix with '0' -> becomes 10
//   - 7 digits: prefix with '034' -> becomes 10
// Returns either the original letter-based value or a 10-digit numeric string when possible.
function checkTelephoneForInsert(raw: any): string {
  const s = (raw ?? "").toString().trim();
  if (!s) return s;
  // If contains letters, accept as-is
  if (/[a-zA-Z]/.test(s)) return s;
  const digits = s.replace(/\D+/g, "");
  if (!digits) return s;
  if (digits.length === 10) return digits;
  if (digits.length === 9) return `0${digits}`;
  if (digits.length === 7) return `034${digits}`;
  // Fallback: return digits unchanged (caller may validate further)
  return "wrong number";
}

async function fetchExistingLines(
  numbers: string[],
  startISO: string,
  endISO: string
) {
  if (!numbers.length) return [] as any[];
  const rows = await prisma.line_details.findMany({
    where: {
      telephone_no: { in: numbers },
      date: { gte: new Date(startISO), lte: new Date(endISO) },
    },
    select: { id: true, telephone_no: true, date: true },
  });
  return rows || [];
}

async function ensureTaskForLine(lineId: string, r: any) {
  // Check if a task exists for this line
  const existingTask = await prisma.tasks.findFirst({
    where: { line_details_id: lineId },
    select: { id: true },
  });

  if (existingTask?.id) {
    // Ensure line_details has task_id set when a task already exists
    await prisma.line_details.update({
      where: { id: lineId },
      data: { task_id: existingTask.id },
    });
    return existingTask;
  }

  // Create completed task
  const created = await prisma.tasks.create({
    data: {
      telephone_no: r.telephone_no,
      dp: String(r.dp || ""),
      address: r.address,
      customer_name: String(r.name || ""),
      status: "completed",
      line_details_id: lineId,
      task_date: r.date || new Date().toISOString().slice(0, 10),
      created_by: null,
    },
    select: { id: true },
  });

  if (created?.id) {
    await prisma.line_details.update({
      where: { id: lineId },
      data: { task_id: created.id },
    });
  }

  return created;
}

function buildSheetRowFromLine(l: any, headers: string[]): any[] {
  const idx = headerIndex(headers);
  const row = new Array(headers.length);

  // Map line fields back to sheet columns
  row[idx.date] = l.date;
  row[idx.number] = formatTelephoneForSheet(l.telephone_no);
  row[idx.dp] = l.dp;
  row[idx.power_dp] = l.power_dp;
  row[idx.power_inbox] = l.power_inbox;
  row[idx.name] = l.name;
  row[idx.address] = l.address;
  row[idx.cable_start] = l.cable_start;
  row[idx.cable_middle] = l.cable_middle;
  row[idx.cable_end] = l.cable_end;
  row[idx.f1] = l.f1;
  row[idx.g1] = l.g1;
  row[idx.total] = l.total_cable;
  row[idx.retainers] = l.retainers;
  row[idx.l_hook] = l.l_hook;
  row[idx.nut_bolt] = l.nut_bolt;
  row[idx.top_bolt] = l.top_bolt;
  row[idx.c_hook] = l.c_hook;
  row[idx.fiber_rosette] = l.fiber_rosette;
  row[idx.internal_wire] = l.internal_wire;
  row[idx.s_rosette] = l.s_rosette;
  row[idx.fac] = l.fac;
  row[idx.casing] = l.casing;
  row[idx.c_tie] = l.c_tie;
  row[idx.c_clip] = l.c_clip;
  row[idx.conduit] = l.conduit;
  row[idx.tag_tie] = l.tag_tie;
  row[idx.ont] = l.ont;
  row[idx.voice_test_no] = l.voice_test_no;
  row[idx.stb] = l.stb;
  row[idx.flexible] = l.flexible;
  row[idx.rj45] = l.rj45;
  row[idx.cat5] = l.cat5;
  row[idx.pole_67] = l.pole_67;
  row[idx.pole] = l.pole;
  row[idx.concrete_nail] = l.concrete_nail;
  row[idx.roll_plug] = l.roll_plug;
  row[idx.screw_nail] = l.screw_nail;
  row[idx.u_clip] = l.u_clip;
  row[idx.socket] = l.socket;
  row[idx.bend] = l.bend;
  row[idx.rj11] = l.rj11;
  row[idx.rj12] = l.rj12;

  return row;
}

// Drum Number tab helpers
function requiredDrumHeaders(): string[] {
  // 'NO' (sequence) is optional and can be ignored; we only require the substantive columns
  return ["TP", "DW DP", "DW C HOOK", "DW CUS", "DRUM NUMBER"];
}

function validateDrumHeaders(headers: string[]) {
  const lower = headers.map((h) => h.toLowerCase());
  for (const h of requiredDrumHeaders()) {
    if (!lower.includes(h.toLowerCase())) {
      throw new Error(`Missing required column '${h}' in Drum Number header`);
    }
  }
}

function headerIndexDrum(headers: string[]) {
  const mapLower: Record<string, number> = {};
  headers.forEach((h, i) => (mapLower[h.toLowerCase()] = i));
  const pick = (name: string) => mapLower[name.toLowerCase()] ?? -1;
  return {
    no: pick("NO"),
    tp: pick("TP"),
    dw_dp: pick("DW DP"),
    dw_c_hook: pick("DW C HOOK"),
    dw_cus: pick("DW CUS"),
    drum_number: pick("DRUM NUMBER"),
  } as const;
}

function mapDrumRow(row: any[], idx: ReturnType<typeof headerIndexDrum>) {
  return {
    no: (row[idx.no] ?? "").toString().trim(),
    tp: normalizeTelephoneCanonical((row[idx.tp] ?? "").toString().trim()),
    dw_dp: (row[idx.dw_dp] ?? "").toString().trim(),
    dw_c_hook: toNumber(row[idx.dw_c_hook]),
    dw_cus: (row[idx.dw_cus] ?? "").toString().trim(),
    drum_number: (row[idx.drum_number] ?? "").toString().trim(),
  };
}

function buildDrumSheetRowFromLine(l: any, headers: string[]): any[] {
  const idx = headerIndexDrum(headers);
  const row = new Array(headers.length);
  // We don't set NO (sequence) here; Google Sheets will leave it blank or a formula can fill it
  row[idx.tp] = formatTelephoneForSheet(l.telephone_no);
  row[idx.dw_dp] = l.dp;
  row[idx.dw_c_hook] = l.c_hook;
  row[idx.dw_cus] = l.name;
  row[idx.drum_number] = l.drum_number ?? l.drum_number_new ?? "";
  return row;
}

// Format telephone number for writing to sheets: prefer the shorter/display form
// (strip a leading local area code like '034' if present) to avoid overwriting
// sheet values with an unwanted prefixed form.
function formatTelephoneForSheet(raw: any): string {
  if (!raw && raw !== 0) return "";
  const s = String(raw).trim();
  const digits = s.replace(/\D+/g, "");
  if (!digits) return s;
  // If the number starts with '034' and has more digits after it, strip it
  // when writing back to the sheet to preserve the sheet's displayed format.
  if (digits.startsWith("034") && digits.length > 3) return digits.slice(3);
  return digits;
}

// Compute quantity used for a line (prefers explicit total_cable, else abs(end-start))
function computeQuantityUsed(l: any): number {
  const total = Number(l.total_cable || 0);
  if (Number.isFinite(total) && total > 0) return total;
  const start = Number(l.cable_start || 0);
  const end = Number(l.cable_end || 0);
  const diff = Math.abs(end - start);
  return Number.isFinite(diff) && diff >= 0 ? diff : 0;
}

// Ensure drum_tracking rows exist for the given drum numbers. Tries to map to a cable inventory item.
async function ensureDrumTrackingForNumbers(drumNumbers: string[]) {
  const unique = Array.from(new Set((drumNumbers || []).filter(Boolean)));
  if (!unique.length)
    return {
      byNumber: new Map<
        string,
        { id: string; item_id?: string; status: string }
      >(),
    };

  const existing = await prisma.drum_tracking.findMany({
    where: { drum_number: { in: unique } },
    select: { id: true, drum_number: true, item_id: true, status: true },
  });

  const byNumber = new Map<
    string,
    { id: string; item_id?: string; status: string }
  >();
  for (const d of existing || [])
    byNumber.set(d.drum_number, {
      id: d.id,
      item_id: d.item_id || undefined,
      status: d.status,
    });

  // Find the 'Drop Wire Cable' inventory item specifically
  let defaultItem: { id: string; drum_size?: number } | null = null;
  try {
    const dropWireCable = await prisma.inventory_items.findFirst({
      where: { name: "Drop Wire Cable" },
      select: { id: true, drum_size: true, name: true },
    });
    if (dropWireCable) {
      defaultItem = dropWireCable as any;
      console.log(
        "[ensureDrumTrackingForNumbers] Found Drop Wire Cable item:",
        dropWireCable.id
      );
    } else {
      console.warn(
        "[ensureDrumTrackingForNumbers] Drop Wire Cable item not found in inventory"
      );
    }
  } catch (err) {
    console.error(
      "[ensureDrumTrackingForNumbers] Exception finding Drop Wire Cable:",
      err
    );
  }

  const toCreate = unique.filter((n) => !byNumber.has(n));
  const createdNumbers: string[] = [];
  for (const num of toCreate) {
    try {
      // Only create drums if we have the Drop Wire Cable item
      if (!defaultItem) {
        console.error(
          "[ensureDrumTrackingForNumbers] Cannot create drum tracking for",
          num,
          "- Drop Wire Cable item not found in inventory"
        );
        continue;
      }

      const initial = 2000; // Default initial quantity for new drums
      const insertPayload: any = {
        drum_number: num,
        item_id: defaultItem.id, // Always use the Drop Wire Cable item_id
        initial_quantity: initial,
        current_quantity: initial,
        status: "active", // Always create drums with active status
        received_date: new Date().toISOString().slice(0, 10), // Set received date to today
      };
      try {
        const created = await prisma.drum_tracking.create({
          data: insertPayload,
          select: { id: true, item_id: true, status: true },
        });
        if (created?.id) {
          byNumber.set(num, {
            id: created.id,
            item_id: created.item_id || undefined,
            status: created.status || "active",
          });
          createdNumbers.push(num);
          console.log(
            "[ensureDrumTrackingForNumbers] Created drum_tracking for",
            num,
            "id=",
            created.id
          );
        }
      } catch (insErr) {
        console.error(
          "[ensureDrumTrackingForNumbers] Insert failed for",
          num,
          insErr
        );
        continue;
      }
    } catch (err) {
      console.error(
        "[ensureDrumTrackingForNumbers] Exception creating drum_tracking for",
        num,
        err
      );
      continue;
    }
  }

  return { byNumber, createdNumbers };
}

// Recalculate drum current quantities using calculateSmartWastage; set status based on last used line date in current month.
async function recalcDrumAggregates(
  drumIds: string[],
  month: number,
  year: number
): Promise<number> {
  if (!drumIds.length) return 0;
  let recalced = 0;
  // Fetch drums with related item capacity
  const drums = await prisma.drum_tracking.findMany({
    where: { id: { in: drumIds } },
    select: { id: true, item_id: true, status: true, current_quantity: true },
  });

  for (const d of drums || []) {
    let capacity = 0;
    if (d.item_id) {
      const item = await prisma.inventory_items.findUnique({
        where: { id: d.item_id },
        select: { drum_size: true },
      });
      if (item?.drum_size) capacity = Number(item.drum_size) || 0;
    }

    // Gather all usages for this drum
    const usages = await prisma.drum_usage.findMany({
      where: { drum_id: d.id },
      select: {
        id: true,
        cable_start_point: true,
        cable_end_point: true,
        usage_date: true,
      },
    });

    if (capacity > 0) {
      const result = calculateSmartWastage(
        (usages || []).map((u: any) => ({
          id: u.id,
          cable_start_point: Number(u.cable_start_point || 0),
          cable_end_point: Number(u.cable_end_point || 0),
          usage_date: u.usage_date,
        })),
        capacity,
        undefined,
        d.status
      );

      const newQty = result.calculatedCurrentQuantity;

      // Always set status to active
      const newStatus = "active";
      await prisma.drum_tracking.update({
        where: { id: d.id },
        data: { current_quantity: newQty, status: newStatus },
      });
      recalced++;
    }
  }
  return recalced;
}

// Recalculate all drum current quantities based on their usage records
export async function recalculateAllDrumQuantities(accessToken?: string) {
  try {
    // Ensure caller is authorized
    await authorize(accessToken);

    console.log(
      "[recalculateAllDrumQuantities] Starting recalculation of all drum quantities"
    );

    // Fetch all drums with their item information
    const drums = await prisma.drum_tracking.findMany({
      where: { item_id: { not: null } },
      select: {
        id: true,
        item_id: true,
        status: true,
        initial_quantity: true,
        drum_number: true,
      },
    });

    if (!drums || drums.length === 0) {
      console.log(
        "[recalculateAllDrumQuantities] No drums found to recalculate"
      );
      return { updated: 0, message: "No drums found to recalculate" };
    }

    let updatedCount = 0;
    const errors: string[] = [];

    for (const drum of drums) {
      try {
        // Get drum capacity from inventory item
        let capacity = 0;
        if (drum.item_id) {
          const item = await prisma.inventory_items.findUnique({
            where: { id: drum.item_id },
            select: { drum_size: true },
          });
          if (item?.drum_size) capacity = Number(item.drum_size) || 0;
        }

        if (capacity <= 0) {
          console.warn(
            `[recalculateAllDrumQuantities] Skipping drum ${drum.drum_number}: no valid capacity`
          );
          continue;
        }

        // Gather all usages for this drum
        const usages = await prisma.drum_usage.findMany({
          where: { drum_id: drum.id },
          select: {
            id: true,
            cable_start_point: true,
            cable_end_point: true,
            usage_date: true,
          },
        });

        // Calculate new quantity using smart wastage calculation
        const result = calculateSmartWastage(
          (usages || []).map((u: any) => ({
            id: u.id,
            cable_start_point: Number(u.cable_start_point || 0),
            cable_end_point: Number(u.cable_end_point || 0),
            usage_date: u.usage_date,
          })),
          capacity,
          undefined, // no manual override
          drum.status
        );

        const newQuantity = result.calculatedCurrentQuantity;

        // Update the drum with the recalculated quantity
        await prisma.drum_tracking.update({
          where: { id: drum.id },
          data: { current_quantity: newQuantity, updated_at: new Date() },
        });
        updatedCount++;
        console.log(
          `[recalculateAllDrumQuantities] Updated drum ${
            drum.drum_number
          }: ${newQuantity.toFixed(1)}m remaining`
        );
      } catch (drumErr) {
        console.error(
          `[recalculateAllDrumQuantities] Error processing drum ${drum.drum_number}:`,
          drumErr
        );
        errors.push(`Error processing drum ${drum.drum_number}`);
      }
    }

    console.log(
      `[recalculateAllDrumQuantities] Completed: ${updatedCount} drums updated`
    );

    return {
      updated: updatedCount,
      errors: errors.length > 0 ? errors : undefined,
      message: `Successfully recalculated quantities for ${updatedCount} drums${
        errors.length > 0 ? ` (${errors.length} errors)` : ""
      }`,
    };
  } catch (error) {
    console.error("[recalculateAllDrumQuantities] Error:", error);
    throw error instanceof Error
      ? error
      : new Error("Failed to recalculate drum quantities");
  }
}

// Month window helper restored
function monthStartEnd(month: number, year: number) {
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 0));
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
}

// Form wrappers for use as <form action={...}> server actions
export async function deleteConnectionFromForm(formData: FormData) {
  try {
    const connectionId = String(formData.get("connectionId") || "");

    if (!connectionId) {
      throw new Error("connectionId is required");
    }

    const result = await deleteConnection(connectionId);

    // redirect back to list
    const { redirect } = await import("next/navigation");
    redirect(`/dashboard/integrations/google-sheets`);

    return result;
  } catch (error) {
    console.error("[deleteConnectionFromForm] Error:", error);
    throw error instanceof Error
      ? error
      : new Error("Failed to delete connection");
  }
}

export async function syncConnectionFromForm(formData: FormData) {
  try {
    const connectionId = String(formData.get("connectionId") || "");

    if (!connectionId) {
      throw new Error("connectionId is required");
    }

    const result = await syncConnection(connectionId);

    // redirect back to list (or stay)
    const { redirect } = await import("next/navigation");
    redirect(`/dashboard/integrations/google-sheets`);

    return result;
  } catch (error) {
    console.error("[syncConnectionFromForm] Error:", error);
    // Return error result instead of throwing for form handling
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "Sync failed with unknown error",
    };
  }
}

// Dev-only helper: check presence/format of integration-related env vars.
// Protected with authorize() so only admin/moderator can call.
export async function checkIntegrationEnv() {
  try {
    // ensure caller is authorized
    await authorize();

    const result: Record<string, any> = {};

    const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const keyRaw = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
    result.GOOGLE_SERVICE_ACCOUNT_EMAIL_present = Boolean(email);
    result.GOOGLE_SERVICE_ACCOUNT_KEY_present = Boolean(keyRaw);

    // determine likely format without exposing the key
    if (!keyRaw) {
      result.GOOGLE_SERVICE_ACCOUNT_KEY_format = "missing";
    } else {
      try {
        const parsed = JSON.parse(keyRaw);
        result.GOOGLE_SERVICE_ACCOUNT_KEY_format = parsed?.private_key
          ? "json-with-private_key"
          : "json-unknown";
      } catch (e) {
        if (keyRaw.includes("\\n") || keyRaw.includes("-----BEGIN")) {
          result.GOOGLE_SERVICE_ACCOUNT_KEY_format = "pem-escaped-or-raw";
        } else {
          result.GOOGLE_SERVICE_ACCOUNT_KEY_format = "raw";
        }
      }
    }

    // NextAuth/Prisma specific envs
    result.NEXTAUTH_URL_present = Boolean(process.env.NEXTAUTH_URL);
    result.NEXTAUTH_SECRET_present = Boolean(process.env.NEXTAUTH_SECRET);
    result.DATABASE_URL_present = Boolean(process.env.DATABASE_URL);

    // log for server-side diagnostics (no sensitive values)
    console.log("[checkIntegrationEnv] result:", result);

    return result;
  } catch (error) {
    console.error("[checkIntegrationEnv] Error:", error);
    throw error instanceof Error
      ? error
      : new Error("Failed to check integration environment");
  }
}
