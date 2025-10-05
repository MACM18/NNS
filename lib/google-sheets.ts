import { google } from "googleapis";

export const REQUIRED_HEADER_ROW = [
  "Date",
  "Number",
  "DP",
  "Power (DP)",
  "Power (inbox)",
  "Name",
  "Addras",
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

export type SheetsAuthConfig = {
  clientEmail: string;
  privateKey: string;
};

export function getSheetsClient(config?: Partial<SheetsAuthConfig>) {
  const clientEmail =
    config?.clientEmail || process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = (
    config?.privateKey ||
    process.env.GOOGLE_SERVICE_ACCOUNT_KEY ||
    ""
  ).replace(/\\n/g, "\n");

  if (!clientEmail || !privateKey) {
    throw new Error(
      "Missing Google service account credentials (GOOGLE_SERVICE_ACCOUNT_EMAIL/GOOGLE_SERVICE_ACCOUNT_KEY)"
    );
  }

  const auth = new google.auth.JWT({
    email: clientEmail,
    key: privateKey,
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });
  return google.sheets({ version: "v4", auth });
}

export function parseSpreadsheetId(urlOrId: string): string {
  // Accept full URL or raw ID
  const m = urlOrId.match(/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return m ? m[1] : urlOrId;
}

export function validateSheetName(name: string): boolean {
  return name.toLowerCase().includes("nns");
}

export function validateHeaderRow(row: any[]): {
  valid: boolean;
  missing: string[];
} {
  const normalized = row.map((c) =>
    String(c ?? "")
      .trim()
      .toLowerCase()
  );
  const requiredLower = REQUIRED_HEADER_ROW.map((c) => c.toLowerCase());
  const missing = requiredLower.filter((col) => !normalized.includes(col));
  return { valid: missing.length === 0, missing };
}

export async function fetchSheetRange(
  sheetsUrlOrId: string,
  sheetName: string,
  range: string = "A1:AZ10000"
) {
  const sheets = getSheetsClient();
  const spreadsheetId = parseSpreadsheetId(sheetsUrlOrId);
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${sheetName}!${range}`,
    majorDimension: "ROWS",
  });
  return (res.data.values || []) as any[][];
}
