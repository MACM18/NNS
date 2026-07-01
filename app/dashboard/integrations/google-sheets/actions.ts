"use server";

import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { google } from "googleapis";
import { calculateSmartWastage } from "@/lib/drum-wastage-calculator";
import { updateInventoryFromSheetSync } from "@/lib/inventory-usage-service";
import {
  ensureDrumsExistWithHistory,
  recalculateDrumWithHistory,
} from "@/lib/drum-tracking-service";
import { checkStockLevelsAndNotify, notifyAllAdmins } from "@/lib/notification-service-server";

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
  const skippedRows: any[] = [];
  try {
    const progress = (m: string) => {
      try {
        onProgress?.(m);
      } catch { }
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
    const primaryRange = `'${sheetTab}'!A1:AZ`;
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
    
    const parsedRows: any[] = [];
    for (let i = 0; i < values.slice(1).length; i++) {
      const r = values[i + 1];
      const rowNum = i + 2;
      const rawNumber = r[idx.number];
      const normalizedPhone = normalizeTelephoneCanonical(rawNumber);

      if (!rawNumber || !rawNumber.toString().trim()) {
        skippedRows.push({
          rowNum,
          telephoneNo: "",
          name: (r[idx.name] ?? "").toString().trim(),
          status: "skipped",
          reason: "Telephone number cell is empty"
        });
        continue;
      }

      if (!normalizedPhone) {
        skippedRows.push({
          rowNum: rowNum,
          telephoneNo: rawNumber.toString().trim(),
          name: (r[idx.name] ?? "").toString().trim(),
          status: "skipped",
          reason: `Invalid telephone number format (raw: "${rawNumber}")`
        });
        continue;
      }

      const mapped = mapSheetRow(r, idx, month, year);
      parsedRows.push({ rowNum, mapped });
    }

    const sheetRows = parsedRows.map((p) => p.mapped);

    if (!sheetRows.length) {
      throw new Error("No valid rows with telephone numbers found");
    }

    // Upsert lines into database (one-way sync: Sheet → DB)
    progress("Syncing data to database");
    let insertedCount = 0;
    let updatedCount = 0;
    const lineIds: string[] = [];

    // Define month start/end for duplicate checking
    const syncMonthStart = new Date(Date.UTC(year, month - 1, 1));
    const syncMonthEnd = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

    for (const { rowNum, mapped } of parsedRows) {
      const payload = sheetToLinePayload(mapped);
      if (!payload) {
        skippedRows.push({
          rowNum,
          telephoneNo: mapped.telephone_no,
          name: mapped.name,
          status: "skipped",
          reason: "Failed to build line payload (unknown validation error)"
        });
        continue;
      }

      // Check if line exists for this phone within the current month
      const existing = await prisma.lineDetails.findFirst({
        where: {
          telephoneNo: payload.telephoneNo,
          date: {
            gte: syncMonthStart,
            lte: syncMonthEnd,
          },
        },
        select: { id: true, date: true, name: true, dp: true },
      });

      if (existing) {
        // Enforce latest date rule: use the later of the two dates
        const existingDate = new Date(existing.date);
        const newDate = new Date(payload.date);
        const finalDate =
          existingDate.getTime() > newDate.getTime() ? existingDate : newDate;

        // Update existing record with payload but keep the latest date
        await prisma.lineDetails.update({
          where: { id: existing.id },
          data: {
            ...payload,
            date: finalDate,
          },
        });
        lineIds.push(existing.id);
        updatedCount++;

        skippedRows.push({
          rowNum,
          telephoneNo: payload.telephoneNo,
          name: payload.name,
          status: "updated",
          reason: `Telephone number already existed in this month. Updated existing record instead of inserting.`
        });
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

    // Sync the "Drum Number" sheet tab if it exists
    let drumProcessed = 0;
    let drumAppended = 0;
    try {
      const drumTab = "Drum Number";
      if (availableTabs.includes(drumTab)) {
        progress("Syncing Drum Number sheet tab");
        const drumRange = `'${drumTab}'!A1:AZ`; // Safe quote for sheet tab with spaces and include column A
        const drumRes = await sheets.spreadsheets.values.get({
          spreadsheetId,
          range: drumRange,
          valueRenderOption: "UNFORMATTED_VALUE",
          dateTimeRenderOption: "FORMATTED_STRING",
        });

        const drumValues = drumRes.data.values || [];
        if (drumValues.length > 0) {
          const drumHeaders = (drumValues[0] || []).map((h: any) =>
            (h ?? "").toString().trim()
          );
          validateDrumHeaders(drumHeaders);
          const dIdx = headerIndexDrum(drumHeaders);

          const drumRowsRawIndexMap = new Map<any, number>();
          const drumRows: any[] = [];

          for (let i = 0; i < drumValues.slice(1).length; i++) {
            const r = drumValues[i + 1];
            const rowNum = i + 2;
            const tp = normalizeTelephoneCanonical(r[dIdx.tp]);
            if (r[dIdx.tp] !== undefined && tp) {
              const mapped = mapDrumRow(r, dIdx);
              drumRows.push(mapped);
              drumRowsRawIndexMap.set(mapped, rowNum);
            } else {
              skippedRows.push({
                rowNum,
                telephoneNo: (r[dIdx.tp] ?? "").toString().trim(),
                name: (r[dIdx.dw_cus] ?? "").toString().trim(),
                status: "skipped",
                reason: "Drum sheet row: telephone number TP is empty or invalid"
              });
            }
          }

          // Fetch all lines for this month (to map by telephone number)
          const syncMonthStart = new Date(Date.UTC(year, month - 1, 1));
          const syncMonthEnd = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));
          const currentMonthLines = await prisma.lineDetails.findMany({
            where: {
              date: {
                gte: syncMonthStart,
                lte: syncMonthEnd,
              },
            },
            select: {
              id: true,
              telephoneNo: true,
              date: true,
              dp: true,
              cHook: true,
              name: true,
              drumNumber: true,
              drumNumberNew: true,
            },
          });

          // Group lines by telephone number
          const linesByPhone = new Map<string, typeof currentMonthLines>();
          for (const l of currentMonthLines) {
            if (!l.telephoneNo) continue;
            const arr = linesByPhone.get(l.telephoneNo) || [];
            arr.push(l);
            linesByPhone.set(l.telephoneNo, arr);
          }

          const pickLatest = (arr: typeof currentMonthLines) => {
            return [...arr].sort(
              (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
            )[0];
          };

          // Update lines in the DB based on the Drum Number sheet rows
          for (const r of drumRows) {
            const arr = linesByPhone.get(r.tp);
            if (!arr || arr.length === 0) continue;
            const target = pickLatest(arr);

            const updateData: any = {};
            if (r.dw_dp) {
              if (isValidDP(r.dw_dp)) {
                updateData.dp = r.dw_dp;
              } else {
                skippedRows.push({
                  rowNum: drumRowsRawIndexMap.get(r) ?? 0,
                  telephoneNo: r.tp,
                  name: r.dw_cus,
                  status: "warning",
                  reason: `Ignored invalid DP format from Drum sheet: "${r.dw_dp}"`
                });
              }
            }
            if (typeof r.dw_c_hook === "number" && r.dw_c_hook > 0) {
              updateData.cHook = r.dw_c_hook;
            }
            if (r.dw_cus) {
              if (isValidName(r.dw_cus)) {
                updateData.name = r.dw_cus;
              } else {
                skippedRows.push({
                  rowNum: drumRowsRawIndexMap.get(r) ?? 0,
                  telephoneNo: r.tp,
                  name: r.dw_cus,
                  status: "warning",
                  reason: `Ignored invalid Customer Name format from Drum sheet: "${r.dw_cus}"`
                });
              }
            }
            if (r.drum_number) {
              updateData.drumNumber = r.drum_number;
            }

            if (Object.keys(updateData).length > 0) {
              await prisma.lineDetails.update({
                where: { id: target.id },
                data: updateData,
              });
              drumProcessed++;
            }
          }

          // Bidirectional: append lines from DB that are missing in the Drum Number sheet
          const drumTPs = new Set(
            drumRows.map((r) => r.tp).filter(Boolean)
          );
          const missingInDrum = currentMonthLines.filter(
            (l) => l.telephoneNo && !drumTPs.has(l.telephoneNo)
          );

          if (missingInDrum.length > 0) {
            const drumAppendRows = missingInDrum.map((l) =>
              buildDrumSheetRowFromLine(l, drumHeaders)
            );
            await sheets.spreadsheets.values.append({
              spreadsheetId,
              range: `'${drumTab}'!A1`,
              valueInputOption: "USER_ENTERED",
              insertDataOption: "INSERT_ROWS",
              requestBody: { values: drumAppendRows },
            });
            drumAppended = drumAppendRows.length;
          }
        }
      }
    } catch (drumSheetError) {
      console.error(
        "[syncConnection] Drum Number tab sync error:",
        drumSheetError
      );
      progress("Warning: Drum Number tab sync failed");
    }

    // Process drum tracking and inventory management with enhanced tracking
    let drumUsageProcessed = 0;
    let drumUpdated = 0;
    let drumsCreated = 0;
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

        // Ensure drum tracking records exist with history
        const drumMap = await ensureDrumsExistWithHistory(
          drumNumbers,
          connectionId
        );
        drumsCreated = Array.from(drumMap.values()).filter(
          (d) => d.isNew
        ).length;

        // Process each line's drum usage
        for (const line of monthLines) {
          if (!line.drumNumber) continue;

          const drumInfo = drumMap.get(line.drumNumber);
          if (!drumInfo) continue;

          const quantityUsed = computeQuantityUsed(line);
          if (quantityUsed <= 0) continue;

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

        // Recalculate drum quantities with history tracking
        const drumIds = Array.from(drumMap.values()).map((d) => d.id);
        for (const drumId of drumIds) {
          await recalculateDrumWithHistory(drumId, connectionId);
          drumUpdated++;
        }

        progress(
          `Processed ${drumUsageProcessed} usages, created ${drumsCreated} drums, updated ${drumUpdated} drums`
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

    // Check stock levels and trigger alerts
    try {
      await checkStockLevelsAndNotify();
    } catch (stockErr) {
      console.error("[syncConnection] Stock check failed:", stockErr);
    }

    // Notify admins of successful sync
    try {
      await notifyAllAdmins({
        title: "Google Sheets Sync Successful",
        message: `Google Sheets sync completed for ${conn.month}/${conn.year}. Appended ${insertedCount} new rows, updated ${updatedCount} rows, and updated ${hardwareUpdated} inventory items.`,
        type: "success",
        category: "system",
        actionUrl: "/dashboard/integrations",
      });
    } catch (notifyErr) {
      console.error("[syncConnection] Success notification failed:", notifyErr);
    }
    // Write log to DB
    try {
      await prisma.googleSheetSyncLog.create({
        data: {
          connectionId,
          status: skippedRows.some((r) => r.status === "warning") ? "warning" : "success",
          message: `Successfully synced Google Sheet connection for ${conn.month}/${conn.year}.`,
          details: {
            totalParsedRows: parsedRows.length,
            insertedCount,
            updatedCount,
            drumUsageProcessed,
            drumsCreated,
            drumUpdated,
            hardwareUpdated,
            hardwareCreated,
            usageRecordsUpdated,
            drumSheetProcessed: drumProcessed,
            drumSheetAppended: drumAppended,
          },
          skippedRows,
        },
      });
    } catch (logErr) {
      console.error("[syncConnection] Failed to save sync log:", logErr);
    }

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
      drumSheetProcessed: drumProcessed,
      drumSheetAppended: drumAppended,
    };
  } catch (error) {
    console.error("[syncConnection] Error:", error);

    // Try to update connection status to error state and log failure
    try {
      await prisma.googleSheetConnection.update({
        where: { id: connectionId },
        data: { status: "error", lastSynced: new Date() },
      });

      await prisma.googleSheetSyncLog.create({
        data: {
          connectionId,
          status: "failed",
          message: error instanceof Error ? error.message : String(error),
          details: {},
          skippedRows,
        },
      });
    } catch (statusError) {
      console.error(
        "[syncConnection] Failed to update error status or log sync failure:",
        statusError
      );
    }

    // Notify admins of sync error
    try {
      const errorMsg = error instanceof Error ? error.message : String(error);
      await notifyAllAdmins({
        title: "Google Sheets Sync Failed",
        message: `Sync failed with error: ${errorMsg}`,
        type: "error",
        category: "system",
        actionUrl: "/dashboard/integrations",
        sendEmailAlert: true,
      });
    } catch (notifyErr) {
      console.error("[syncConnection] Error notification failed:", notifyErr);
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
      `Google Sheets API authentication failed: ${error instanceof Error ? error.message : "Unknown error"
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
  const lower = headers.map((h) =>
    (h ?? "").toString().toLowerCase().replace(/\s+/g, " ").trim()
  );
  const req = requiredHeaders();
  for (const h of req) {
    const cleanReq = h.toLowerCase().replace(/\s+/g, " ").trim();
    const alt = h === "Address" ? ["addras", "address"] : [cleanReq];
    const ok = alt.some((a) => lower.includes(a));
    if (!ok) {
      throw new Error(`Missing required column '${h}' in sheet header`);
    }
  }
}

function headerIndex(headers: string[]) {
  const mapLower: Record<string, number> = {};
  headers.forEach((h, i) => {
    const clean = (h ?? "").toString().toLowerCase().replace(/\s+/g, " ").trim();
    mapLower[clean] = i;
  });

  const pick = (name: string, alts: string[] = []) => {
    const candidates = [name, ...alts];
    for (const c of candidates) {
      const clean = c.toLowerCase().replace(/\s+/g, " ").trim();
      const idx = mapLower[clean];
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
    drum_number: pick("Drum Number", ["Drum No", "Drum", "Drum #", "DRUM NUMBER"]),
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
  } catch { }

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

  // Calculate F1, G1, and total (using absolute differences)
  const cableStart = Number(r.cable_start || 0);
  const cableMiddle = Number(r.cable_middle || 0);
  const cableEnd = Number(r.cable_end || 0);
  const f1 = Math.abs(cableMiddle - cableStart);
  const g1 = Math.abs(cableEnd - cableMiddle);
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
    const f1 = Math.abs(middle - start);
    const g1 = Math.abs(end - middle);
    const total = f1 + g1;
    if (Number.isFinite(total) && total > 0) return total;
  }

  // If middle is missing but start and end exist, use absolute difference as fallback
  if (Number.isFinite(end) && Number.isFinite(start)) {
    const fallback = Math.abs(end - start);
    if (fallback > 0) return fallback;
  }

  return 0;
}

// Exported function to recalculate all drum quantities using the new service
export async function recalculateAllDrumQuantities() {
  try {
    await authorize();

    const drums = await prisma.drumTracking.findMany({
      select: { id: true },
    });

    if (!drums.length) {
      return { success: true, recalculated: 0 };
    }

    let recalculated = 0;
    for (const drum of drums) {
      await recalculateDrumWithHistory(drum.id, undefined);
      recalculated++;
    }

    return { success: true, recalculated };
  } catch (error) {
    console.error("[recalculateAllDrumQuantities] Error:", error);
    throw error instanceof Error
      ? error
      : new Error("Unknown error occurred while recalculating drum quantities");
  }
}

// ==========================================
// DRUM SHEET TAB HELPER FUNCTIONS
// ==========================================

function requiredDrumHeaders(): string[] {
  return [
    "NO",
    "TP",
    "DW DP",
    "DW C HOOK",
    "DW CUS",
    "DRUM NUMBER",
  ];
}

function validateDrumHeaders(headers: string[]) {
  const lower = headers.map((h) =>
    (h ?? "").toString().toLowerCase().replace(/\s+/g, " ").trim()
  );
  for (const h of requiredDrumHeaders()) {
    const clean = h.toLowerCase().replace(/\s+/g, " ").trim();
    if (!lower.includes(clean)) {
      throw new Error(`Missing required column '${h}' in Drum Number header`);
    }
  }
}

function headerIndexDrum(headers: string[]) {
  const mapLower: Record<string, number> = {};
  headers.forEach((h, i) => {
    const clean = (h ?? "").toString().toLowerCase().replace(/\s+/g, " ").trim();
    mapLower[clean] = i;
  });
  const pick = (name: string) => {
    const clean = name.toLowerCase().replace(/\s+/g, " ").trim();
    return mapLower[clean] ?? -1;
  };
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
    tp: normalizeTelephoneCanonical(row[idx.tp]),
    dw_dp: (row[idx.dw_dp] ?? "").toString().trim(),
    dw_c_hook: toNumber(row[idx.dw_c_hook]),
    dw_cus: (row[idx.dw_cus] ?? "").toString().trim(),
    drum_number: (row[idx.drum_number] ?? "").toString().trim(),
  };
}

function buildDrumSheetRowFromLine(l: any, headers: string[]): any[] {
  const idx = headerIndexDrum(headers);
  const row = new Array(headers.length);
  row[idx.tp] = l.telephoneNo;
  row[idx.dw_dp] = l.dp;
  row[idx.dw_c_hook] = l.cHook ?? 1;
  row[idx.dw_cus] = l.name;
  row[idx.drum_number] = l.drumNumber ?? l.drumNumberNew ?? "";
  return row;
}

function isValidName(val: string): boolean {
  const clean = val.trim();
  if (!clean) return false;
  // Must contain at least one letter (a-z, A-Z)
  if (!/[a-zA-Z]/.test(clean)) return false;
  // Must not look like a phone number (e.g. contains 7+ digits)
  const digitCount = clean.replace(/\D/g, "").length;
  if (digitCount >= 7) return false;
  // Must not be a placeholder
  const lower = clean.toLowerCase();
  if (["n/a", "na", "none", "null", "undefined", "no", "yes", "-"].includes(lower)) return false;
  return true;
}

function isValidDP(val: string): boolean {
  const clean = val.trim();
  if (!clean) return false;
  // Must contain at least one letter (DPs are like DP-xx, HR-PKJ-xxx etc.)
  if (!/[a-zA-Z]/.test(clean)) return false;
  // Must not look like a phone number
  const digitCount = clean.replace(/\D/g, "").length;
  if (digitCount >= 7) return false;
  // Must not be a placeholder
  const lower = clean.toLowerCase();
  if (["n/a", "na", "none", "null", "undefined", "-"].includes(lower)) return false;
  return true;
}

