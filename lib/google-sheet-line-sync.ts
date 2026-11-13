import "server-only";
import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { currentSheetPeriod } from "@/lib/google-sheet-auto-sync";
import { getGoogleSheetsClient } from "@/lib/google-sheets-client";

export const SHEET_LINE_FIELDS = [
  "date", "telephoneNo", "dp", "powerDp", "powerInbox", "name", "address",
  "cableStart", "cableMiddle", "cableEnd", "retainers", "lHook", "topBolt",
  "cHook", "fiberRosette", "internalWire", "sRosette", "fac", "casing",
  "cTie", "cClip", "conduit", "tagTie", "ont", "voiceTestNo", "stb",
  "flexible", "rj45", "cat5", "pole67", "pole", "concreteNail", "rollPlug",
  "uClip", "socket", "bend", "rj11", "rj12", "nutBolt", "screwNail", "drumNumber",
] as const;

type LineField = typeof SHEET_LINE_FIELDS[number];
type Snapshot = Record<string, string | number | null>;
const HEADERS: Partial<Record<LineField, string[]>> = {
  date: ["Date"], telephoneNo: ["Number"], dp: ["DP"], powerDp: ["Power (DP)"],
  powerInbox: ["Power (inbox)"], name: ["Name"], address: ["Address", "Addras"],
  cableStart: ["Cable Start"], cableMiddle: ["Cable Middle"], cableEnd: ["Cable End"],
  retainers: ["Retainers"], lHook: ["L-Hook"], topBolt: ["Top-Bolt"], cHook: ["C-Hook"],
  fiberRosette: ["Fiber-rosatte", "Fiber-rosette"], internalWire: ["Internal Wire"],
  sRosette: ["S-Rosette"], fac: ["FAC"], casing: ["Casing"], cTie: ["C-Tie"],
  cClip: ["C-Clip"], conduit: ["Conduit"], tagTie: ["Tag Tie"], ont: ["ONT"],
  voiceTestNo: ["Voice Test Number"], stb: ["STB"], flexible: ["Flexible"],
  rj45: ["RJ 45"], cat5: ["Cat 5"], pole67: ["Pole-6.7"], pole: ["Pole-5.6"],
  concreteNail: ["Concrete nail"], rollPlug: ["Roll Plug"], uClip: ["U-Clip"],
  socket: ["Socket"], bend: ["Bend"], rj11: ["RJ 11"], rj12: ["RJ 12"],
  nutBolt: ["Nut&Bolt", "Nut Bolt"], screwNail: ["Screw Nail", "Screw Nail 1 1/2"],
  drumNumber: ["Drum Number", "Drum No", "Drum", "Drum #"],
};
const REQUIRED_ROW_FIELDS: LineField[] = ["date", "telephoneNo", "dp", "powerDp", "powerInbox", "name", "address"];
const FORMULA_COLUMNS = new Set([11, 12, 13]); // L-N are maintained by the template.
const APP_ROW_ID_COLUMN = 45; // AT is reserved for the app's hidden, stable row ID.

const normalized = (value: unknown) => value == null ? "" : String(value).trim();
const phoneKey = (value: unknown) => {
  const raw = normalized(value);
  if (/[a-z]/i.test(raw)) return raw.toUpperCase();
  const digits = raw.replace(/\D/g, "");
  return digits.length === 9 ? `0${digits}` : digits.length === 7 ? `034${digits}` : digits;
};
const equal = (a: unknown, b: unknown) => normalized(a) === normalized(b) ||
  (normalized(a) !== "" && normalized(b) !== "" && Number.isFinite(Number(a)) && Number.isFinite(Number(b)) && Number(a) === Number(b));
const fieldEqual = (field: string, a: unknown, b: unknown) => field === "telephoneNo" ? phoneKey(a) === phoneKey(b) : equal(a, b);

export function lineSnapshot(line: Record<string, any>): Snapshot {
  const result: Snapshot = {};
  for (const field of SHEET_LINE_FIELDS) {
    const value = line[field];
    result[field] = field === "date"
      ? value instanceof Date ? value.toISOString().slice(0, 10) : String(value || "").slice(0, 10)
      : value instanceof Prisma.Decimal ? Number(value) : typeof value === "number" ? value : value == null ? null : String(value);
  }
  return result;
}

export function changedLineFields(a: Snapshot, b: Snapshot) {
  return SHEET_LINE_FIELDS.filter((field) => !fieldEqual(field, a[field], b[field]));
}

