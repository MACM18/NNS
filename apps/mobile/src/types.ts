export type Worker = { id: string; fullName: string };

export type MonthlyLineSummary = {
  month: string;
  totals: { lines: number; completed: number; inProgress: number; pending: number; f1: number; g1: number; cable: number };
  daily: { date: string; total: number; completed: number; inProgress: number; f1: number; g1: number; cable: number }[];
  crew: { workerId: string; workerName: string; lines: number; completed: number; cable: number }[];
  fetchedAt: string;
};

export type Entry = {
  id: string;
  date: string;
  telephoneNo: string;
  dp: string | null;
  name: string | null;
  address: string | null;
  status: string | null;
  powerDp: number | string | null;
  powerInbox: number | string | null;
  cableStart: number;
  cableMiddle: number;
  cableEnd: number;
  ont: string | null;
  voiceTestNo: string | null;
  stb: string | null;
  ontSerial: string | null;
  voiceTestNoNew: string | null;
  stbSerial: string | null;
  phoneNumber: string | null;
  workAssignments: { workerId: string; workerName: string }[];
  updatedAt?: string;
  sheetSyncStatus?: string | null;
};

export type EntryConflict = {
  message: string;
  fields?: Record<string, unknown>;
  conflictingFields?: string[];
  existingId?: string;
};

export type CachedEntry = {
  entry: Entry;
  baseline: Entry | null;
  conflict: EntryConflict | null;
};

export type PendingMutation = {
  id: number;
  entryId: string;
  mutationId: string;
  kind: "create" | "patch";
  data: Record<string, unknown>;
  baseValues?: Record<string, unknown>;
  status: "pending" | "conflict";
};

export type AppUser = { id: string; email: string; fullName: string | null; role: string };

export const blankEntry = (date: string, telephoneNo: string, id: string): Entry => ({
  id, date, telephoneNo, dp: null, name: null, address: null, status: "in_progress",
  powerDp: null, powerInbox: null, cableStart: 0, cableMiddle: 0, cableEnd: 0,
  ont: null, voiceTestNo: null, stb: null, ontSerial: null, voiceTestNoNew: null,
  stbSerial: null, phoneNumber: null, workAssignments: [],
});

export const ENTRY_FIELDS = [
  "name", "address", "dp", "powerDp", "powerInbox", "cableStart", "cableMiddle", "cableEnd",
  "ont", "voiceTestNo", "stb", "ontSerial", "voiceTestNoNew", "stbSerial", "phoneNumber", "status", "workerIds",
] as const;

export function cableLengths(entry: Entry) {
  const start = Number(entry.cableStart || 0);
  const middle = Number(entry.cableMiddle || 0);
  const end = Number(entry.cableEnd || 0);
  return { f1: Math.abs(middle - start), g1: Math.abs(end - middle), total: Math.abs(middle - start) + Math.abs(end - middle) };
}

export function workerIds(entry: Entry) {
  return entry.workAssignments.map((assignment) => assignment.workerId).sort();
}

export function sameFieldValue(field: string, a: unknown, b: unknown) {
  if (["powerDp", "powerInbox", "cableStart", "cableMiddle", "cableEnd"].includes(field)) {
    const left = a == null || a === "" ? null : Number(a);
    const right = b == null || b === "" ? null : Number(b);
    return left === right || (left == null && right == null);
  }
  const normalized = (value: unknown) => Array.isArray(value) ? [...value].sort() : value;
  return JSON.stringify(normalized(a)) === JSON.stringify(normalized(b));
}
