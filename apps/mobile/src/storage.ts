import * as Crypto from "expo-crypto";
import * as SecureStore from "expo-secure-store";
import * as SQLite from "expo-sqlite";
import type { CachedEntry, Entry, PendingMutation, Worker } from "./types";

const KEY_NAME = "nns-daily-book-cache-key-v1";
let database: SQLite.SQLiteDatabase | null = null;
let databaseOwner = "";
let activeOwnerId = "";

export async function openBookDatabase(ownerId = activeOwnerId) {
  if (!ownerId) throw new Error("Sign in before opening offline records.");
  const ownerHash = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, ownerId);
  if (database && databaseOwner === ownerHash) return database;
  if (database) await database.closeAsync();
  database = null;
  databaseOwner = "";
  const keyName = `${KEY_NAME}-${ownerHash}`;
  let key = await SecureStore.getItemAsync(keyName);
  if (!key) {
    key = Array.from(await Crypto.getRandomBytesAsync(32)).map((value) => value.toString(16).padStart(2, "0")).join("");
    await SecureStore.setItemAsync(keyName, key, { keychainAccessible: SecureStore.WHEN_UNLOCKED });
  }
  const db = await SQLite.openDatabaseAsync(`nns-daily-book-${ownerHash}.sqlite`);
  try {
    await db.execAsync(`PRAGMA key = '${key}'; PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;`);
    const cipher = await db.getFirstAsync<{ cipher_version: string }>("PRAGMA cipher_version");
    if (!cipher?.cipher_version) throw new Error("Encrypted offline storage is unavailable in this build. Install the NNS Android test build; Expo Go is not supported.");
  } catch (error) {
    await db.closeAsync();
    throw error;
  }
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS book_entries (
      id TEXT PRIMARY KEY NOT NULL,
      day TEXT NOT NULL,
      payload TEXT NOT NULL,
      baseline TEXT,
      conflict TEXT,
      cached_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS book_entries_day_idx ON book_entries(day DESC);
    CREATE TABLE IF NOT EXISTS book_workers (id TEXT PRIMARY KEY NOT NULL, name TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS book_outbox (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      entry_id TEXT NOT NULL,
      mutation_id TEXT NOT NULL UNIQUE,
      kind TEXT NOT NULL,
      payload TEXT NOT NULL,
      base_values TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS book_outbox_order_idx ON book_outbox(status, id);
  `);
  database = db;
  databaseOwner = ownerHash;
  activeOwnerId = ownerId;
  return db;
}

export async function closeBookDatabase() {
  if (database) await database.closeAsync();
  database = null;
  databaseOwner = "";
  activeOwnerId = "";
}

export async function pruneBookEntries(beforeDate: string) {
  const db = await openBookDatabase();
  await db.runAsync(
    "DELETE FROM book_entries WHERE day < ? AND id NOT IN (SELECT DISTINCT entry_id FROM book_outbox)",
    beforeDate,
  );
}

export async function getCachedEntries() {
  const db = await openBookDatabase();
  const rows = await db.getAllAsync<{ id: string; payload: string; baseline: string | null; conflict: string | null }>("SELECT id, payload, baseline, conflict FROM book_entries ORDER BY day DESC, cached_at DESC");
  return rows.map((row) => ({
    entry: JSON.parse(row.payload) as Entry,
    baseline: row.baseline ? JSON.parse(row.baseline) as Entry : null,
    conflict: row.conflict ? JSON.parse(row.conflict) as CachedEntry["conflict"] : null,
  }));
}

export async function pendingEntryIds() {
  const db = await openBookDatabase();
  const rows = await db.getAllAsync<{ entry_id: string }>("SELECT DISTINCT entry_id FROM book_outbox");
  return new Set(rows.map((row) => row.entry_id));
}

export async function cacheServerEntry(entry: Entry) {
  const db = await openBookDatabase();
  const pending = await db.getFirstAsync<{ count: number }>("SELECT COUNT(*) as count FROM book_outbox WHERE entry_id = ?", entry.id);
  if (pending?.count) return false;
  await db.runAsync("INSERT INTO book_entries(id, day, payload, baseline, conflict, cached_at) VALUES(?, ?, ?, ?, NULL, ?) ON CONFLICT(id) DO UPDATE SET day=excluded.day, payload=excluded.payload, baseline=excluded.baseline, conflict=NULL, cached_at=excluded.cached_at", entry.id, entry.date, JSON.stringify(entry), JSON.stringify(entry), new Date().toISOString());
  return true;
}

export async function getConflictedMutations(entryId: string) {
  const db = await openBookDatabase();
  const rows = await db.getAllAsync<{ id: number; entry_id: string; mutation_id: string; kind: "create" | "patch"; payload: string; base_values: string | null; status: "pending" | "conflict" }>("SELECT id, entry_id, mutation_id, kind, payload, base_values, status FROM book_outbox WHERE entry_id = ? AND status = 'conflict' ORDER BY id ASC", entryId);
  return rows.map((row): PendingMutation => ({ id: row.id, entryId: row.entry_id, mutationId: row.mutation_id, kind: row.kind, data: JSON.parse(row.payload), baseValues: row.base_values ? JSON.parse(row.base_values) : undefined, status: row.status }));
}

export async function storeEntry(entry: Entry, baseline?: Entry | null, conflict?: CachedEntry["conflict"]) {
  const db = await openBookDatabase();
  const current = await db.getFirstAsync<{ baseline: string | null; conflict: string | null }>("SELECT baseline, conflict FROM book_entries WHERE id = ?", entry.id);
  const hasPending = await db.getFirstAsync<{ count: number }>("SELECT COUNT(*) as count FROM book_outbox WHERE entry_id = ?", entry.id);
  const nextBaseline = hasPending?.count ? current?.baseline : baseline ? JSON.stringify(baseline) : current?.baseline ?? null;
  const nextConflict = conflict === undefined ? current?.conflict ?? null : conflict ? JSON.stringify(conflict) : null;
  await db.runAsync(
    "INSERT INTO book_entries(id, day, payload, baseline, conflict, cached_at) VALUES(?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET day=excluded.day, payload=excluded.payload, baseline=COALESCE(excluded.baseline, book_entries.baseline), conflict=excluded.conflict, cached_at=excluded.cached_at",
    entry.id, entry.date, JSON.stringify(entry), nextBaseline ?? null, nextConflict ?? null, new Date().toISOString(),
  );
}

export async function replaceLocalId(oldId: string, newId: string, entry: Entry, baseline: Entry) {
  const db = await openBookDatabase();
  await db.withTransactionAsync(async () => {
    await db.runAsync("UPDATE book_outbox SET entry_id = ? WHERE entry_id = ?", newId, oldId);
    await db.runAsync("DELETE FROM book_entries WHERE id = ?", oldId);
    await db.runAsync("INSERT OR REPLACE INTO book_entries(id, day, payload, baseline, conflict, cached_at) VALUES(?, ?, ?, ?, NULL, ?)", newId, entry.date, JSON.stringify({ ...entry, id: newId }), JSON.stringify(baseline), new Date().toISOString());
  });
}

export async function deleteEntryCache(id: string) {
  const db = await openBookDatabase();
  await db.runAsync("DELETE FROM book_entries WHERE id = ?", id);
}

export async function deleteLocalDraft(id: string) {
  if (!id.startsWith("local:")) throw new Error("Only an unsynced local draft can be deleted here.");
  const db = await openBookDatabase();
  await db.withTransactionAsync(async () => {
    await db.runAsync("DELETE FROM book_outbox WHERE entry_id = ?", id);
    await db.runAsync("DELETE FROM book_entries WHERE id = ?", id);
  });
}

export async function getWorkers() {
  const db = await openBookDatabase();
  const rows = await db.getAllAsync<{ id: string; name: string }>("SELECT id, name FROM book_workers ORDER BY name");
  return rows.map((row) => ({ id: row.id, fullName: row.name }));
}

export async function storeWorkers(workers: Worker[]) {
  const db = await openBookDatabase();
  await db.withTransactionAsync(async () => {
    await db.runAsync("DELETE FROM book_workers");
    for (const worker of workers) await db.runAsync("INSERT INTO book_workers(id, name) VALUES(?, ?)", worker.id, worker.fullName);
  });
}

export async function enqueueMutation(mutation: Omit<PendingMutation, "id" | "status">) {
  const db = await openBookDatabase();
  await db.runAsync("INSERT INTO book_outbox(entry_id, mutation_id, kind, payload, base_values, status, created_at) VALUES(?, ?, ?, ?, ?, 'pending', ?)", mutation.entryId, mutation.mutationId, mutation.kind, JSON.stringify(mutation.data), mutation.baseValues ? JSON.stringify(mutation.baseValues) : null, new Date().toISOString());
}

export async function updatePendingCreate(entryId: string, data: Record<string, unknown>) {
  const db = await openBookDatabase();
  const result = await db.runAsync("UPDATE book_outbox SET payload = ? WHERE entry_id = ? AND kind = 'create' AND status = 'pending'", JSON.stringify(data), entryId);
  return result.changes > 0;
}

export async function getPendingMutations(limit = 25) {
  const db = await openBookDatabase();
  const rows = await db.getAllAsync<{ id: number; entry_id: string; mutation_id: string; kind: "create" | "patch"; payload: string; base_values: string | null; status: "pending" | "conflict" }>("SELECT id, entry_id, mutation_id, kind, payload, base_values, status FROM book_outbox WHERE status = 'pending' ORDER BY id ASC LIMIT ?", limit);
  return rows.map((row): PendingMutation => ({ id: row.id, entryId: row.entry_id, mutationId: row.mutation_id, kind: row.kind, data: JSON.parse(row.payload), baseValues: row.base_values ? JSON.parse(row.base_values) : undefined, status: row.status }));
}

export async function finishMutation(mutationId: string) {
  const db = await openBookDatabase();
  await db.runAsync("DELETE FROM book_outbox WHERE mutation_id = ?", mutationId);
}

export async function flagConflict(mutationId: string, conflict: CachedEntry["conflict"]) {
  const db = await openBookDatabase();
  await db.withTransactionAsync(async () => {
    const row = await db.getFirstAsync<{ entry_id: string }>("SELECT entry_id FROM book_outbox WHERE mutation_id = ?", mutationId);
    if (!row) return;
    await db.runAsync("UPDATE book_outbox SET status = 'conflict' WHERE mutation_id = ?", mutationId);
    const cached = await db.getFirstAsync<{ conflict: string | null }>("SELECT conflict FROM book_entries WHERE id = ?", row.entry_id);
    let combined = { message: conflict?.message || "Changes need review", ...conflict, relatedMutations: [mutationId] };
    if (cached?.conflict) {
      const previous = JSON.parse(cached.conflict);
      combined = {
        ...previous,
        ...conflict,
        message: conflict?.message || previous.message || "Changes need review",
        fields: { ...(previous.fields || {}), ...(conflict?.fields || {}) },
        conflictingFields: [...new Set([...(previous.conflictingFields || []), ...(conflict?.conflictingFields || [])])],
        existingId: conflict?.existingId || previous.existingId,
        relatedMutations: [...new Set([...(previous.relatedMutations || []), mutationId])],
      };
    }
    await db.runAsync("UPDATE book_entries SET conflict = ? WHERE id = ?", JSON.stringify(combined), row.entry_id);
    // Later edits for this entry depend on this change; hold them for the same review.
    await db.runAsync("UPDATE book_outbox SET status = 'conflict' WHERE entry_id = ?", row.entry_id);
  });
}

export async function clearConflictMutations(entryId: string) {
  const db = await openBookDatabase();
  await db.runAsync("DELETE FROM book_outbox WHERE entry_id = ? AND status = 'conflict'", entryId);
  await db.runAsync("UPDATE book_entries SET conflict = NULL WHERE id = ?", entryId);
}

export async function pendingCount() {
  const db = await openBookDatabase();
  const row = await db.getFirstAsync<{ count: number }>("SELECT COUNT(*) as count FROM book_outbox");
  return row?.count || 0;
}