export function snapshotBaseline(value: unknown): Snapshot {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Snapshot : {};
}

export function canRemoveMissingSheetLine(state: { origin: string; appTouched: boolean; status: string; baseline: unknown }, line: Record<string, any>) {
  return state.origin === "sheet" && !state.appTouched && state.status === "synced" &&
    changedLineFields(snapshotBaseline(state.baseline), lineSnapshot(line)).length === 0;
}

export async function currentConnectionForDate(date: Date, db: any = prisma) {
  const settings = await db.googleSheetSyncSettings.findUnique({ where: { id: "default" }, select: { timeZone: true } });
  const clock = currentSheetPeriod(settings?.timeZone || "Asia/Colombo");
  if (date.getUTCFullYear() !== clock.year || date.getUTCMonth() + 1 !== clock.month) return null;
  return db.googleSheetConnection.findFirst({
    where: { year: clock.year, month: clock.month, status: "active" },
    orderBy: [{ autoSyncEnabled: "desc" }, { createdAt: "desc" }],
    select: { id: true, sheetId: true, sheetUrl: true },
  });
}

export async function queueLineWrite(lineId: string, fields?: string[], db: any = prisma) {
  const line = await db.lineDetails.findUnique({ where: { id: lineId }, select: { id: true, date: true, sourceSheetConnectionId: true } });
  if (!line) return null;
  const connection = await currentConnectionForDate(line.date, db);
  if (!connection) return null;
  const prior = await db.googleSheetLineSync.findUnique({ where: { lineId } });
  const switchedConnection = Boolean(prior && prior.connectionId !== connection.id);
  const mappedFields = switchedConnection || !fields ? [...SHEET_LINE_FIELDS, "wastage"]
    : fields.filter((field) => SHEET_LINE_FIELDS.includes(field as LineField) || field === "wastage");
  const pendingFields = [...new Set([...(switchedConnection ? [] : prior?.pendingFields || []), ...mappedFields])];
  const data = {
    connectionId: connection.id,
    appTouched: true,
    ...(switchedConnection ? { sheetRow: null, baseline: {}, drumBaseline: {}, conflictFields: [] } : {}),
    ...(mappedFields.length ? {
      status: prior?.status === "review" && !switchedConnection ? "review" : "pending",
      pendingOperation: prior?.status === "review" && !switchedConnection ? prior.pendingOperation : "upsert",
      pendingFields,
      lastError: prior?.status === "review" && !switchedConnection ? prior.lastError : null,
    } : {}),
  };
  await db.googleSheetLineSync.upsert({
    where: { lineId },
    create: { lineId, origin: line.sourceSheetConnectionId ? "legacy_unknown" : "app", revision: 1, ...data },
    update: { ...data, revision: { increment: 1 } },
  });
  return connection.id;
}

export async function queueLineDeletion(lineId: string, db: any = prisma) {
  const state = await db.googleSheetLineSync.findUnique({ where: { lineId } });
  if (!state) {
    const line = await db.lineDetails.findUnique({ where: { id: lineId } });
    if (!line) return;
    const connection = line.sourceSheetConnectionId
      ? await db.googleSheetConnection.findUnique({ where: { id: line.sourceSheetConnectionId } })
      : await currentConnectionForDate(line.date, db);
    if (!connection) return;
    await db.googleSheetLineSync.create({ data: {
      lineId, connectionId: connection.id, origin: line.sourceSheetConnectionId ? "legacy_unknown" : "app",
      baseline: lineSnapshot(line), appTouched: true, status: "review",
      pendingOperation: "delete", conflictFields: ["sheet_row"], revision: 1,
      lastError: "App deletion awaits manager confirmation before clearing a possible sheet row",
    } });
    return;
  }
  await db.googleSheetLineSync.update({ where: { lineId }, data: {
    appTouched: true, status: "review", pendingOperation: "delete", conflictFields: ["sheet_row"], revision: { increment: 1 },
  } });
}

function columnName(index: number) {
  let n = index + 1;
  let result = "";
  while (n > 0) { n--; result = String.fromCharCode(65 + n % 26) + result; n = Math.floor(n / 26); }
  return result;
}

function columnIndex(headers: unknown[], field: LineField) {
  const names = HEADERS[field] || [];
  return headers.findIndex((value) => names.some((name) => normalized(value).toLowerCase().replace(/\s+/g, " ") === name.toLowerCase()));
}

