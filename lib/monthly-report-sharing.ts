import { createHash, randomBytes } from "node:crypto";

const MANAGEMENT_ROLES = new Set(["admin", "moderator", "superadmin"]);
export function canManageMonthlyReports(role: unknown) {
  return MANAGEMENT_ROLES.has(String(role || "").toLowerCase());
}

export function createMonthlyShareToken() {
  return randomBytes(32).toString("base64url");
}

export function createReportDocumentId() {
  return randomBytes(24).toString("base64url");
}

export function hashMonthlyShareToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function monthDateBounds(year: number, month: number) {
  if (!Number.isInteger(year) || year < 2000 || year > 2100 || !Number.isInteger(month) || month < 1 || month > 12) {
    throw new Error("Choose a valid month and year.");
  }
  return {
    start: new Date(Date.UTC(year, month - 1, 1)),
    endExclusive: new Date(Date.UTC(year, month, 1)),
  };
}

export const MONTHLY_REPORT_TYPES = [
  "daily-material-balance",
  "monthly-material-balance",
  "invoice-a",
  "invoice-b",
  "invoice-back",
  "drum-number",
] as const;
export type MonthlyReportType = (typeof MONTHLY_REPORT_TYPES)[number];

export const MONTHLY_REPORT_TITLES: Record<MonthlyReportType, string> = {
  "daily-material-balance": "Daily Material Balance",
  "monthly-material-balance": "Material Balance - Month",
  "invoice-a": "Invoice A",
  "invoice-b": "Invoice B",
  "invoice-back": "Invoice Back",
  "drum-number": "Drum Number",
};
