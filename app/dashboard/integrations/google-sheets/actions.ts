import { supabaseServer } from "@/lib/supabase-server";
import { google } from "googleapis";
import { calculateSmartWastage } from "@/lib/drum-wastage-calculator";

const ALLOWED_ROLES = ["admin", "moderator"];

type AuthContext = { userId: string; role: string };

// Token-only authorization: require a Supabase access token from the caller.
async function authorize(accessToken?: string): Promise<AuthContext> {
  if (!accessToken) {
    throw new Error(
      "Access token is required. Please include 'sb_access_token' in the form or request."
    );
  }

  try {
    const { data, error } = await supabaseServer.auth.getUser(accessToken);
    if (error || !data?.user) {
      throw new Error(
        `Unable to retrieve user: ${error?.message || "No user data"}`
      );
    }
    const user = data.user;

    const { data: profile, error: profileErr } = await supabaseServer
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profileErr) {
      throw new Error(`Profile lookup failed: ${profileErr.message}`);
    }

    const role = (profile?.role || "").toLowerCase();
    if (!ALLOWED_ROLES.includes(role)) {
      throw new Error("Forbidden: insufficient permissions for this operation");
    }

    return { userId: user.id, role };
  } catch (error) {
    console.error("[authorize] Access token validation failed:", error);
    throw error instanceof Error
      ? error
      : new Error("Access token validation failed");
  }
}

export async function createConnection(
  payload: {
    month: number;
    year: number;
    sheet_url: string;
    sheet_name?: string | null;
    sheet_tab?: string | null;
  },
  accessToken?: string
) {
  "use server";

  try {
    const auth = await authorize(accessToken);

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

    const { data, error } = await supabaseServer
      .from("google_sheet_connections")
      .insert({
        month: Number(month),
        year: Number(year),
        sheet_url: sheet_url,
        sheet_name: sheet_name,
        sheet_tab: sheet_tab,
        sheet_id: spreadsheetId,
        created_by: auth.userId,
      })
      .select("id")
      .single();

    if (error) {
      console.error("[createConnection] Database error:", error);
      // Handle specific database errors
      if (error.code === "23505") {
        // Unique constraint violation
        throw new Error("A connection for this month and year already exists");
      }
      throw new Error(error.message || "Failed to create connection");
    }

    if (!data?.id) {
      throw new Error("Failed to create connection: no ID returned");
    }

    return { id: data.id };
  } catch (error) {
    console.error("[createConnection] Error:", error);
    throw error instanceof Error
      ? error
      : new Error("Unknown error occurred while creating connection");
  }
}