function requiredAllColumns(headers: unknown[]) {
  const columns = new Map<LineField, number>();
  for (const field of REQUIRED_ROW_FIELDS) {
    const index = columnIndex(headers, field);
    if (index < 0) throw new Error(`The All tab is missing the required ${HEADERS[field]?.[0] || field} column`);
    columns.set(field, index);
  }
  return columns;
}

function isBlank(value: unknown) {
  return normalized(value) === "";
}

function isAvailableAllRow(row: unknown[], requiredColumns: Map<LineField, number>) {
  if (!REQUIRED_ROW_FIELDS.every((field) => isBlank(row[requiredColumns.get(field)!]))) return false;
  if (!isBlank(row[APP_ROW_ID_COLUMN])) return false;

  // A key-field-empty row may still contain a partially entered record in another
  // input column. Skip that row, but allow serial numbers and template formulas.
  for (let column = 1; column < APP_ROW_ID_COLUMN; column++) {
    if (FORMULA_COLUMNS.has(column)) continue;
    if (!isBlank(row[column])) return false;
  }
  return true;
}

function sheetDateKey(value: unknown, month: number, year: number) {
  const raw = normalized(value);
  const numeric = typeof value === "number" ? value : Number(raw);
  if (Number.isFinite(numeric) && numeric > 30000) {
    const date = new Date(Date.UTC(1899, 11, 30) + Math.round(numeric) * 86400000);
    return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  if (/^\d{1,2}$/.test(raw)) {
    const day = Number(raw);
    return day >= 1 && day <= 31 ? new Date(Date.UTC(year, month - 1, day)).toISOString().slice(0, 10) : "";
  }
  const twoPart = raw.match(/^(\d{1,2})[/-](\d{1,2})$/);
  if (twoPart) {
    const first = Number(twoPart[1]);
    const second = Number(twoPart[2]);
    const day = first <= 31 && second === month ? first : second <= 31 && first === month ? second : first;
    return day >= 1 && day <= 31 ? new Date(Date.UTC(year, month - 1, day)).toISOString().slice(0, 10) : "";
  }
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? "" : parsed.toISOString().slice(0, 10);
}

function firstAvailableAllRow(rows: unknown[][], requiredColumns: Map<LineField, number>) {
  for (let index = 1; index < rows.length; index++) {
    if (isAvailableAllRow(rows[index] || [], requiredColumns)) return index + 1;
  }
  return null;
}

function lastUsedAllRow(rows: unknown[][]) {
  for (let index = rows.length - 1; index >= 1; index--) {
    const row = rows[index] || [];
    if (row.some((value, column) => column !== 0 && !FORMULA_COLUMNS.has(column) && !isBlank(value))) return index + 1;
  }
  return 1;
}

function sheetId(connection: { sheetId: string | null; sheetUrl: string }) {
  return connection.sheetId || connection.sheetUrl.match(/\/spreadsheets\/d\/([^/]+)/)?.[1] || null;
}

function sheetCell(value: string | number | null, field: LineField) {
  if (field === "date" && typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return Math.round((Date.parse(`${value}T00:00:00.000Z`) - Date.UTC(1899, 11, 30)) / 86400000);
  }
  return value ?? "";
}

export async function processLineWrite(lineId: string) {
  const state = await prisma.googleSheetLineSync.findUnique({ where: { lineId } });
  if (!state || state.status !== "pending" || !["upsert", "overwrite"].includes(state.pendingOperation || "")) return;
  const claim = await prisma.googleSheetLineSync.updateMany({ where: { lineId, revision: state.revision, status: "pending" }, data: { status: "writing" } });
  if (!claim.count) return;
  const [line, connection] = await Promise.all([
    prisma.lineDetails.findUnique({ where: { id: lineId } }),
    prisma.googleSheetConnection.findUnique({ where: { id: state.connectionId }, select: { sheetId: true, sheetUrl: true, month: true, year: true } }),
  ]);
  if (!line || !connection) {
    await prisma.googleSheetLineSync.updateMany({ where: { lineId, revision: state.revision, status: "writing" }, data: { status: "review", lastError: "The app line or sheet connection is no longer available" } });
    return;
  }
  try {
    const spreadsheetId = sheetId(connection);
    if (!spreadsheetId) throw new Error("Connected spreadsheet ID is missing");
    const sheets = await getGoogleSheetsClient();
    const response = await sheets.spreadsheets.values.get({ spreadsheetId, range: "'All'!A1:AT", valueRenderOption: "UNFORMATTED_VALUE" });
    const rows = response.data.values || [];
    const headers = rows[0] || [];
    const requiredColumns = requiredAllColumns(headers);
    const phoneColumn = requiredColumns.get("telephoneNo")!;
    const dateColumn = requiredColumns.get("date")!;
    if (normalized(headers[APP_ROW_ID_COLUMN])) throw new Error("All!AT is already in use; no app data was written");
    let row = rows.findIndex((values, index) => index > 0 && normalized(values[APP_ROW_ID_COLUMN]) === lineId) + 1;
    if (!row && state.sheetRow) {
      const candidate = rows[state.sheetRow - 1] || [];
      const oldPhone = snapshotBaseline(state.baseline).telephoneNo;
      if (candidate[APP_ROW_ID_COLUMN] && normalized(candidate[APP_ROW_ID_COLUMN]) !== lineId) {
        throw new Error(`All row ${state.sheetRow} belongs to another record; review the row link`);
      }
      const candidateMatchesLine = phoneKey(candidate[phoneColumn]) === phoneKey(line.telephoneNo) &&
        sheetDateKey(candidate[dateColumn], connection.month, connection.year) === lineSnapshot(line as any).date;
      const candidateMatchesBaseline = phoneKey(candidate[phoneColumn]) === phoneKey(oldPhone) &&
        sheetDateKey(candidate[dateColumn], connection.month, connection.year) === String(snapshotBaseline(state.baseline).date || "").slice(0, 10);
      if (!candidate[APP_ROW_ID_COLUMN] && (candidateMatchesBaseline || candidateMatchesLine)) {
        row = state.sheetRow;
      } else if (normalized(candidate[phoneColumn]) || normalized(candidate[dateColumn])) {
        throw new Error(`All row ${state.sheetRow} changed; review the row link before writing`);
      }
    }
    if (!row && !state.sheetRow) {
      const lineDate = lineSnapshot(line as any).date;
      const matches = rows.flatMap((values, index) => index > 0 &&
        phoneKey(values[phoneColumn]) === phoneKey(line.telephoneNo) && sheetDateKey(values[dateColumn], connection.month, connection.year) === lineDate ? [index + 1] : []);
      if (matches.length > 1) throw new Error("Multiple All rows match this date and number; review the row link");
      if (matches.length === 1) row = matches[0];
    }
    const isNew = !row;
    if (!row) {
      row = firstAvailableAllRow(rows, requiredColumns) || Math.max(2, lastUsedAllRow(rows) + 1);
    }
    const current = rows[row - 1] || [];
    if (current[APP_ROW_ID_COLUMN] && normalized(current[APP_ROW_ID_COLUMN]) !== lineId) throw new Error(`All row ${row} belongs to another record`);
    const properties = await sheets.spreadsheets.get({ spreadsheetId, fields: "sheets.properties(sheetId,title,gridProperties)" });
    const allTab = properties.data.sheets?.find((tab) => tab.properties?.title === "All")?.properties;
    const drumTab = properties.data.sheets?.find((tab) => tab.properties?.title === "Drum Number")?.properties;
    if (allTab?.sheetId == null || drumTab?.sheetId == null) throw new Error("All and Drum Number tabs must both be available before writing");
    const snapshot = lineSnapshot(line as any);
    const baseline = snapshotBaseline(state.baseline);
    const writes: Array<{ range: string; values: (string | number)[][] }> = [];
    const conflicts: string[] = [];
    for (const field of state.pendingFields as LineField[]) {
      const index = columnIndex(headers, field);
      if (index < 0 || (index >= 11 && index <= 13)) continue; // L-N are formulas.
      if (state.pendingOperation !== "overwrite" && !isNew && Object.prototype.hasOwnProperty.call(baseline, field) &&
          !fieldEqual(field, current[index], sheetCell(baseline[field], field)) && !fieldEqual(field, current[index], sheetCell(snapshot[field], field))) {
        conflicts.push(field);
        continue;
      }
      if (state.pendingOperation !== "overwrite" && !isNew && !Object.prototype.hasOwnProperty.call(baseline, field) && normalized(current[index]) &&
          !fieldEqual(field, current[index], sheetCell(snapshot[field], field))) {
        conflicts.push(field);
        continue;
      }
      writes.push({ range: `'All'!${columnName(index)}${row}`, values: [[sheetCell(snapshot[field], field)]] });
    }
    const writeDrum = isNew || state.pendingFields.includes("drumNumber") || state.pendingFields.includes("wastage");
    if (writeDrum) {
      if (!isNew && state.sheetRow) {
        const linked = await sheets.spreadsheets.values.get({ spreadsheetId, range: `'Drum Number'!B${row}:E${row}`, valueRenderOption: "FORMATTED_VALUE" });
        const drumPhone = linked.data.values?.[0]?.[0];
        if (normalized(drumPhone) && phoneKey(drumPhone) !== phoneKey(current[phoneColumn])) {
          throw new Error(`Drum Number row ${row} no longer matches All; review the row link`);
        }
      }
      const drumResponse = await sheets.spreadsheets.values.get({ spreadsheetId, range: `'Drum Number'!F${row}:G${row}`, valueRenderOption: "UNFORMATTED_VALUE" });
      const drumValues = drumResponse.data.values?.[0] || [];
      const drumBaseline = snapshotBaseline(state.drumBaseline);
      const desiredDrum = { drumNumber: line.drumNumber || "", wastage: Number(line.wastage || 0) };
      for (const field of ["drumNumber", "wastage"] as const) {
        const index = field === "drumNumber" ? 0 : 1;
        if (!isNew && !state.pendingFields.includes(field)) continue;
        if (state.pendingOperation === "overwrite") continue;
        if (normalized(drumValues[index]) && !equal(drumValues[index], desiredDrum[field]) &&
            (!Object.prototype.hasOwnProperty.call(drumBaseline, field) || !equal(drumValues[index], drumBaseline[field]))) conflicts.push(field);
      }
    }
    if (conflicts.length) {
      await prisma.googleSheetLineSync.updateMany({ where: { lineId, revision: state.revision, status: "writing" }, data: { status: "review", sheetRow: row, conflictFields: conflicts, lastError: "Both the app and sheet have values for the same field" } });
      return;
    }
    writes.push({ range: `'All'!AT${row}`, values: [[lineId]] });
    if (isNew && isBlank(current[0])) writes.push({ range: `'All'!A${row}`, values: [[row - 1]] });
    const growth: any[] = [];
    for (const tab of [allTab, drumTab]) {
      if (row > Number(tab.gridProperties?.rowCount || 0)) growth.push({ appendDimension: { sheetId: tab.sheetId, dimension: "ROWS", length: row - Number(tab.gridProperties?.rowCount || 0) } });
    }
    if (growth.length) await sheets.spreadsheets.batchUpdate({ spreadsheetId, requestBody: { requests: growth } });
    await sheets.spreadsheets.values.batchUpdate({ spreadsheetId, requestBody: { valueInputOption: "RAW", data: writes } });
    const requests: any[] = [];
    if (allTab.sheetId != null) {
      requests.push({ updateDimensionProperties: { range: { sheetId: allTab.sheetId, dimension: "COLUMNS", startIndex: 45, endIndex: 46 }, properties: { hiddenByUser: true }, fields: "hiddenByUser" } });
      if ((isNew || !state.sheetRow) && row > 2) requests.push({ copyPaste: { source: { sheetId: allTab.sheetId, startRowIndex: 1, endRowIndex: 2, startColumnIndex: 11, endColumnIndex: 14 }, destination: { sheetId: allTab.sheetId, startRowIndex: row - 1, endRowIndex: row, startColumnIndex: 11, endColumnIndex: 14 }, pasteType: "PASTE_FORMULA" } });
    }
    if (drumTab.sheetId != null && (isNew || !state.sheetRow) && row > 2) {
      requests.push({ copyPaste: { source: { sheetId: drumTab.sheetId, startRowIndex: 1, endRowIndex: 2, startColumnIndex: 1, endColumnIndex: 5 }, destination: { sheetId: drumTab.sheetId, startRowIndex: row - 1, endRowIndex: row, startColumnIndex: 1, endColumnIndex: 5 }, pasteType: "PASTE_FORMULA" } });
    }
    if (requests.length) await sheets.spreadsheets.batchUpdate({ spreadsheetId, requestBody: { requests } });
    if (writeDrum && drumTab.sheetId != null) {
      await sheets.spreadsheets.values.batchUpdate({ spreadsheetId, requestBody: { valueInputOption: "RAW", data: [
        { range: `'Drum Number'!A${row}`, values: [[row - 1]] },
        { range: `'Drum Number'!F${row}:G${row}`, values: [[line.drumNumber || "", Number(line.wastage || 0)]] },
      ] } });
    }
    await prisma.googleSheetLineSync.updateMany({ where: { lineId, revision: state.revision, status: "writing" }, data: {
      sheetRow: row, baseline: snapshot as Prisma.InputJsonValue,
      ...(writeDrum ? { drumBaseline: { drumNumber: line.drumNumber || "", wastage: Number(line.wastage || 0) } } : {}),
      status: "synced", pendingOperation: null,
      pendingFields: [], conflictFields: [], lastError: null, lastSyncedAt: new Date(),
    } });
  } catch (error) {
    const detail = error instanceof Error && /^(Connected spreadsheet|The All tab|All!AT|All row|Multiple All rows|All and Drum Number tabs|Drum Number row)/.test(error.message)
      ? error.message : "Google Sheets write failed; check spreadsheet access and try again";
    const needsReview = /^(The All tab|All!AT|All row|Multiple All rows|All and Drum Number tabs|Drum Number row)/.test(detail);
    await prisma.googleSheetLineSync.updateMany({ where: { lineId, revision: state.revision, status: "writing" }, data: {
      status: needsReview ? "review" : "pending", lastError: detail,
      ...(needsReview ? { conflictFields: ["sheet_row"] } : {}),
    } });
  }
}

export async function processPendingLineWrites(connectionId?: string) {
  await prisma.googleSheetLineSync.updateMany({ where: { status: "writing", updatedAt: { lt: new Date(Date.now() - 5 * 60_000) }, ...(connectionId ? { connectionId } : {}) }, data: { status: "pending" } });
  const pending = await prisma.googleSheetLineSync.findMany({ where: { status: "pending", pendingOperation: { in: ["upsert", "overwrite"] }, ...(connectionId ? { connectionId } : {}) }, take: 100, orderBy: { updatedAt: "asc" } });
  for (const state of pending) await processLineWrite(state.lineId);
  return pending.length;
}

export async function clearApprovedDeletedLine(lineId: string) {
  const state = await prisma.googleSheetLineSync.findUnique({ where: { lineId } });
  if (!state || state.pendingOperation !== "delete") return;
  const connection = await prisma.googleSheetConnection.findUnique({ where: { id: state.connectionId }, select: { sheetId: true, sheetUrl: true } });
  if (!connection) throw new Error("The sheet connection for this deleted line is unavailable");
  const spreadsheetId = sheetId(connection);
  if (!spreadsheetId) throw new Error("Connected spreadsheet ID is missing");
  const sheets = await getGoogleSheetsClient();
  let row = state.sheetRow;
  let numberColumn = 2;
  if (!row) {
    const response = await sheets.spreadsheets.values.get({ spreadsheetId, range: "'All'!A1:AT", valueRenderOption: "UNFORMATTED_VALUE" });
    const rows = response.data.values || [];
    numberColumn = columnIndex(rows[0] || [], "telephoneNo");
    if (numberColumn < 0) throw new Error("All tab is missing its Number column");
    const baselinePhone = snapshotBaseline(state.baseline).telephoneNo;
    const matches = rows.flatMap((values, index) => index > 0 &&
      (normalized(values[45]) === lineId || (!values[45] && phoneKey(values[numberColumn]) === phoneKey(baselinePhone))) ? [index + 1] : []);
    if (matches.length > 1) throw new Error("Multiple sheet rows match this deleted line; review the sheet before clearing");
    row = matches[0] || null;
  } else {
    const header = await sheets.spreadsheets.values.get({ spreadsheetId, range: "'All'!A1:AT1", valueRenderOption: "UNFORMATTED_VALUE" });
    numberColumn = columnIndex(header.data.values?.[0] || [], "telephoneNo");
    if (numberColumn < 0) throw new Error("All tab is missing its Number column");
  }
  if (!row) {
    await prisma.googleSheetLineSync.delete({ where: { lineId } });
    return;
  }
  const response = await sheets.spreadsheets.values.get({ spreadsheetId, range: `'All'!A${row}:AT${row}`, valueRenderOption: "UNFORMATTED_VALUE" });
  const values = response.data.values?.[0] || [];
  const baseline = snapshotBaseline(state.baseline);
  if (normalized(values[45]) && normalized(values[45]) !== lineId) throw new Error("The linked All row now belongs to another line");
  if (!values[45] && phoneKey(values[numberColumn]) !== phoneKey(baseline.telephoneNo)) throw new Error("The linked All row changed; review it again before clearing");
  await sheets.spreadsheets.values.batchClear({ spreadsheetId, requestBody: { ranges: [
    `'All'!B${row}:K${row}`, `'All'!O${row}:AS${row}`, `'All'!AT${row}`,
    `'Drum Number'!F${row}:G${row}`,
  ] } });
  await prisma.googleSheetLineSync.delete({ where: { lineId } });
}