// Helper server action to accept FormData from a <form action=> submission in the App Router.
export async function createConnectionFromForm(formData: FormData) {
  "use server";

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
    const accessToken = formData.get("sb_access_token")
      ? String(formData.get("sb_access_token"))
      : undefined;

    // Input validation
    if (!monthRaw || !yearRaw || !sheet_url) {
      return { ok: false, error: "month, year and sheet_url are required" };
    }

    const month = Number(monthRaw);
    const year = Number(yearRaw);

    if (Number.isNaN(month) || Number.isNaN(year)) {
      return { ok: false, error: "Invalid month or year format" };
    }

    const result = await createConnection(
      {
        month,
        year,
        sheet_url: sheet_url.trim(),
        sheet_name: sheet_name?.trim() || null,
        sheet_tab: sheet_tab?.trim() || null,
      },
      accessToken
    );
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

export async function deleteConnection(
  connectionId: string,
  accessToken?: string
) {
  "use server";

  try {
    const auth = await authorize(accessToken);

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
    const { data: existing, error: fetchErr } = await supabaseServer
      .from("google_sheet_connections")
      .select("id, created_by")
      .eq("id", connectionId)
      .single();

    if (fetchErr) {
      if (fetchErr.code === "PGRST116") {
        // No rows found
        throw new Error("Connection not found");
      }
      throw new Error(`Failed to verify connection: ${fetchErr.message}`);
    }

    // Optionally, ensure the user is the owner or admin - for now admin/moderator can delete any
    const { error } = await supabaseServer
      .from("google_sheet_connections")
      .delete()
      .eq("id", connectionId);

    if (error) {
      console.error("[deleteConnection] Database error:", error);
      throw new Error(error.message || "Failed to delete connection");
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
  accessToken?: string
) {
  "use server";

  try {
    const auth = await authorize(accessToken);

    if (!connectionId) {
      throw new Error("connectionId is required");
    }

    // Validate connectionId format
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(connectionId)) {
      throw new Error("Invalid connection ID format");
    }

    // Fetch connection with better error handling
    let conn: any;
    try {
      const { data: connData, error: fetchErr } = await supabaseServer
        .from("google_sheet_connections")
        .select("id, month, year, sheet_url, sheet_name, sheet_tab, sheet_id")
        .eq("id", connectionId)
        .single();

      if (fetchErr) {
        if (fetchErr.code === "PGRST116") {
          throw new Error("Connection not found");
        }
        throw new Error(`Failed to fetch connection: ${fetchErr.message}`);
      }
      conn = connData;
    } catch (error) {
      console.error("[syncConnection] Failed to fetch connection:", error);
      throw error;
    }

    const month: number = Number(conn.month);
    const year: number = Number(conn.year);
    const storedSheetTab = conn.sheet_tab
      ? conn.sheet_tab.toString().trim()
      : null;
    let sheetTab = storedSheetTab;
    const spreadsheetId =
      conn.sheet_id || extractSpreadsheetId(conn.sheet_url || "");

    if (!spreadsheetId) {
      throw new Error("Unable to determine spreadsheetId from URL or sheet_id");
    }

    if (!conn.sheet_id || conn.sheet_id !== spreadsheetId) {
      try {
        await supabaseServer
          .from("google_sheet_connections")
          .update({ sheet_id: spreadsheetId })
          .eq("id", connectionId);
      } catch (persistErr) {
        console.warn(
          "[syncConnection] Failed to persist spreadsheetId:",
          persistErr
        );
      }
    }

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
            await supabaseServer
              .from("google_sheet_connections")
              .update({ sheet_tab: sheetTab })
              .eq("id", connectionId);
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

    // Fetch sheet data with comprehensive error handling
    let values: any[] = [];
    try {
      const range = `${sheetTab}!B1:AZ`;
      const readRes = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range,
        valueRenderOption: "UNFORMATTED_VALUE",
        dateTimeRenderOption: "FORMATTED_STRING",
      });
      values = readRes.data.values || [];
    } catch (error: any) {
      console.error("[syncConnection] Failed to read sheet data:", error);
      if (error.code === 400) {
        throw new Error(
          `Invalid sheet or range. Please check that tab '${sheetTab}' exists and is accessible.`
        );
      } else if (error.code === 403) {
        throw new Error(
          "Access denied. Please ensure the service account has access to this Google Sheet."
        );
      } else if (error.code === 404) {
        throw new Error(
          "Sheet not found. Please check the sheet URL and try again."
        );
      }
      throw new Error(
        `Failed to read sheet data: ${error.message || "Unknown error"}`
      );
    }

    if (!values.length) {
      throw new Error(
        `No data found in tab '${sheetTab}'. Please ensure the sheet contains data.`
      );
    }

    // Validate headers with better error reporting
    const headers = (values[0] || []).map((h: any) =>
      (h ?? "").toString().trim()
    );
    try {
      validateHeaders(headers);
    } catch (error) {
      console.error("[syncConnection] Header validation failed:", error);
      throw new Error(
        `Sheet format validation failed: ${
          error instanceof Error ? error.message : "Invalid headers"
        }`
      );
    }

    // Build index map for quick access
    const idx = headerIndex(headers);

    // Collect rows (skip header) with error handling
    const rows = values.slice(1).filter((r) => {
      try {
        return (r[idx.number] ?? "").toString().trim() !== "";
      } catch (error) {
        console.warn("[syncConnection] Error filtering row:", error);
        return false;
      }
    });

    // Map to normalized objects with error handling
    let sheetRows: any[] = [];
    try {
      sheetRows = rows.map((r, index) => {
        try {
          // pass connection month/year as context so partial dates (e.g. "8/1")
          // are resolved to the correct year/month for this connection
          return mapSheetRow(r, idx, month, year);
        } catch (error) {
          console.warn(
            `[syncConnection] Error mapping row ${index + 2}:`,
            error
          );
          throw new Error(
            `Invalid data in row ${index + 2}: ${
              error instanceof Error ? error.message : "Unknown error"
            }`
          );
        }
      });
    } catch (error) {
      throw error;
    }

    // Filter month in sheetRows if needed; prefer trusting the sheet month
    // We'll still restrict DB queries to month range for safety
    const { start, end } = monthStartEnd(month, year);

    // Fetch existing project lines for these numbers within the month window
    const numbers = Array.from(
      new Set(sheetRows.map((x) => x.telephone_no).filter(Boolean))
    );

    if (numbers.length === 0) {
      throw new Error(
        `No telephone numbers found after parsing tab '${sheetTab}'. Please verify the sheet data.`
      );
    }

    let existingLines: any[] = [];
    try {
      existingLines = await fetchExistingLines(numbers, start, end);
    } catch (error) {
      console.error("[syncConnection] Failed to fetch existing lines:", error);
      throw new Error(
        `Failed to fetch existing data: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }

    const existingByPhone = new Map<string, any>();
    for (const line of existingLines) {
      if (line.telephone_no) existingByPhone.set(line.telephone_no, line);
    }

    // Upsert lines from sheet -> project (prefer bulk; fallback to row-by-row if unique constraint missing)
    const linePayloads = sheetRows.map((row) => ({
      ...sheetToLinePayload(row),
      status: "completed",
    }));

    let upsertedLines: Array<{ id: string; telephone_no: string }> | null =
      null;
    let upsertedCount = 0;

    try {
      const bulkRes = await supabaseServer
        .from("line_details")
        .upsert(linePayloads, { onConflict: "telephone_no,date" })
        .select("id, telephone_no");

      if (bulkRes.error) {
        const msg = (bulkRes.error.message || "").toLowerCase();
        const missingConstraint =
          msg.includes("conflict") && msg.includes("constraint");
        if (!missingConstraint) {
          throw bulkRes.error;
        }

        // Fallback: row-by-row with error handling
        console.log(
          "[syncConnection] Bulk upsert failed, falling back to row-by-row"
        );
        for (let index = 0; index < sheetRows.length; index++) {
          const row = sheetRows[index];
          try {
            const existing = row.telephone_no
              ? existingByPhone.get(row.telephone_no)
              : undefined;
            if (existing) {
              const { error: updErr } = await supabaseServer
                .from("line_details")
                .update(sheetToLinePayload(row))
                .eq("id", existing.id);
              if (updErr) throw updErr;
              upsertedCount++;
              await ensureTaskForLine(existing.id, row);
            } else {
              const insertPayload = {
                ...sheetToLinePayload(row),
                status: "completed",
              };
              const { data: ins, error: insErr } = await supabaseServer
                .from("line_details")
                .insert(insertPayload)
                .select("id")
                .single();
              if (insErr) throw insErr;
              upsertedCount++;
              await ensureTaskForLine(ins!.id, row);
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
      } else {
        upsertedLines = bulkRes.data || [];
        upsertedCount = upsertedLines.length;

        // Ensure tasks exist for all lines (bulk operation) with error handling
        try {
          const telephoneNos = (upsertedLines || [])
            .map((l) => l.telephone_no)
            .filter(Boolean);
          if (telephoneNos.length > 0) {
            const { data: existingTasks, error: taskQueryErr } =
              await supabaseServer
                .from("tasks")
                .select("line_details_id, telephone_no")
                .in("telephone_no", telephoneNos);
            if (taskQueryErr) throw taskQueryErr;

            const existingLineIds = new Set(
              (existingTasks || []).map((t) => t.line_details_id)
            );
            const lineIdMap = new Map<string, string>();
            for (const line of upsertedLines || []) {
              if (line.telephone_no) lineIdMap.set(line.telephone_no, line.id);
            }
            const newTasks = sheetRows
              .filter((row) => {
                const lineId = lineIdMap.get(row.telephone_no);
                return lineId && !existingLineIds.has(lineId);
              })
              .map((row) => {
                const lineId = lineIdMap.get(row.telephone_no)!;
                return {
                  telephone_no: row.telephone_no,
                  dp: row.dp,
                  address: row.address,
                  customer_name: row.name,
                  status: "completed",
                  line_details_id: lineId,
                  task_date: row.date || new Date().toISOString().slice(0, 10),
                  created_by: null,
                };
              });
            if (newTasks.length > 0) {
              const { error: taskInsertErr } = await supabaseServer
                .from("tasks")
                .insert(newTasks);
              if (taskInsertErr) throw taskInsertErr;
            }
          }
        } catch (error) {
          console.error("[syncConnection] Task creation failed:", error);
          // Don't fail the entire sync for task creation issues
          console.warn("Continuing sync despite task creation failure");
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
      const { data: finalLines, error: finalErr } = await supabaseServer
        .from("line_details")
        .select("id, telephone_no")
        .in("telephone_no", numbers)
        .gte("date", start)
        .lte("date", end);
      if (finalErr) throw finalErr;

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

    // Project -> Sheet: append project lines that are missing in the sheet for this month
    let missingInSheet: any[] = [];
    try {
      const { data: monthLines, error: monthErr } = await supabaseServer
        .from("line_details")
        .select("*")
        .gte("date", start)
        .lte("date", end);
      if (monthErr) throw monthErr;

      const sheetNumbersSet = new Set(numbers);
      missingInSheet = (monthLines || []).filter(
        (l: any) => l.telephone_no && !sheetNumbersSet.has(l.telephone_no)
      );

      if (missingInSheet.length > 0) {
        try {
          const appendRows = missingInSheet.map((l) =>
            buildSheetRowFromLine(l, headers)
          );
          // Append starting at column B
          await sheets.spreadsheets.values.append({
            spreadsheetId,
            range: `${sheetTab}!B1`,
            valueInputOption: "USER_ENTERED",
            insertDataOption: "INSERT_ROWS",
            requestBody: { values: appendRows },
          });
        } catch (error) {
          console.error(
            "[syncConnection] Failed to append missing lines to sheet:",
            error
          );
          // Don't fail the entire sync for sheet append issues
          console.warn("Continuing sync despite sheet append failure");
        }
      }
    } catch (error) {
      console.error("[syncConnection] Failed to process missing lines:", error);
      // Don't fail the entire sync for this step
      console.warn("Continuing sync despite missing lines processing failure");
    }

    // Drum Usage: create usage rows for lines that have drum numbers
    let drumUsageInserted = 0;
    let drumsRecalculated = 0;
    try {
      const { data: monthLines, error: monthErr } = await supabaseServer
        .from("line_details")
        .select("*")
        .gte("date", start)
        .lte("date", end);
      if (monthErr) throw monthErr;

      const linesWithDrum = (monthLines || []).filter(
        (l: any) => l.drum_number || l.drum_number_new
      );
      if (linesWithDrum.length) {
        const drumNumbers = Array.from(
          new Set(
            linesWithDrum
              .map((l: any) => l.drum_number || l.drum_number_new)
              .filter(Boolean)
          )
        );
        if (drumNumbers.length) {
          const { data: drums, error: drumsErr } = await supabaseServer
            .from("drum_tracking")
            .select("id, drum_number, item_id, current_quantity, status")
            .in("drum_number", drumNumbers);
          if (drumsErr) throw drumsErr;

          const drumByNumber = new Map<string, any>();
          for (const d of drums || []) drumByNumber.set(d.drum_number, d);

          // Candidate usages
          const candidates = linesWithDrum
            .map((l: any) => {
              const num = l.drum_number || l.drum_number_new;
              const drum = num ? drumByNumber.get(num) : null;
              if (!drum) return null;
              return {
                drum_id: drum.id,
                line_details_id: l.id,
                quantity_used:
                  Number(l.total_cable) ||
                  Math.abs(
                    Number(l.cable_end || 0) - Number(l.cable_start || 0)
                  ) ||
                  0,
                usage_date: l.date,
                cable_start_point: Number(l.cable_start || 0),
                cable_end_point: Number(l.cable_end || 0),
              };
            })
            .filter(Boolean) as Array<{
            drum_id: string;
            line_details_id: string;
            quantity_used: number;
            usage_date: string;
            cable_start_point: number;
            cable_end_point: number;
          }>;

          if (candidates.length) {
            // Avoid duplicates by existing line_details_id
            const ids = candidates.map((c) => c.line_details_id);
            const { data: existingUsages, error: existErr } =
              await supabaseServer
                .from("drum_usage")
                .select("line_details_id")
                .in("line_details_id", ids);
            if (existErr) throw existErr;
            const existingSet = new Set(
              (existingUsages || []).map((u: any) => u.line_details_id)
            );
            const toInsert = candidates.filter(
              (c) => !existingSet.has(c.line_details_id)
            );

            if (toInsert.length) {
              const { error: insDUerr } = await supabaseServer
                .from("drum_usage")
                .insert(toInsert);
              if (insDUerr) throw insDUerr;
              drumUsageInserted = toInsert.length;

              // Recalculate current quantities per drum using smart wastage
              const affectedDrumIds = Array.from(
                new Set(toInsert.map((c) => c.drum_id))
              );
              for (const drumId of affectedDrumIds) {
                const drum = (drums || []).find((d: any) => d.id === drumId);
                if (!drum) continue;
                // Get drum capacity from inventory_items via item_id
                let capacity = 0;
                if (drum.item_id) {
                  const { data: item, error: itemErr } = await supabaseServer
                    .from("inventory_items")
                    .select("drum_size")
                    .eq("id", drum.item_id)
                    .single();
                  if (!itemErr && item?.drum_size)
                    capacity = Number(item.drum_size) || 0;
                }

                // Fetch all usages for this drum
                const { data: usages, error: uErr } = await supabaseServer
                  .from("drum_usage")
                  .select("id, cable_start_point, cable_end_point, usage_date")
                  .eq("drum_id", drumId);
                if (uErr) continue;

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
                    drum.status
                  );
                  // Update current_quantity to reflect calculated current
                  await supabaseServer
                    .from("drum_tracking")
                    .update({
                      current_quantity: result.calculatedCurrentQuantity,
                    })
                    .eq("id", drumId);
                  drumsRecalculated++;
                }
              }
            }
          }
        }
      }
    } catch (e) {
      console.warn("Drum usage sync skipped:", (e as Error).message);
    }

    // Also process the 'Drum Number' tab bidirectionally if present
    let drumProcessed = 0;
    let drumAppended = 0;
    try {
      const drumTab = "Drum Number";
      const drumRange = `${drumTab}!B1:AZ`;
      const drumRes = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: drumRange,
        valueRenderOption: "UNFORMATTED_VALUE",
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

        // Build a telephone_no -> latest line mapping for this month window
        const { data: monthLines, error: monthErr } = await supabaseServer
          .from("line_details")
          .select("*")
          .gte("date", start)
          .lte("date", end);
        if (monthErr) throw monthErr;

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
          if (r.dw_dp) update.dp = r.dw_dp;
          if (typeof r.dw_c_hook === "number") update.c_hook = r.dw_c_hook;
          if (r.dw_cus) update.name = r.dw_cus;
          if (r.drum_number) update.drum_number = r.drum_number;
          updates.push(update);
        }

        if (updates.length > 0) {
          const { error: updErr } = await supabaseServer
            .from("line_details")
            .upsert(updates, { onConflict: "id" });
          if (updErr) throw updErr;
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
      }
    } catch (e) {
      // If tab is missing or validation fails, don't fail the entire sync
      console.warn("Drum Number tab sync skipped:", (e as Error).message);
    }

    // Update connection status
    const now = new Date().toISOString();
    const totalProcessed =
      sheetRows.length +
      missingInSheet.length +
      drumProcessed +
      drumAppended +
      drumUsageInserted;

    try {
      const { data, error: updateErr } = await supabaseServer
        .from("google_sheet_connections")
        .update({
          last_synced: now,
          status: "active",
          record_count: totalProcessed,
        })
        .eq("id", connectionId)
        .select("id, last_synced, status, record_count")
        .single();

      if (updateErr) {
        console.error(
          "[syncConnection] Failed to update sync status:",
          updateErr
        );
        throw new Error(updateErr.message || "Failed to update sync status");
      }

      return {
        connection: data,
        upserted: upsertedCount,
        appended: missingInSheet.length,
        drumProcessed,
        drumAppended,
        drumUsageInserted,
        drumsRecalculated,
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
      await supabaseServer
        .from("google_sheet_connections")
        .update({
          status: "error",
          last_synced: new Date().toISOString(),
        })
        .eq("id", connectionId);
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

// Normalize telephone numbers from sheet -> project
// - If contains any letters, return as-is (no changes)
// - Otherwise, strip non-digits, and if length < 10 and doesn't start with '034', prefix '034'
//   (common case: 7-digit local numbers need area code '034' to reach 10 digits)
function normalizeTelephone(raw: any): string {
  const s = (raw ?? "").toString().trim();
  if (/[a-zA-Z]/.test(s)) return s; // leave values with letters unchanged
  const digits = s.replace(/\D+/g, "");
  if (!digits) return s; // nothing to normalize
  if (digits.length < 10 && !digits.startsWith("034")) {
    return `034${digits}`;
  }
  return digits;
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
  const normalizedNumber = normalizeTelephone(rawNumber);
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

function sheetToLinePayload(r: any) {
  // Payload matches line_details columns
  const payload: any = {
    date: r.date || new Date().toISOString().slice(0, 10),
    telephone_no: r.telephone_no,
    phone_number: r.telephone_no,
    dp: r.dp,
    power_dp: r.power_dp,
    power_inbox: r.power_inbox,
    name: r.name,
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

async function fetchExistingLines(
  numbers: string[],
  startISO: string,
  endISO: string
) {
  if (!numbers.length) return [] as any[];
  const { data, error } = await supabaseServer
    .from("line_details")
    .select("id, telephone_no, date")
    .in("telephone_no", numbers)
    .gte("date", startISO)
    .lte("date", endISO);
  if (error) throw error;
  return data || [];
}

async function ensureTaskForLine(lineId: string, r: any) {
  // Check if a task exists for this line
  const { data: existingTask, error: taskErr } = await supabaseServer
    .from("tasks")
    .select("id")
    .eq("line_details_id", lineId)
    .maybeSingle();
  if (taskErr) throw taskErr;
  if (existingTask?.id) return existingTask;

  // Create completed task
  const { data: created, error: insErr } = await supabaseServer
    .from("tasks")
    .insert({
      telephone_no: r.telephone_no,
      dp: r.dp,
      address: r.address,
      customer_name: r.name,
      status: "completed",
      line_details_id: lineId,
      task_date: r.date || new Date().toISOString().slice(0, 10),
      created_by: null,
    })
    .select("id")
    .single();
  if (insErr) throw insErr;
  return created;
}

function buildSheetRowFromLine(l: any, headers: string[]): any[] {
  const idx = headerIndex(headers);
  const row = new Array(headers.length);

  // Map line fields back to sheet columns
  row[idx.date] = l.date;
  row[idx.number] = l.telephone_no;
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
    tp: normalizeTelephone((row[idx.tp] ?? "").toString().trim()),
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
  row[idx.tp] = l.telephone_no;
  row[idx.dw_dp] = l.dp;
  row[idx.dw_c_hook] = l.c_hook;
  row[idx.dw_cus] = l.name;
  row[idx.drum_number] = l.drum_number ?? l.drum_number_new ?? "";
  return row;
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
  "use server";

  try {
    const connectionId = String(formData.get("connectionId") || "");
    const accessToken = formData.get("sb_access_token")
      ? String(formData.get("sb_access_token"))
      : undefined;

    if (!connectionId) {
      throw new Error("connectionId is required");
    }

    const result = await deleteConnection(connectionId, accessToken);

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
  "use server";

  try {
    const connectionId = String(formData.get("connectionId") || "");
    const accessToken = formData.get("sb_access_token")
      ? String(formData.get("sb_access_token"))
      : undefined;

    if (!connectionId) {
      throw new Error("connectionId is required");
    }

    const result = await syncConnection(connectionId, accessToken);

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
export async function checkIntegrationEnv(accessToken?: string) {
  "use server";

  try {
    // ensure caller is authorized
    await authorize(accessToken);

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

    result.SUPABASE_SERVICE_ROLE_KEY_present = Boolean(
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    result.NEXT_PUBLIC_SUPABASE_ANON_KEY_present = Boolean(
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );
    result.NEXT_PUBLIC_SUPABASE_URL_present = Boolean(
      process.env.NEXT_PUBLIC_SUPABASE_URL
    );

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
