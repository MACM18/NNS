import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet,
  Text, TextInput, View, useColorScheme,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView } from "react-native-safe-area-context";
import * as SecureStore from "expo-secure-store";
import NetInfo from "@react-native-community/netinfo";
import * as Crypto from "expo-crypto";
import { GoogleOneTapSignIn, isCancelledResponse, isErrorWithCode, isNoSavedCredentialFoundResponse, isSuccessResponse, statusCodes } from "react-native-nitro-google-signin";
import { apiFetch, clearSession, getSavedSession, login, NativeSession, readApiJson, revokeCurrentSession, saveSession } from "./src/session";
import { cacheServerEntry, clearConflictMutations, closeBookDatabase, deleteEntryCache, enqueueMutation, finishMutation, flagConflict, getCachedEntries, getConflictedMutations, getPendingMutations, getWorkers, openBookDatabase, pendingCount, pruneBookEntries, replaceLocalId, storeEntry, storeWorkers, updatePendingCreate } from "./src/storage";
import { AppUser, blankEntry, CachedEntry, cableLengths, Entry, EntryConflict, PendingMutation, sameFieldValue, Worker, workerIds } from "./src/types";

type Palette = {
  ink: string; muted: string; blue: string; bright: string; pale: string; paper: string; card: string;
  line: string; good: string; warn: string; yellow: string; yellowInk: string; input: string;
  raised: string; errorBg: string; errorLine: string; successBg: string; successLine: string;
};
type ThemeMode = "system" | "light" | "dark";
const paletteByMode: Record<Exclude<ThemeMode, "system">, Palette> = {
  light: {
    ink: "#2e2a23", muted: "#776f61", blue: "#31594d", bright: "#b26745", pale: "#e9eee4",
    paper: "#f4efe5", card: "#fffaf1", line: "#ddd4c4", good: "#3e7558", warn: "#a2473a",
    yellow: "#f5e5bd", yellowInk: "#806021", input: "#fffdf8", raised: "#f8f2e7",
    errorBg: "#fbefea", errorLine: "#e6c7ba", successBg: "#e8f1e8", successLine: "#c9ddcb",
  },
  dark: {
    ink: "#f3ead9", muted: "#b9ad99", blue: "#a9c8ad", bright: "#e5a17d", pale: "#303b34",
    paper: "#191d1a", card: "#222823", line: "#3b433c", good: "#9bc6a0", warn: "#efa18f",
    yellow: "#4c4027", yellowInk: "#e4c77e", input: "#1d231f", raised: "#2b322c",
    errorBg: "#392824", errorLine: "#704b40", successBg: "#26352a", successLine: "#405f47",
  },
};
const APPEARANCE_KEY = "nns-mobile-appearance-v1";
let C: Palette = paletteByMode.light;
let styles = createStyles(C);
let darkTheme = false;
const mobileApiConfigured = Boolean((process.env.EXPO_PUBLIC_NNS_API_URL || "").trim());
const googleWebClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || "";

const pages = ["Entry", "Customer", "Readings", "Equipment", "Team & review"] as const;
type Page = typeof pages[number];
type ViewName = "book" | "entry" | "history" | "review" | "account";
const pageFields: Record<number, string[]> = {
  1: ["name", "address", "dp"],
  2: ["powerDp", "powerInbox", "cableStart", "cableMiddle", "cableEnd"],
  3: ["ont", "ontSerial", "voiceTestNo", "voiceTestNoNew", "stb", "stbSerial", "phoneNumber"],
  4: ["workerIds", "status"],
};
const labels: Record<string, string> = {
  telephoneNo: "Telephone number", date: "Work date", name: "Customer name", address: "Customer address", dp: "DP",
  powerDp: "DP power", powerInbox: "Inbox power", cableStart: "Cable start", cableMiddle: "Cable middle", cableEnd: "Cable end",
  ont: "ONT", ontSerial: "ONT serial", voiceTestNo: "Voice test number", voiceTestNoNew: "New voice test number",
  stb: "STB", stbSerial: "STB serial", phoneNumber: "Contact number", workerIds: "Workers", status: "Entry status",
};

function dateInColombo(offset = 0) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Colombo", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const date = new Date(`${values.year}-${values.month}-${values.day}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
}

function prettyDate(date: string) {
  return new Intl.DateTimeFormat("en", { weekday: "long", day: "numeric", month: "long", timeZone: "Asia/Colombo" }).format(new Date(`${date}T00:00:00+05:30`));
}

function asNumber(value: unknown) { return value == null || value === "" ? null : Number(value); }
function apiEntry(data: any): Entry {
  return {
    ...blankEntry(String(data.date).slice(0, 10), String(data.telephoneNo || ""), String(data.id)),
    ...data,
    date: String(data.date).slice(0, 10),
    cableStart: Number(data.cableStart || 0), cableMiddle: Number(data.cableMiddle || 0), cableEnd: Number(data.cableEnd || 0),
    workAssignments: Array.isArray(data.workAssignments) ? data.workAssignments : [],
  } as Entry;
}

function errorMessage(payload: any, fallback: string) { return typeof payload?.error === "string" ? payload.error : fallback; }

export default function App() {
  const systemScheme = useColorScheme();
  const [themeMode, setThemeMode] = useState<ThemeMode>("system");
  const [appearanceLoaded, setAppearanceLoaded] = useState(false);
  const resolvedMode = themeMode === "system" ? (systemScheme === "dark" ? "dark" : "light") : themeMode;
  const palette = paletteByMode[resolvedMode];
  const themeStyles = useMemo(() => createStyles(palette), [palette]);
  C = palette;
  styles = themeStyles;
  darkTheme = resolvedMode === "dark";

  useEffect(() => {
    void SecureStore.getItemAsync(APPEARANCE_KEY).then((saved) => {
      if (saved === "system" || saved === "light" || saved === "dark") setThemeMode(saved);
    }).catch(() => undefined).finally(() => setAppearanceLoaded(true));
  }, []);
  useEffect(() => {
    if (appearanceLoaded) void SecureStore.setItemAsync(APPEARANCE_KEY, themeMode).catch(() => undefined);
  }, [appearanceLoaded, themeMode]);

  return <AppContent themeMode={themeMode} setThemeMode={setThemeMode} />;
}

function AppContent({ themeMode, setThemeMode }: { themeMode: ThemeMode; setThemeMode: (mode: ThemeMode) => void }) {
  const [view, setView] = useState<ViewName>("book");
  const [user, setUser] = useState<AppUser | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [pendingGoogleToken, setPendingGoogleToken] = useState("");
  const [requiresTwoFactor, setRequiresTwoFactor] = useState(false);
  const [loginBusy, setLoginBusy] = useState(false);
  const [booting, setBooting] = useState(true);
  const [fatalStorageError, setFatalStorageError] = useState("");
  const [online, setOnline] = useState(false);
  const [entries, setEntries] = useState<CachedEntry[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [pending, setPending] = useState(0);
  const [bookDate, setBookDate] = useState(dateInColombo());
  const [activeEntry, setActiveEntry] = useState<Entry | null>(null);
  const [activeConflict, setActiveConflict] = useState<EntryConflict | null>(null);
  const [remoteConflictEntry, setRemoteConflictEntry] = useState<Entry | null>(null);
  const [conflictChoices, setConflictChoices] = useState<Record<string, "phone" | "server">>({});
  const [page, setPage] = useState(0);
  const [saving, setSaving] = useState(false);
  const [syncText, setSyncText] = useState("");
  const [history, setHistory] = useState<any[]>([]);
  const [mobileSessions, setMobileSessions] = useState<any[]>([]);
  const [pendingQueue, setPendingQueue] = useState<PendingMutation[]>([]);
  const syncInProgress = useRef(false);
  const savedSnapshot = useRef<Entry | null>(null);
  const refreshLocal = useCallback(async () => {
    const [cached, cachedWorkers, pendingCount, queued] = await Promise.all([getCachedEntries(), getWorkers(), pendingCountSafe(), getPendingMutations(100)]);
    setEntries(cached);
    setWorkers(cachedWorkers);
    setPending(pendingCount);
    setPendingQueue(queued);
  }, []);

  const reloadServer = useCallback(async () => {
    if (!online) return;
    const startDate = dateInColombo(-6);
    const endDate = dateInColombo();
    try {
      const [response, session] = await Promise.all([
        apiFetch(`/api/daily-book?startDate=${startDate}&endDate=${endDate}`),
        getSavedSession(),
      ]);
      if (!response.ok) throw new Error("Could not load recent Daily Book entries");
      const payload = await response.json();
      for (const row of payload.data || []) await cacheServerEntry(apiEntry(row));
      if (Array.isArray(payload.workers)) await storeWorkers(payload.workers);
      await pruneBookEntries(startDate);
      if (session?.user) setUser(session.user);
      await refreshLocal();
      setSyncText("");
    } catch (error) {
      setSyncText(error instanceof Error ? error.message : "Could not refresh the book");
      await refreshLocal();
    }
  }, [online, refreshLocal]);

  const syncOutbox = useCallback(async () => {
    if (!online || !user || syncInProgress.current) return;
    syncInProgress.current = true;
    try {
      const queue = await getPendingMutations(25);
      if (!queue.length) { await refreshLocal(); return; }
      setSyncText("Syncing saved changes…");
      const response = await apiFetch("/api/mobile/daily-book/sync", {
        method: "POST",
        body: JSON.stringify({ mutations: queue.map((mutation) => ({
          mutationId: mutation.mutationId,
          clientEntryId: mutation.entryId,
          kind: mutation.kind,
          ...(mutation.kind === "patch" ? { lineId: mutation.entryId, baseValues: mutation.baseValues } : {}),
          data: mutation.data,
        })) }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(errorMessage(payload, "Sync failed. Your entries remain saved on this phone."));
      const byId = new Map(queue.map((item) => [item.mutationId, item]));
      for (const result of payload.results || []) {
        const mutation = byId.get(result.mutationId);
        if (!mutation) continue;
        if (result.status === "synced") {
          if (mutation.kind === "create" && result.lineId) {
            const local = (await getCachedEntries()).find((record) => record.entry.id === mutation.entryId)?.entry;
            if (local) await replaceLocalId(mutation.entryId, result.lineId, local, local);
          }
          await finishMutation(mutation.mutationId);
        } else if (result.status === "conflict" || result.status === "duplicate" || result.status === "held") {
          await flagConflict(mutation.mutationId, {
            message: result.status === "duplicate" ? "A server entry already uses this phone and date." : result.error || "This entry changed somewhere else. Review the two versions before syncing.",
          ...(result.fields ? { fields: result.fields } : {}),
          ...(Array.isArray(result.conflictingFields) ? { conflictingFields: result.conflictingFields } : {}),
            ...(result.existingId ? { existingId: result.existingId } : {}),
          });
        } else {
          setSyncText(result.error || "A saved change could not sync. It will stay on this phone.");
        }
      }
      await reloadServer();
      const count = await pendingCountSafe();
      setPending(count);
      if (count === 0) setSyncText("All changes are saved to NNS Enterprise.");
      else if (!syncText) setSyncText(`${count} saved change${count === 1 ? "" : "s"} still need attention.`);
    } catch (error) {
      setSyncText(error instanceof Error ? error.message : "Sync failed. Your entries remain saved on this phone.");
      await refreshLocal();
    } finally { syncInProgress.current = false; }
  }, [online, user, refreshLocal, reloadServer, syncText]);

  const createPendingLocalEntries = useCallback(async () => {
    if (!online) return;
    const cached = await getCachedEntries();
    const outbox = await getPendingMutations(100);
    const queued = new Set(outbox.filter((item) => item.kind === "create").map((item) => item.entryId));
    for (const record of cached) {
      if (record.entry.id.startsWith("local:") && record.entry.telephoneNo.trim() && !queued.has(record.entry.id)) {
        const entry = record.entry;
        await enqueueMutation({
          entryId: entry.id,
          mutationId: Crypto.randomUUID(),
          kind: "create",
          data: makeCreatePayload(entry),
        });
      }
    }
  }, [online]);

  useEffect(() => {
    let mounted = true;
    void (async () => {
      try {
        const session = await getSavedSession();
        if (!mounted) return;
        if (session) {
          await openBookDatabase(session.user.id);
          const [cached, cachedWorkers] = await Promise.all([getCachedEntries(), getWorkers()]);
          if (!mounted) return;
          setEntries(cached);
          setWorkers(cachedWorkers);
          setUser(session.user);
          setView("book");
        } else {
          setEntries([]);
          setWorkers([]);
        }
      } catch (error) {
        if (mounted) setFatalStorageError(error instanceof Error ? error.message : "Secure offline storage could not start.");
      } finally { if (mounted) setBooting(false); }
    })();
    const unsubscribe = NetInfo.addEventListener((state) => setOnline(Boolean(state.isConnected && state.isInternetReachable !== false)));
    return () => { mounted = false; unsubscribe(); };
  }, []);

  useEffect(() => {
    if (!user || !online || booting) return;
    void (async () => { await createPendingLocalEntries(); await syncOutbox(); await reloadServer(); })();
  }, [user?.id, online, booting]); // Runs when connectivity returns or the account is restored.

  const entryGroups = useMemo(() => {
    const list = entries.map((record) => record.entry).filter((entry) => entry.date >= dateInColombo(-6) && entry.date <= dateInColombo());
    return list.reduce<Record<string, Entry[]>>((acc, entry) => { (acc[entry.date] ||= []).push(entry); return acc; }, {});
  }, [entries, bookDate]);

  async function completeLogin(credentials: Record<string, unknown>) {
    setLoginBusy(true); setSyncText("");
    try {
      const response = await login({ ...credentials, deviceName: "NNS Enterprise Android" });
      const payload = await readApiJson(response, "sign-in");
      if (response.status === 428 && payload.twoFactorRequired) { setRequiresTwoFactor(true); setSyncText("Enter your authenticator code or a one-time backup code."); return; }
      if (!response.ok) throw new Error(errorMessage(payload, "Could not sign in"));
      const session: NativeSession = { user: payload.user, accessToken: payload.accessToken, refreshToken: payload.refreshToken };
      await openBookDatabase(payload.user.id);
      await saveSession(session);
      setUser(payload.user);
      setPassword(""); setTwoFactorCode(""); setPendingGoogleToken(""); setRequiresTwoFactor(false); setView("book");
      await refreshLocal();
      await reloadServer();
    } catch (error) { setSyncText(error instanceof Error ? error.message : "Could not sign in"); }
    finally { setLoginBusy(false); }
  }

  async function submitPasswordLogin() {
    if (!email.trim() || !password) { setSyncText("Enter your email and password."); return; }
    await completeLogin({ email, password, ...(twoFactorCode ? { twoFactorCode } : {}) });
  }

  async function submitGoogleSecondFactor() {
    if (!pendingGoogleToken || !twoFactorCode) { setSyncText("Enter your authenticator or backup code."); return; }
    await completeLogin({ provider: "google", idToken: pendingGoogleToken, twoFactorCode });
  }

  async function startGoogleLogin() {
    if (!googleWebClientId) {
      setSyncText("Google sign-in is not configured for this app. Please contact your administrator.");
      return;
    }
    setLoginBusy(true);
    setSyncText("");
    try {
      GoogleOneTapSignIn.configure({ webClientId: googleWebClientId, scopes: ["openid", "profile", "email"] });
      await GoogleOneTapSignIn.checkPlayServices();
      let result = await GoogleOneTapSignIn.signIn();
      if (isNoSavedCredentialFoundResponse(result)) result = await GoogleOneTapSignIn.createAccount();
      if (isNoSavedCredentialFoundResponse(result)) result = await GoogleOneTapSignIn.presentExplicitSignIn();
      if (isCancelledResponse(result)) return;
      if (!isSuccessResponse(result) || !result.data.idToken) {
        setSyncText("Google did not return a sign-in token. Please try again.");
        return;
      }
      setPendingGoogleToken(result.data.idToken);
      setRequiresTwoFactor(false);
      await completeLogin({ provider: "google", idToken: result.data.idToken });
    } catch (error) {
      if (isErrorWithCode(error) && error.code === statusCodes.DEVELOPER_ERROR) {
        setSyncText("Google sign-in setup does not match this app build. Check the Android package name and SHA-1 certificate in Google Cloud.");
      } else if (isErrorWithCode(error) && error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        setSyncText("Google Play services is unavailable or needs an update on this device.");
      } else {
        setSyncText(error instanceof Error ? error.message : "Google sign-in could not start. Please try again.");
      }
    } finally {
      setLoginBusy(false);
    }
  }

  async function startNewEntry() {
    const entry = blankEntry(bookDate, "", `local:${Crypto.randomUUID()}`);
    setActiveEntry(entry); setActiveConflict(null); setPage(0); savedSnapshot.current = entry; setView("entry");
  }

  function openEntry(entry: Entry) {
    const record = entries.find((item) => item.entry.id === entry.id);
    setActiveEntry(entry);
    setActiveConflict(record?.conflict || null);
    setPage(0);
    savedSnapshot.current = entry;
    setView("entry");
  }

  function localEntryPatchValue(entry: Entry, field: string): unknown {
    if (field === "workerIds") return workerIds(entry);
    return (entry as any)[field];
  }

  async function persistStep(targetPage: number, nextEntry = activeEntry) {
    if (!nextEntry) return;
    setSaving(true); setSyncText("");
    try {
      const before = savedSnapshot.current || nextEntry;
      if (nextEntry.id.startsWith("local:")) {
        await storeEntry(nextEntry, null, activeConflict);
        const createData = makeCreatePayload(nextEntry);
        const updatedQueuedCreate = await updatePendingCreate(nextEntry.id, createData);
        if (!updatedQueuedCreate && online && nextEntry.telephoneNo.trim()) {
          await enqueueMutation({ entryId: nextEntry.id, mutationId: Crypto.randomUUID(), kind: "create", data: createData });
        }
      } else {
        const changedFields = pageFields[targetPage] || [];
        const data: Record<string, unknown> = {};
        const baseValues: Record<string, unknown> = {};
        for (const field of changedFields) {
          const previousValue = localEntryPatchValue(before, field);
          const currentValue = localEntryPatchValue(nextEntry, field);
          if (!sameFieldValue(field, previousValue, currentValue)) { data[field] = currentValue; baseValues[field] = previousValue; }
        }
        if (Object.keys(data).length) await enqueueMutation({ entryId: nextEntry.id, mutationId: Crypto.randomUUID(), kind: "patch", data, baseValues });
        await storeEntry(nextEntry, before, activeConflict);
      }
      savedSnapshot.current = nextEntry;
      setEntries(await getCachedEntries());
      setPending(await pendingCountSafe());
      if (online) {
        if (nextEntry.id.startsWith("local:") && !nextEntry.telephoneNo.trim()) setSyncText("Saved securely on this phone. Add the phone number to start syncing.");
        else await syncOutbox();
      } else setSyncText("Saved securely on this phone. It will sync when you’re back online.");
    } catch (error) { setSyncText(error instanceof Error ? error.message : "Could not save this page"); }
    finally { setSaving(false); }
  }

  function makeCreatePayload(entry: Entry) {
    return {
      date: entry.date,
      telephoneNo: entry.telephoneNo,
      name: entry.name,
      address: entry.address,
      dp: entry.dp,
      powerDp: asNumber(entry.powerDp),
      powerInbox: asNumber(entry.powerInbox),
      cableStart: Number(entry.cableStart || 0), cableMiddle: Number(entry.cableMiddle || 0), cableEnd: Number(entry.cableEnd || 0),
      ont: entry.ont, ontSerial: entry.ontSerial, voiceTestNo: entry.voiceTestNo, voiceTestNoNew: entry.voiceTestNoNew,
      stb: entry.stb, stbSerial: entry.stbSerial, phoneNumber: entry.phoneNumber,
      workerIds: workerIds(entry), status: entry.status === "completed" ? "completed" : "in_progress",
    };
  }

  async function handleNext() {
    if (!activeEntry) return;
    if (page === 0 && !activeEntry.telephoneNo.trim()) { setSyncText("Enter the telephone number to start this entry."); return; }
    await persistStep(page);
    setPage((current) => Math.min(pages.length - 1, current + 1));
  }

  async function handleBack() {
    if (!activeEntry) return;
    if (page === 0) { await persistStep(page); setView("book"); return; }
    await persistStep(page);
    setPage((current) => Math.max(0, current - 1));
  }

  async function updateActiveEntry(patch: Partial<Entry>) {
    if (!activeEntry) return;
    const updated = { ...activeEntry, ...patch };
    setActiveEntry(updated);
    await storeEntry(updated, savedSnapshot.current, activeConflict);
    setEntries(await getCachedEntries());
  }

  async function completeEntry() {
    if (!activeEntry?.dp?.trim()) { setSyncText("Add the DP before marking this entry complete."); return; }
    const updated = { ...activeEntry, status: "completed" };
    setActiveEntry(updated);
    await persistStep(4, updated);
    setView("book");
    setActiveEntry(null);
  }

  async function openHistory(entry: Entry) {
    if (entry.id.startsWith("local:")) { Alert.alert("Not synced yet", "History is available after this entry reaches the NNS server."); return; }
    const response = await apiFetch(`/api/daily-book/${entry.id}/history`);
    const payload = await response.json();
    if (!response.ok) { Alert.alert("History unavailable", errorMessage(payload, "Could not load this entry’s history.")); return; }
    setHistory(payload.data || []); setActiveEntry(entry); setView("history");
  }

  async function loadSessions() {
    const response = await apiFetch("/api/mobile/auth/session");
    const payload = await response.json();
    if (!response.ok) throw new Error(errorMessage(payload, "Could not load devices"));
    setMobileSessions(payload.sessions || []);
  }

  async function revokeSession(sessionId: string) {
    const response = await apiFetch("/api/mobile/auth/session", { method: "DELETE", body: JSON.stringify({ sessionId }) });
    const payload = await response.json();
    if (!response.ok) throw new Error(errorMessage(payload, "Could not revoke this device"));
    if (payload.currentSessionRevoked) { await clearSession(); await closeBookDatabase(); setEntries([]); setWorkers([]); setUser(null); setView("book"); return; }
    await loadSessions();
  }

  async function refreshEntryFromServer(entry: Entry) {
    const response = await apiFetch(`/api/daily-book?date=${entry.date}`);
    const payload = await response.json();
    if (!response.ok) throw new Error(errorMessage(payload, "Could not reload the server version"));
    const remote = (payload.data || []).map(apiEntry).find((item: Entry) => item.id === entry.id);
    if (remote) setRemoteConflictEntry(remote);
    return remote as Entry | undefined;
  }

  async function saveMissingEntryAsNew() {
    if (!activeEntry || !online) return;
    const originalId = activeEntry.id;
    const latest = await refreshEntryFromServer(activeEntry);
    if (latest) { setSyncText("This entry is still on the server. Review the latest version before saving."); return; }
    await clearConflictMutations(originalId);
    await deleteEntryCache(originalId);
    const newEntry = { ...activeEntry, id: `local:${Crypto.randomUUID()}` };
    await storeEntry(newEntry, null, null);
    await enqueueMutation({ entryId: newEntry.id, mutationId: Crypto.randomUUID(), kind: "create", data: makeCreatePayload(newEntry) });
    savedSnapshot.current = newEntry;
    setActiveEntry(newEntry); setActiveConflict(null); setRemoteConflictEntry(null); setEntries(await getCachedEntries());
    setSyncText("Saving these notes as a new entry. Duplicate checking still applies.");
    await syncOutbox();
  }

  async function reviewConflict(entry: Entry) {
    const cached = entries.find((record) => record.entry.id === entry.id);
    if (!cached?.conflict) return;
    setActiveEntry(entry); setActiveConflict(cached.conflict); setConflictChoices({}); setRemoteConflictEntry(null); setView("entry");
    if (cached.conflict.existingId && online) {
      try { await refreshEntryFromServer({ ...entry, id: cached.conflict.existingId }); } catch { /* Keep the saved phone draft available. */ }
    } else if (online && !entry.id.startsWith("local:")) {
      try { await refreshEntryFromServer(entry); } catch { /* Conflict details are still shown from the sync response. */ }
    }
  }

  async function resolvePatchConflict() {
    if (!activeEntry || !remoteConflictEntry || !activeConflict) return;
    const queued = await getConflictedMutations(activeEntry.id);
    const finalValues: Record<string, unknown> = {};
    for (const mutation of queued) if (mutation.kind === "patch") Object.assign(finalValues, mutation.data);
    const data: Record<string, unknown> = {};
    const baseValues: Record<string, unknown> = {};
    const merged = { ...remoteConflictEntry } as Entry;
    for (const [field, phoneValue] of Object.entries(finalValues)) {
      const remoteValue = localEntryPatchValue(remoteConflictEntry, field);
      const choosePhone = conflictChoices[field] !== "server";
      if (choosePhone && !sameFieldValue(field, phoneValue, remoteValue)) {
        data[field] = phoneValue;
        baseValues[field] = remoteValue;
        if (field === "workerIds") merged.workAssignments = workers.filter((worker) => (phoneValue as string[]).includes(worker.id)).map((worker) => ({ workerId: worker.id, workerName: worker.fullName }));
        else (merged as any)[field] = phoneValue;
      } else if (field === "workerIds") merged.workAssignments = remoteConflictEntry.workAssignments;
      else (merged as any)[field] = remoteValue;
    }
    await clearConflictMutations(activeEntry.id);
    await storeEntry(remoteConflictEntry, remoteConflictEntry, null);
    if (Object.keys(data).length) await enqueueMutation({ entryId: activeEntry.id, mutationId: Crypto.randomUUID(), kind: "patch", data, baseValues });
    await storeEntry(merged, remoteConflictEntry, null);
    setActiveEntry(merged); setActiveConflict(null); setRemoteConflictEntry(null); setEntries(await getCachedEntries());
    if (online) await syncOutbox();
    setSyncText("Conflict reviewed. Your choices have been saved.");
  }

  async function openExistingFromDuplicate() {
    if (!activeEntry || !activeConflict?.existingId || !remoteConflictEntry) return;
    const localId = activeEntry.id;
    Alert.alert("Open existing entry?", "Your offline draft will stay saved on this phone. Open the server entry to review and continue it.", [
      { text: "Stay here", style: "cancel" },
      { text: "Open existing", onPress: () => { void (async () => {
        await clearConflictMutations(localId);
        const found = entries.find((item) => item.entry.id === activeConflict.existingId)?.entry || remoteConflictEntry;
        if (found) { setActiveConflict(null); openEntry(found); }
      })(); } },
    ]);
  }

  async function abandonDuplicateDraft() {
    if (!activeEntry) return;
    Alert.alert("Discard this local draft?", "This removes the offline draft and its unsynced changes from this phone.", [
      { text: "Keep draft", style: "cancel" },
      { text: "Discard draft", style: "destructive", onPress: () => { void (async () => { await clearConflictMutations(activeEntry.id); await deleteEntryCache(activeEntry.id); setActiveEntry(null); setActiveConflict(null); setEntries(await getCachedEntries()); setView("book"); })(); } },
    ]);
  }

  if (booting) return <Centered><Text style={styles.appName}>NNS Enterprise</Text><Text style={styles.subtle}>Opening your field book…</Text></Centered>;
  if (fatalStorageError) return <Centered><Text style={styles.brandMark}>NNS</Text><Text style={styles.heading}>Secure storage needed</Text><Text style={styles.body}>{fatalStorageError}</Text><Text style={styles.body}>Install the signed NNS Android test build to use encrypted offline records.</Text></Centered>;
  if (!user) return <SignInScreen
    appConfigured={mobileApiConfigured} googleConfigured={Boolean(googleWebClientId)} email={email} setEmail={setEmail} password={password} setPassword={setPassword}
    twoFactorCode={twoFactorCode} setTwoFactorCode={setTwoFactorCode} requiresTwoFactor={requiresTwoFactor}
    busy={loginBusy} message={syncText} onSubmit={() => void (requiresTwoFactor && pendingGoogleToken ? submitGoogleSecondFactor() : submitPasswordLogin())}
    onGoogle={() => void startGoogleLogin()}
  />;

  if (view === "history") return <HistoryScreen rows={history} onBack={() => setView("entry")} />;
  if (view === "entry" && activeEntry) return <EntryScreen
    entry={activeEntry} setEntry={(patch) => { setActiveEntry((current) => current ? { ...current, ...patch } : current); }}
    page={page} setPage={setPage} saving={saving} online={online} pending={pending} message={syncText}
    workers={workers} conflict={activeConflict} remote={remoteConflictEntry} conflictChoices={conflictChoices}
    setConflictChoice={(field, choice) => setConflictChoices((current) => ({ ...current, [field]: choice }))}
    onBack={() => void handleBack()} onNext={() => void handleNext()} onComplete={() => void completeEntry()}
    onHistory={() => void openHistory(activeEntry)} onRetrySync={() => void syncOutbox()}
    onReviewConflict={() => void reviewConflict(activeEntry)} onResolveConflict={() => void resolvePatchConflict()} onSaveAsNew={() => void saveMissingEntryAsNew()}
    onOpenExisting={() => void openExistingFromDuplicate()} onDiscardDuplicate={() => void abandonDuplicateDraft()}
  />;

  if (view === "review") return <ReviewScreen
    entries={entries} queue={pendingQueue} online={online} message={syncText}
    onTab={(tab) => { setView(tab); if (tab === "account") void loadSessions().catch((error) => setSyncText(error.message)); }}
    onOpen={(entry) => { const record = entries.find((row) => row.entry.id === entry.id); if (record?.conflict) void reviewConflict(entry); else openEntry(entry); }}
    onReviewConflict={(entry) => void reviewConflict(entry)} onSync={() => void (async () => { await createPendingLocalEntries(); await syncOutbox(); await reloadServer(); })()}
  />;

  if (view === "account") return <AccountScreen
    user={user} sessions={mobileSessions} themeMode={themeMode} onThemeMode={setThemeMode}
    onTab={(tab) => { setView(tab); if (tab === "account") void loadSessions().catch((error) => setSyncText(error.message)); }}
    onRevoke={(id) => void revokeSession(id).catch((error) => setSyncText(error.message))}
    onRefreshSessions={() => void loadSessions().catch((error) => setSyncText(error.message))}
    onSignOut={() => Alert.alert("Sign out of this device?", "Offline entries will stay encrypted on this device until you sign in again.", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign out", style: "destructive", onPress: () => { void (async () => { await revokeCurrentSession(); await closeBookDatabase(); setEntries([]); setWorkers([]); setUser(null); setView("book"); }); } },
    ])}
  />;

  return <BookScreen
    user={user} entries={entries} groups={entryGroups} workers={workers} online={online} pending={pending} message={syncText}
    selectedDate={bookDate} setSelectedDate={setBookDate}
    onNew={() => void startNewEntry()} onOpen={openEntry} onReviewConflict={(entry) => void reviewConflict(entry)} onHistory={(entry) => void openHistory(entry)}
    onRefresh={() => void (async () => { await createPendingLocalEntries(); await syncOutbox(); await reloadServer(); })()}
    onTab={(tab) => { setView(tab); if (tab === "account") void loadSessions().catch((error) => setSyncText(error.message)); }}
  />;
}

async function pendingCountSafe() { try { return await pendingCount(); } catch { return 0; } }
function SignInScreen(props: {
  appConfigured: boolean; googleConfigured: boolean; email: string; setEmail: (value: string) => void;
  password: string; setPassword: (value: string) => void; twoFactorCode: string; setTwoFactorCode: (value: string) => void;
  requiresTwoFactor: boolean; busy: boolean; message: string; onSubmit: () => void; onGoogle: () => void;
}) {
  return <SafeAreaView style={styles.safe}>
    <StatusBar style={darkTheme ? "light" : "dark"} />
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.signInScroll} keyboardShouldPersistTaps="handled">
        <View style={styles.signInBrand}><View style={styles.logo}><Text style={styles.logoText}>N</Text></View><View><Text style={styles.appName}>NNS Enterprise</Text><Text style={styles.subtle}>Field Book</Text></View></View>
        <View style={styles.signInCard}>
          <Text style={styles.eyebrow}>DAILY BOOK</Text>
          <Text style={styles.hero}>Start your day’s record.</Text>
          <Text style={styles.body}>Sign in to continue where the team left off. Entries save securely if the connection drops.</Text>
          {!props.appConfigured ? <InlineNotice text="App setup is incomplete. Please install the latest NNS Enterprise app or contact your administrator." tone="error" /> : null}
          {!props.requiresTwoFactor && <>
            <Field label="Email" value={props.email} onChangeText={props.setEmail} placeholder="name@company.com" autoCapitalize="none" keyboardType="email-address" />
            <Field label="Password" value={props.password} onChangeText={props.setPassword} placeholder="Enter your password" secureTextEntry />
          </>}
          {props.requiresTwoFactor && <Field label="Authenticator or backup code" value={props.twoFactorCode} onChangeText={props.setTwoFactorCode} placeholder="6 digit code or XXXX-XXXX" autoCapitalize="characters" />}
          {props.message ? <InlineNotice text={props.message} tone={props.message.includes("incorrect") || props.message.includes("Unable") ? "error" : "info"} /> : null}
          <PrimaryButton label={props.busy ? "Signing in…" : props.requiresTwoFactor ? "Verify and continue" : "Sign in"} onPress={props.onSubmit} disabled={props.busy || !props.appConfigured} />
          {!props.requiresTwoFactor && <>
            <View style={styles.orRow}><View style={styles.rule} /><Text style={styles.subtle}>or continue with</Text><View style={styles.rule} /></View>
            <SecondaryButton label="Continue with Google" onPress={props.onGoogle} disabled={!props.googleConfigured || !props.appConfigured || props.busy} />
          </>}
          <Text style={styles.footnote}>Use your NNS Enterprise account. Access follows your account’s existing permissions.</Text>
        </View>
        <Text style={styles.footer}>NNS Enterprise · Daily Book</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  </SafeAreaView>;
}

function BookScreen(props: {
  user: AppUser; entries: CachedEntry[]; groups: Record<string, Entry[]>; workers: Worker[]; online: boolean; pending: number; message: string;
  selectedDate: string; setSelectedDate: (date: string) => void; onNew: () => void; onOpen: (entry: Entry) => void;
  onReviewConflict: (entry: Entry) => void; onHistory: (entry: Entry) => void; onRefresh: () => void; onTab: (tab: "book" | "review" | "account") => void;
}) {
  const dates = Object.keys(props.groups).sort((a, b) => b.localeCompare(a));
  const openEntry = (entry: Entry) => {
    const record = props.entries.find((row) => row.entry.id === entry.id);
    if (record?.conflict) props.onReviewConflict(entry);
    else props.onOpen(entry);
  };
  return <SafeAreaView style={styles.safe}>
    <StatusBar style={darkTheme ? "light" : "dark"} />
    <View style={styles.topBar}>
      <View style={styles.brandInline}><View style={styles.smallLogo}><Text style={styles.logoText}>N</Text></View><View><Text style={styles.appName}>NNS Enterprise</Text><Text style={styles.subtle}>Daily Book</Text></View></View>
      <View style={styles.fieldMark}><Text style={styles.fieldMarkText}>FIELD NOTES</Text></View>
    </View>
    <View style={styles.connectionStrip}>
      <View style={[styles.statusDot, { backgroundColor: props.online ? C.good : C.yellowInk }]} />
      <Text style={styles.connectionText}>{props.online ? "Connected" : "Offline · saving on this device"}</Text>
      <Text style={styles.connectionText}>{props.pending ? `${props.pending} pending` : ""}</Text>
    </View>
    <ScrollView contentContainerStyle={styles.bookContent}>
      <View style={styles.bookHeader}>
        <View><Text style={styles.eyebrow}>FIELD BOOK</Text><Text style={styles.heroSmall}>Good work, {props.user.fullName?.split(" ")[0] || "team"}.</Text><Text style={styles.body}>Your installations, one entry at a time.</Text></View>
        <View style={styles.pageStamp}><Text style={styles.pageStampSmall}>TODAY</Text><Text style={styles.pageStampValue}>{props.selectedDate.slice(-2)}</Text></View>
      </View>
      <View style={styles.dateSelector}>
        <Pressable style={styles.dateNudge} onPress={() => props.setSelectedDate(dateInColombo(-1))}><Text style={styles.dateNudgeText}>‹</Text></Pressable>
        <View style={{ flex: 1 }}><Text style={styles.sectionEyebrow}>SELECTED DAY</Text><Text style={styles.dateTitle}>{prettyDate(props.selectedDate)}</Text></View>
        <Pressable style={styles.dateNudge} onPress={() => props.setSelectedDate(dateInColombo())}><Text style={styles.todayButtonText}>Today</Text></Pressable>
      </View>
      <PrimaryButton label="＋  Start a new entry" onPress={props.onNew} />
      {props.message ? <InlineNotice text={props.message} tone="info" /> : null}
      {props.pending > 0 && <SecondaryButton label="Sync saved entries" onPress={props.onRefresh} />}
      <View style={styles.sectionHeadingRow}><View><Text style={styles.sectionTitle}>Today’s pages</Text><Text style={styles.subtle}>Tap an entry to continue it</Text></View><Text style={styles.countBadge}>{(props.groups[props.selectedDate] || []).length}</Text></View>
      {(props.groups[props.selectedDate] || []).length === 0 ? <EmptyCard onPress={props.onNew} /> : (props.groups[props.selectedDate] || []).map((entry) => <EntryCard key={entry.id} entry={entry} record={props.entries.find((row) => row.entry.id === entry.id)} onPress={() => openEntry(entry)} onHistory={() => props.onHistory(entry)} />)}
      {dates.filter((date) => date !== props.selectedDate).map((date) => <View key={date} style={styles.pastDay}>
        <View style={styles.pastDayHeading}><Text style={styles.pastDayTitle}>{prettyDate(date)}</Text><Text style={styles.subtle}>{props.groups[date].length} entries</Text></View>
        {props.groups[date].map((entry) => <EntryCard key={entry.id} compact entry={entry} record={props.entries.find((row) => row.entry.id === entry.id)} onPress={() => openEntry(entry)} onHistory={() => props.onHistory(entry)} />)}
      </View>)}
      <Text style={styles.footer}>Changes keep their edit history after syncing.</Text>
    </ScrollView>
    <TabBar active="book" pending={props.pending} onSelect={props.onTab} />
  </SafeAreaView>;
}

function TabBar(props: { active: "book" | "review" | "account"; pending: number; onSelect: (tab: "book" | "review" | "account") => void }) {
  const tabs = [
    { id: "book" as const, title: "Book", icon: "▤" },
    { id: "review" as const, title: "Review", icon: "☷" },
    { id: "account" as const, title: "Account", icon: "◉" },
  ];
  return <View style={styles.tabBar}>
    {tabs.map((tab) => <Pressable key={tab.id} accessibilityRole="tab" accessibilityState={{ selected: props.active === tab.id }} onPress={() => props.onSelect(tab.id)} style={styles.tabButton}>
      <View style={[styles.tabIconWrap, props.active === tab.id && styles.tabIconWrapActive]}><Text style={[styles.tabIcon, props.active === tab.id && styles.tabIconActive]}>{tab.icon}</Text>{tab.id === "review" && props.pending > 0 ? <View style={styles.tabBadge}><Text style={styles.tabBadgeText}>{Math.min(props.pending, 9)}</Text></View> : null}</View>
      <Text style={[styles.tabLabel, props.active === tab.id && styles.tabLabelActive]}>{tab.title}</Text>
    </Pressable>)}
  </View>;
}

function ReviewScreen(props: {
  entries: CachedEntry[]; queue: PendingMutation[]; online: boolean; message: string;
  onTab: (tab: "book" | "review" | "account") => void; onOpen: (entry: Entry) => void;
  onReviewConflict: (entry: Entry) => void; onSync: () => void;
}) {
  const conflicted = props.entries.filter((record) => Boolean(record.conflict));
  const localEntries = props.entries.filter((record) => record.entry.id.startsWith("local:") && !record.conflict);
  const queuedIds = new Set(props.queue.map((item) => item.entryId));
  const queuedEntries = props.entries.filter((record) => queuedIds.has(record.entry.id) && !record.conflict && !record.entry.id.startsWith("local:"));
  const reviewCount = conflicted.length + Math.max(localEntries.length, 0) + queuedEntries.length;
  return <SafeAreaView style={styles.safe}>
    <StatusBar style={darkTheme ? "light" : "dark"} />
    <View style={styles.screenHeader}><Text style={styles.sectionEyebrow}>FIELD DESK</Text><Text style={styles.heroSmall}>Review & sync</Text><Text style={styles.body}>Changes stay safely on this device until they reach NNS Enterprise.</Text></View>
    <View style={styles.reviewSummary}><View style={styles.reviewSummaryIcon}><Text style={styles.reviewSummaryGlyph}>{props.online ? "↻" : "⌁"}</Text></View><View style={styles.flex}><Text style={styles.cardTitle}>{props.online ? "Connection ready" : "Working offline"}</Text><Text style={styles.cardSubtitle}>{props.online ? "You can send saved changes now." : "Saved notes will wait here until you reconnect."}</Text></View><Text style={styles.reviewCount}>{reviewCount}</Text></View>
    {props.message ? <View style={{ paddingHorizontal: 18 }}><InlineNotice text={props.message} tone="info" onPress={props.onSync} /></View> : null}
    {props.queue.length || localEntries.length ? <View style={{ paddingHorizontal: 18 }}><PrimaryButton label={props.online ? `Sync ${props.queue.length || localEntries.length} saved change${(props.queue.length || localEntries.length) === 1 ? "" : "s"}` : "Saved on this device"} onPress={props.onSync} disabled={!props.online} /></View> : null}
    <ScrollView contentContainerStyle={styles.bookContent}>
      <View style={styles.sectionHeadingRow}><View><Text style={styles.sectionTitle}>Needs a closer look</Text><Text style={styles.subtle}>Conflicts and changes waiting to sync</Text></View><Text style={styles.countBadge}>{reviewCount}</Text></View>
      {conflicted.map((record) => <Pressable key={record.entry.id} onPress={() => props.onReviewConflict(record.entry)} style={styles.reviewItem}>
        <View style={[styles.reviewItemStamp, styles.reviewItemStampWarn]}><Text style={[styles.reviewItemStampText, styles.reviewItemStampTextWarn]}>!</Text></View>
        <View style={styles.flex}><Text style={styles.entryPhone}>{record.entry.telephoneNo || "Local entry"}</Text><Text style={styles.entryLocation} numberOfLines={1}>{record.conflict?.message || "This entry needs review"}</Text><Text style={styles.entryMeta}>{record.entry.date} · Conflict</Text></View><Text style={styles.reviewArrow}>›</Text>
      </Pressable>)}
      {[...localEntries, ...queuedEntries].map((record) => <Pressable key={record.entry.id} onPress={() => props.onOpen(record.entry)} style={styles.reviewItem}>
        <View style={styles.reviewItemStamp}><Text style={styles.reviewItemStampText}>↗</Text></View>
        <View style={styles.flex}><Text style={styles.entryPhone}>{record.entry.telephoneNo || "New entry draft"}</Text><Text style={styles.entryLocation} numberOfLines={1}>{[record.entry.name, record.entry.dp].filter(Boolean).join(" · ") || "Details still to add"}</Text><Text style={styles.entryMeta}>{record.entry.date} · {props.online ? "Waiting to sync" : "Saved offline"}</Text></View><Text style={styles.reviewArrow}>›</Text>
      </Pressable>)}
      {reviewCount === 0 ? <View style={styles.emptyCard}><View style={styles.emptyIcon}><Text style={styles.emptyIconText}>✓</Text></View><Text style={styles.emptyTitle}>All caught up</Text><Text style={styles.body}>There are no saved changes or conflicts that need your attention.</Text></View> : null}
    </ScrollView>
    <TabBar active="review" pending={props.queue.length + conflicted.length + localEntries.length} onSelect={props.onTab} />
  </SafeAreaView>;
}

function AccountScreen(props: {
  user: AppUser; sessions: any[]; themeMode: ThemeMode; onThemeMode: (mode: ThemeMode) => void;
  onTab: (tab: "book" | "review" | "account") => void; onRevoke: (id: string) => void; onRefreshSessions: () => void; onSignOut: () => void;
}) {
  const modes: { value: ThemeMode; label: string; caption: string }[] = [
    { value: "system", label: "System", caption: "Follow this phone" },
    { value: "light", label: "Light", caption: "Paper & ink" },
    { value: "dark", label: "Dark", caption: "Low-light field use" },
  ];
  return <SafeAreaView style={styles.safe}>
    <StatusBar style={darkTheme ? "light" : "dark"} />
    <View style={styles.screenHeader}><Text style={styles.sectionEyebrow}>YOUR FIELD DESK</Text><Text style={styles.heroSmall}>Account</Text><Text style={styles.body}>Signed in as {props.user.fullName || props.user.email}.</Text></View>
    <ScrollView contentContainerStyle={styles.accountContent}>
      <Card title="Page appearance" subtitle="This choice is saved on this device and stays when you sign out.">
        <View style={styles.appearanceChoices}>{modes.map((mode) => <Pressable key={mode.value} accessibilityRole="radio" accessibilityState={{ selected: props.themeMode === mode.value }} onPress={() => props.onThemeMode(mode.value)} style={[styles.appearanceChoice, props.themeMode === mode.value && styles.appearanceChoiceSelected]}>
          <View style={[styles.appearanceDot, props.themeMode === mode.value && styles.appearanceDotSelected]}>{props.themeMode === mode.value ? <Text style={styles.appearanceCheck}>✓</Text> : null}</View><View style={styles.flex}><Text style={styles.appearanceTitle}>{mode.label}</Text><Text style={styles.appearanceCaption}>{mode.caption}</Text></View>
        </Pressable>)}</View>
      </Card>
      <Card title="Signed-in devices" subtitle="Revoke another Android session if a device is lost or replaced.">
        <Pressable onPress={props.onRefreshSessions} style={styles.refreshSessions}><Text style={styles.refreshSessionsText}>Refresh device list ↻</Text></Pressable>
        {props.sessions.length ? props.sessions.map((session) => <View key={session.id} style={styles.sessionCard}><View style={styles.sessionSeal}><Text style={styles.sessionSealText}>N</Text></View><View style={styles.flex}><Text style={styles.sessionName}>{session.deviceName || "Android device"}</Text><Text style={styles.subtle}>Last used {new Date(session.lastUsedAt).toLocaleString()}</Text><Text style={styles.subtle}>Expires {new Date(session.expiresAt).toLocaleDateString()}</Text></View><Pressable onPress={() => props.onRevoke(session.id)} style={styles.revokeButton}><Text style={styles.revokeText}>Revoke</Text></Pressable></View>) : <Text style={styles.fieldHelp}>No other device sessions are available.</Text>}
        <Text style={styles.footnote}>Changing your password or resetting it also invalidates signed-in mobile sessions.</Text>
      </Card>
      <Pressable onPress={props.onSignOut} style={styles.signOutButton}><Text style={styles.signOutButtonText}>Sign out of this device</Text></Pressable>
      <Text style={styles.accountFooter}>NNS Enterprise · Daily Book</Text>
    </ScrollView>
    <TabBar active="account" pending={0} onSelect={props.onTab} />
  </SafeAreaView>;
}

function EntryCard(props: { entry: Entry; record?: CachedEntry; compact?: boolean; onPress: () => void; onHistory: () => void }) {
  const isLocal = props.entry.id.startsWith("local:");
  const conflict = Boolean(props.record?.conflict);
  const location = [props.entry.name, props.entry.dp].filter(Boolean).join(" · ") || "Details still to add";
  return <View style={[styles.entryCard, props.compact && styles.entryCardCompact]}>
    <Pressable style={styles.entryCardMain} onPress={props.onPress}>
      <View style={styles.entryNumber}><Text style={styles.entryNumberText}>{props.entry.telephoneNo.slice(-2) || "—"}</Text></View>
      <View style={styles.entryCardText}><Text style={styles.entryPhone}>{props.entry.telephoneNo || "New local draft"}</Text><Text style={styles.entryLocation} numberOfLines={1}>{location}</Text><Text style={styles.entryMeta}>{props.entry.date} · {isLocal ? "Not synced" : props.entry.status === "completed" ? "Complete" : "In progress"}</Text></View>
      <View style={styles.cardStatus}><View style={[styles.statusDot, { backgroundColor: conflict ? C.warn : isLocal ? C.yellowInk : props.entry.status === "completed" ? C.good : C.bright }]} /><Text style={[styles.cardStatusText, conflict && { color: C.warn }]}>{conflict ? "Review" : isLocal ? "Draft" : props.entry.status === "completed" ? "Done" : "Open"}</Text></View>
    </Pressable>
    {conflict && <Text style={styles.conflictPreview}>{props.record?.conflict?.message}</Text>}
    {!props.compact && <Pressable style={styles.historyLink} onPress={props.onHistory}><Text style={styles.historyLinkText}>View changes</Text></Pressable>}
  </View>;
}

function EmptyCard(props: { onPress: () => void }) {
  return <View style={styles.emptyCard}><View style={styles.emptyIcon}><Text style={styles.emptyIconText}>✦</Text></View><Text style={styles.emptyTitle}>A fresh page</Text><Text style={styles.body}>There are no entries for this day yet. Start one when the team is ready.</Text><SecondaryButton label="Begin today’s first entry" onPress={props.onPress} /></View>;
}

function EntryScreen(props: {
  entry: Entry; setEntry: (patch: Partial<Entry>) => void; page: number; setPage: (page: number) => void; saving: boolean; online: boolean; pending: number; message: string;
  workers: Worker[]; conflict: EntryConflict | null; remote: Entry | null; conflictChoices: Record<string, "phone" | "server">; setConflictChoice: (field: string, choice: "phone" | "server") => void;
  onBack: () => void; onNext: () => void; onComplete: () => void; onHistory: () => void; onRetrySync: () => void; onReviewConflict: () => void;
  onResolveConflict: () => void; onOpenExisting: () => void; onDiscardDuplicate: () => void; onSaveAsNew: () => void;
}) {
  const entry = props.entry;
  const lengths = cableLengths(entry);
  const pageTitle = pages[props.page];
  const isDuplicate = Boolean(props.conflict?.existingId);
  const steps = pages.map((title, index) => <View key={title} style={styles.stepItem}>
    <View style={[styles.stepCircle, index <= props.page && styles.stepCircleActive]}><Text style={[styles.stepNum, index <= props.page && styles.stepNumActive]}>{index + 1}</Text></View>
    <Text style={[styles.stepLabel, index === props.page && styles.stepLabelActive]}>{title}</Text>
    {index < pages.length - 1 && <View style={[styles.stepConnector, index < props.page && styles.stepConnectorActive]} />}
  </View>);

  const textField = (field: keyof Entry, title = labels[String(field)], multiline = false) => <Field
    key={String(field)} label={title} value={String(entry[field] ?? "")} multiline={multiline}
    onChangeText={(value) => props.setEntry({ [field]: value } as Partial<Entry>)}
    keyboardType={String(field).startsWith("cable") || String(field).startsWith("power") ? "decimal-pad" : undefined}
    warning={String(field).startsWith("power") && Number(entry[field]) > 25 ? "Above 25 · review power value" : undefined}
  />;

  const numberField = (field: "cableStart" | "cableMiddle" | "cableEnd" | "powerDp" | "powerInbox") => <Field
    key={field} label={labels[field]} value={String(entry[field] ?? "")} keyboardType="decimal-pad"
    onChangeText={(value) => props.setEntry({ [field]: value as any })}
    warning={field.startsWith("power") && Number(entry[field]) > 25 ? "Above 25 · review power value" : undefined}
  />;

  return <SafeAreaView style={styles.safe}>
    <StatusBar style={darkTheme ? "light" : "dark"} />
    <View style={styles.entryTopBar}><Pressable onPress={props.onBack} style={styles.backButton}><Text style={styles.backArrow}>‹</Text></Pressable><View style={{ flex: 1 }}><Text style={styles.entryTopTitle}>Daily Book</Text><Text style={styles.subtle}>{entry.telephoneNo || "New entry"}</Text></View><View style={[styles.saveBadge, props.saving && styles.saveBadgeWorking]}><Text style={styles.saveBadgeText}>{props.saving ? "Saving" : props.online ? "Saved" : "On device"}</Text></View></View>
    <View style={styles.progressWrap}><View style={styles.progressHeader}><Text style={styles.eyebrow}>PAGE {props.page + 1} OF {pages.length}</Text><Text style={styles.progressPercent}>{Math.round(((props.page + 1) / pages.length) * 100)}%</Text></View><View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${((props.page + 1) / pages.length) * 100}%` }]} /></View><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.steps}>{steps}</ScrollView></View>
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={90}>
      <ScrollView key={props.page} style={styles.flex} contentContainerStyle={styles.formContent} keyboardShouldPersistTaps="handled">
        <View style={styles.pageHeading}><Text style={styles.eyebrow}>FIELD NOTES</Text><Text style={styles.heroSmall}>{pageTitle}</Text><Text style={styles.body}>{pageHint(props.page)}</Text></View>
        {props.conflict && <ConflictCard conflict={props.conflict} entry={entry} remote={props.remote} choices={props.conflictChoices} setChoice={props.setConflictChoice} onReview={props.onReviewConflict} onResolve={props.onResolveConflict} onOpenExisting={props.onOpenExisting} onDiscard={props.onDiscardDuplicate} onSaveAsNew={props.onSaveAsNew} online={props.online} />}
        {props.page === 0 && <Card title="Entry details" subtitle="Start with the work date and telephone number.">
          {entry.id.startsWith("local:") ? <>
            <Field label="Work date" value={entry.date} onChangeText={(value) => props.setEntry({ date: value })} placeholder="YYYY-MM-DD" />
            <Field label="Telephone number" value={entry.telephoneNo} onChangeText={(value) => props.setEntry({ telephoneNo: value })} placeholder="Five digits or full number" keyboardType="phone-pad" />
            <Text style={styles.fieldHelp}>A five-digit number gets the local 03422 prefix when saved.</Text>
          </> : <>
            <ReviewRow label="Work date" value={entry.date} />
            <ReviewRow label="Telephone number" value={entry.telephoneNo} />
            <Text style={styles.fieldHelp}>Date and telephone number identify this saved entry and stay fixed.</Text>
          </>}
          <View style={styles.paperNote}><Text style={styles.paperNoteTitle}>A note before you begin</Text><Text style={styles.paperNoteText}>This page saves as you move forward. You can finish the rest later.</Text></View>
        </Card>}
        {props.page === 1 && <Card title="Customer & location" subtitle="Write down who the crew visited and where.">
          {textField("name")}{textField("address", labels.address, true)}{textField("dp")}
        </Card>}
        {props.page === 2 && <>
          <Card title="Power values" subtitle="High values are highlighted for review only.">{numberField("powerDp")}{numberField("powerInbox")}</Card>
          <Card title="Cable meter marks" subtitle="F1 and G1 are calculated from your readings.">
            <View style={styles.readingRow}>{numberField("cableStart")}{numberField("cableMiddle")}</View>
            {numberField("cableEnd")}
            <View style={styles.measurements}><Measure label="F1 length" value={lengths.f1} /><Measure label="G1 length" value={lengths.g1} /><Measure label="Total" value={lengths.total} /></View>
          </Card>
        </>}
        {props.page === 3 && <Card title="Equipment & identifiers" subtitle="Add the device details as they are installed.">
          {textField("ont")}{textField("ontSerial")}{textField("voiceTestNo")}{textField("voiceTestNoNew")}{textField("stb")}{textField("stbSerial")}{textField("phoneNumber", "Contact number")}
        </Card>}
        {props.page === 4 && <>
          <Card title="Team" subtitle="Select everyone who worked on this entry.">
            {props.workers.length ? <View style={styles.workerGrid}>{props.workers.map((worker) => {
              const selected = workerIds(entry).includes(worker.id);
              return <Pressable key={worker.id} onPress={() => props.setEntry({ workAssignments: selected ? entry.workAssignments.filter((item) => item.workerId !== worker.id) : [...entry.workAssignments, { workerId: worker.id, workerName: worker.fullName }] })} style={[styles.workerChip, selected && styles.workerChipSelected]}><View style={[styles.workerInitial, selected && styles.workerInitialSelected]}><Text style={[styles.workerInitialText, selected && styles.workerInitialTextSelected]}>{worker.fullName.split(/\s+/).map((part) => part[0]).slice(0, 2).join("").toUpperCase()}</Text></View><Text style={styles.workerName}>{worker.fullName}</Text><Text style={[styles.checkbox, selected && styles.checkboxSelected]}>{selected ? "✓" : ""}</Text></Pressable>;
            })}</View> : <Text style={styles.subtle}>{props.online ? "No active workers are listed." : "Worker list is available after it has synced once."}</Text>}
          </Card>
          <Card title="Review this entry" subtitle="Check the key details before finishing.">
            <ReviewRow label="Telephone" value={entry.telephoneNo} /><ReviewRow label="Customer" value={entry.name || "Not added"} /><ReviewRow label="Location" value={entry.address || "Not added"} /><ReviewRow label="DP" value={entry.dp || "Required to complete"} /><ReviewRow label="Cable total" value={`${lengths.total.toFixed(2)} m`} /><ReviewRow label="Crew" value={entry.workAssignments.map((worker) => worker.workerName).join(", ") || "Not selected"} />
            {!entry.id.startsWith("local:") && <SecondaryButton label="View edit history" onPress={props.onHistory} />}
            {entry.status === "completed" && <InlineNotice text="This entry is complete. New edits will be added to its history." tone="success" />}
          </Card>
        </>}
      </ScrollView>
    </KeyboardAvoidingView>
    <View style={styles.bottomActions}>
      <Pressable style={styles.secondaryAction} onPress={props.onBack}><Text style={styles.secondaryActionText}>{props.page === 0 ? "Close" : "Back"}</Text></Pressable>
      {props.page < pages.length - 1 ? <Pressable style={styles.primaryAction} onPress={props.onNext}><Text style={styles.primaryActionText}>{props.saving ? "Saving…" : "Save & continue  →"}</Text></Pressable> : <Pressable style={[styles.primaryAction, !entry.dp?.trim() && styles.disabledAction]} onPress={props.onComplete}><Text style={styles.primaryActionText}>{entry.status === "completed" ? "Save changes" : "Mark complete"}</Text></Pressable>}
    </View>
    {props.message ? <View style={styles.stickyNotice}><InlineNotice text={props.message} tone={props.message.toLowerCase().includes("could not") || props.message.toLowerCase().includes("invalid") ? "error" : "info"} onPress={props.onRetrySync} /></View> : null}
  </SafeAreaView>;
}

function pageHint(page: number) {
  return ["Open a fresh page for one installation.", "Capture the customer and the place the team worked.", "Record the power readings and cable marks.", "Add equipment and serial numbers when available.", "Choose the crew, review, and finish when ready."][page];
}

function ConflictCard(props: { conflict: EntryConflict; entry: Entry; remote: Entry | null; choices: Record<string, "phone" | "server">; setChoice: (field: string, choice: "phone" | "server") => void; onReview: () => void; onResolve: () => void; onOpenExisting: () => void; onDiscard: () => void; onSaveAsNew: () => void; online: boolean }) {
  const queuedFields = props.conflict.conflictingFields || Object.keys(props.conflict.fields || {});
  return <View style={styles.conflictCard}>
    <Text style={styles.conflictTitle}>{props.conflict.existingId ? "Possible duplicate entry" : "Review changed values"}</Text>
    <Text style={styles.conflictText}>{props.conflict.message}</Text>
    {!props.conflict.existingId && props.remote ? <>
      <Text style={styles.conflictText}>Choose which value to keep for each changed field.</Text>
      {queuedFields.map((field) => <View key={field} style={styles.conflictField}>
        <Text style={styles.conflictFieldLabel}>{labels[field] || field}</Text>
        <View style={styles.conflictChoices}>
          <Pressable style={[styles.conflictChoice, props.choices[field] !== "server" && styles.conflictChoiceSelected]} onPress={() => props.setChoice(field, "phone")}><Text style={styles.conflictChoiceTitle}>This phone</Text><Text style={styles.conflictChoiceValue}>{String(localValue(props.entry, field) ?? "—")}</Text></Pressable>
          <Pressable style={[styles.conflictChoice, props.choices[field] === "server" && styles.conflictChoiceSelected]} onPress={() => props.setChoice(field, "server")}><Text style={styles.conflictChoiceTitle}>On server</Text><Text style={styles.conflictChoiceValue}>{String(localValue(props.remote!, field) ?? "—")}</Text></Pressable>
        </View>
      </View>)}
      <PrimaryButton label="Save these choices" onPress={props.onResolve} />
    </> : props.conflict.existingId ? <>
      <SecondaryButton label="Open the existing entry" onPress={props.onOpenExisting} />
      <Pressable onPress={props.onDiscard} style={styles.discardLink}><Text style={styles.discardLinkText}>Discard this local draft</Text></Pressable>
    </> : <>
      <SecondaryButton label="Check the latest server version" onPress={props.onReview} />
      {props.online && !props.conflict.existingId ? <SecondaryButton label="Keep these notes as a new entry" onPress={props.onSaveAsNew} /> : null}
    </>}
  </View>;
}

function localValue(entry: Entry, field: string): unknown { return field === "workerIds" ? workerIds(entry).join(", ") : (entry as any)[field]; }

function HistoryScreen(props: { rows: any[]; onBack: () => void }) {
  return <SafeAreaView style={styles.safe}><StatusBar style={darkTheme ? "light" : "dark"} /><TopBack title="Entry history" onBack={props.onBack} /><ScrollView contentContainerStyle={styles.formContent}>
    <Text style={styles.heroSmall}>What changed</Text><Text style={styles.body}>Previous values are kept for review. Edit the current entry to correct a mistake.</Text>
    {props.rows.length ? props.rows.map((row) => <View key={row.id} style={styles.historyCard}><Text style={styles.historyActor}>{row.actor}</Text><Text style={styles.subtle}>{new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Colombo" }).format(new Date(row.createdAt))}</Text>{(row.changedFields || []).map((field: string) => <View key={field} style={styles.historyRow}><Text style={styles.historyField}>{labels[field] || field}</Text><Text style={styles.historyValues}>{String(row.beforeValues?.[field] ?? "—")}  →  {String(row.afterValues?.[field] ?? "—")}</Text></View>)}</View>) : <View style={styles.emptyCard}><Text style={styles.body}>No earlier saved changes.</Text></View>}
  </ScrollView></SafeAreaView>;
}

function SessionScreen(props: { sessions: any[]; currentUser: AppUser; onBack: () => void; onRevoke: (id: string) => void }) {
  return <SafeAreaView style={styles.safe}><StatusBar style={darkTheme ? "light" : "dark"} /><TopBack title="Devices & access" onBack={props.onBack} /><ScrollView contentContainerStyle={styles.formContent}>
    <Text style={styles.heroSmall}>Signed-in devices</Text><Text style={styles.body}>Revoke access from any NNS Enterprise Android session.</Text>
    {props.sessions.map((session) => <View key={session.id} style={styles.sessionCard}><View style={styles.flex}><Text style={styles.sessionName}>{session.deviceName || "Android device"}</Text><Text style={styles.subtle}>Last used {new Date(session.lastUsedAt).toLocaleString()}</Text><Text style={styles.subtle}>Expires {new Date(session.expiresAt).toLocaleDateString()}</Text></View><Pressable onPress={() => props.onRevoke(session.id)} style={styles.revokeButton}><Text style={styles.revokeText}>Revoke</Text></Pressable></View>)}
    <Text style={styles.footnote}>Changing your password or resetting it also invalidates all signed-in mobile sessions.</Text>
  </ScrollView></SafeAreaView>;
}

function TopBack(props: { title: string; onBack: () => void }) { return <View style={styles.entryTopBar}><Pressable onPress={props.onBack} style={styles.backButton}><Text style={styles.backArrow}>‹</Text></Pressable><Text style={styles.entryTopTitle}>{props.title}</Text></View>; }

function Card(props: { title: string; subtitle?: string; children: React.ReactNode }) { return <View style={styles.formCard}><Text style={styles.cardTitle}>{props.title}</Text>{props.subtitle ? <Text style={styles.cardSubtitle}>{props.subtitle}</Text> : null}{props.children}</View>; }
function Field(props: { label: string; value: string; onChangeText: (value: string) => void; placeholder?: string; keyboardType?: any; autoCapitalize?: any; secureTextEntry?: boolean; multiline?: boolean; warning?: string }) {
  return <View style={styles.fieldGroup}><Text style={styles.fieldLabel}>{props.label}</Text><TextInput value={props.value} onChangeText={props.onChangeText} placeholder={props.placeholder} placeholderTextColor="#8ba0ab" keyboardType={props.keyboardType} autoCapitalize={props.autoCapitalize || "sentences"} secureTextEntry={props.secureTextEntry} multiline={props.multiline} textAlignVertical={props.multiline ? "top" : "center"} style={[styles.input, props.multiline && styles.inputMultiline, props.warning && styles.inputWarning]} /></View>;
}
function InlineNotice(props: { text: string; tone?: "info" | "error" | "success"; onPress?: () => void }) {
  const tone = props.tone || "info";
  return <Pressable onPress={props.onPress} style={[styles.notice, tone === "error" && styles.noticeError, tone === "success" && styles.noticeSuccess]}><Text style={styles.noticeText}>{props.text}</Text>{props.onPress ? <Text style={styles.noticeAction}>Tap to retry</Text> : null}</Pressable>;
}
function PrimaryButton(props: { label: string; onPress: () => void; disabled?: boolean }) { return <Pressable onPress={props.onPress} disabled={props.disabled} style={[styles.primaryButton, props.disabled && styles.disabledAction]}><Text style={styles.primaryButtonText}>{props.label}</Text></Pressable>; }
function SecondaryButton(props: { label: string; onPress: () => void; disabled?: boolean }) { return <Pressable onPress={props.onPress} disabled={props.disabled} style={[styles.secondaryButton, props.disabled && styles.disabledSecondary]}><Text style={styles.secondaryButtonText}>{props.label}</Text></Pressable>; }
function Centered(props: { children: React.ReactNode }) { return <SafeAreaView style={styles.centered}><StatusBar style={darkTheme ? "light" : "dark"} />{props.children}</SafeAreaView>; }
function Measure(props: { label: string; value: number }) { return <View style={styles.measure}><Text style={styles.measureLabel}>{props.label}</Text><Text style={styles.measureValue}>{props.value.toFixed(2)} m</Text></View>; }
function ReviewRow(props: { label: string; value: string }) { return <View style={styles.reviewRow}><Text style={styles.reviewLabel}>{props.label}</Text><Text style={styles.reviewValue}>{props.value}</Text></View>; }

function createStyles(C: Palette) { return StyleSheet.create({
  flex: { flex: 1 }, safe: { flex: 1, backgroundColor: C.paper }, centered: { flex: 1, backgroundColor: C.paper, alignItems: "center", justifyContent: "center", padding: 28, gap: 10 }, heading: { color: C.ink, fontSize: 20, fontWeight: "800" },
  signInScroll: { flexGrow: 1, justifyContent: "center", padding: 22, paddingBottom: 32 },
  signInBrand: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 30 }, logo: { width: 52, height: 52, borderRadius: 18, backgroundColor: C.blue, alignItems: "center", justifyContent: "center" }, logoText: { color: "#fff", fontSize: 23, fontWeight: "800" }, smallLogo: { width: 38, height: 38, borderRadius: 14, backgroundColor: C.blue, alignItems: "center", justifyContent: "center" }, serverBadge: { borderRadius: 12, backgroundColor: C.pale, padding: 12, marginTop: 14 }, serverBadgeText: { color: C.blue, fontSize: 12, fontWeight: "700" },
  appName: { color: C.ink, fontWeight: "800", fontSize: 18 }, subtle: { color: C.muted, fontSize: 13 }, brandMark: { color: C.blue, fontWeight: "900", fontSize: 32 }, signInCard: { backgroundColor: C.card, borderColor: C.line, borderWidth: 1, borderRadius: 25, padding: 22, shadowColor: "#123e5a", shadowOpacity: 0.06, shadowRadius: 20, elevation: 2 },
  eyebrow: { color: C.bright, fontSize: 11, fontWeight: "800", letterSpacing: 1.7 }, hero: { color: C.ink, fontSize: 29, lineHeight: 35, fontWeight: "800", marginTop: 10 }, heroSmall: { color: C.ink, fontSize: 25, lineHeight: 31, fontWeight: "800", marginTop: 5 }, body: { color: C.muted, fontSize: 14, lineHeight: 21, marginTop: 8 },
  fieldGroup: { marginTop: 15 }, fieldLabel: { color: C.ink, fontSize: 13, fontWeight: "700", marginBottom: 7 }, input: { minHeight: 50, borderWidth: 1, borderColor: C.line, borderRadius: 14, backgroundColor: C.input, paddingHorizontal: 14, paddingVertical: 11, color: C.ink, fontSize: 16 }, inputMultiline: { minHeight: 92, paddingTop: 12 }, inputWarning: { borderColor: C.warn, backgroundColor: C.errorBg }, fieldHelp: { color: C.muted, fontSize: 12, marginTop: 7, lineHeight: 17 },
  primaryButton: { minHeight: 52, borderRadius: 15, backgroundColor: C.blue, alignItems: "center", justifyContent: "center", paddingHorizontal: 18, marginTop: 17 }, primaryButtonText: { color: C.paper, fontSize: 16, fontWeight: "800" }, secondaryButton: { minHeight: 48, borderWidth: 1, borderColor: C.line, borderRadius: 14, backgroundColor: C.card, alignItems: "center", justifyContent: "center", paddingHorizontal: 16, marginTop: 12 }, secondaryButtonText: { color: C.blue, fontSize: 14, fontWeight: "700" }, disabledAction: { opacity: 0.55 }, disabledSecondary: { opacity: 0.5 },
  notice: { backgroundColor: C.pale, borderRadius: 12, padding: 12, marginTop: 12, borderWidth: 1, borderColor: C.line }, noticeError: { backgroundColor: C.errorBg, borderColor: C.errorLine }, noticeSuccess: { backgroundColor: C.successBg, borderColor: C.successLine }, noticeText: { color: C.ink, fontSize: 13, lineHeight: 18 }, noticeAction: { color: C.blue, fontSize: 12, fontWeight: "700", marginTop: 5 }, orRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 18 }, rule: { height: 1, backgroundColor: C.line, flex: 1 }, footnote: { color: C.muted, fontSize: 11, lineHeight: 16, textAlign: "center", marginTop: 17 }, footer: { color: C.muted, fontSize: 11, textAlign: "center", marginTop: 22 },
  topBar: { minHeight: 65, paddingHorizontal: 20, flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: C.paper }, brandInline: { flexDirection: "row", gap: 10, alignItems: "center" }, iconButton: { width: 40, height: 40, borderRadius: 14, backgroundColor: C.pale, alignItems: "center", justifyContent: "center" }, iconText: { color: C.blue, fontSize: 18, fontWeight: "900", letterSpacing: 2 }, fieldMark: { borderWidth: 1, borderColor: C.line, backgroundColor: C.card, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 5, transform: [{ rotate: "-3deg" }] }, fieldMarkText: { color: C.bright, fontSize: 8, fontWeight: "900", letterSpacing: 1.2 },
  connectionStrip: { minHeight: 34, paddingHorizontal: 20, flexDirection: "row", alignItems: "center", gap: 8, borderBottomWidth: 1, borderColor: C.line }, statusDot: { width: 8, height: 8, borderRadius: 9 }, connectionText: { color: C.muted, fontSize: 11, flex: 1 }, bookContent: { padding: 20, paddingBottom: 24, gap: 14 }, bookHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 4, marginBottom: 5 }, pageStamp: { width: 64, height: 72, borderRadius: 14, borderWidth: 1, borderColor: C.line, backgroundColor: C.card, alignItems: "center", justifyContent: "center", transform: [{ rotate: "3deg" }] }, pageStampSmall: { color: C.bright, fontSize: 9, fontWeight: "900", letterSpacing: 1.2 }, pageStampValue: { color: C.blue, fontSize: 27, fontWeight: "800", marginTop: 2 },
  dateSelector: { flexDirection: "row", alignItems: "center", gap: 13, borderRadius: 17, borderWidth: 1, borderColor: C.line, backgroundColor: C.card, padding: 12 }, dateNudge: { minWidth: 42, minHeight: 42, borderRadius: 13, backgroundColor: C.pale, alignItems: "center", justifyContent: "center", paddingHorizontal: 9 }, dateNudgeText: { color: C.blue, fontSize: 27, fontWeight: "500", marginTop: -3 }, todayButtonText: { color: C.blue, fontSize: 12, fontWeight: "800" }, sectionEyebrow: { color: C.muted, fontSize: 9, fontWeight: "800", letterSpacing: 1 }, dateTitle: { color: C.ink, fontSize: 15, fontWeight: "700", marginTop: 3 }, sectionHeadingRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 13 }, sectionTitle: { color: C.ink, fontSize: 18, fontWeight: "800" }, countBadge: { color: C.blue, backgroundColor: C.pale, minWidth: 31, textAlign: "center", overflow: "hidden", paddingHorizontal: 8, paddingVertical: 6, borderRadius: 12, fontSize: 12, fontWeight: "800" },
  entryCard: { backgroundColor: C.card, borderWidth: 1, borderColor: C.line, borderRadius: 17, marginTop: 10, overflow: "hidden" }, entryCardCompact: { borderRadius: 14, marginTop: 7 }, entryCardMain: { flexDirection: "row", alignItems: "center", padding: 13, gap: 11 }, entryNumber: { width: 42, height: 46, borderRadius: 13, backgroundColor: C.pale, alignItems: "center", justifyContent: "center" }, entryNumberText: { color: C.blue, fontSize: 15, fontWeight: "800" }, entryCardText: { flex: 1, minWidth: 0 }, entryPhone: { color: C.ink, fontSize: 15, fontWeight: "800" }, entryLocation: { color: C.muted, fontSize: 12, marginTop: 2 }, entryMeta: { color: C.muted, fontSize: 10, marginTop: 5 }, cardStatus: { alignItems: "center", gap: 5, minWidth: 42 }, cardStatusText: { color: C.muted, fontSize: 9, fontWeight: "800" }, historyLink: { borderTopWidth: 1, borderColor: C.line, paddingHorizontal: 14, paddingVertical: 8, alignItems: "flex-end" }, historyLinkText: { color: C.blue, fontSize: 11, fontWeight: "700" }, conflictPreview: { marginHorizontal: 13, marginBottom: 12, color: C.warn, fontSize: 12 }, pastDay: { marginTop: 13 }, pastDayHeading: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 2, marginBottom: 3 }, pastDayTitle: { color: C.ink, fontSize: 14, fontWeight: "800" }, signOut: { alignItems: "center", padding: 10 },
  emptyCard: { alignItems: "center", backgroundColor: C.card, borderWidth: 1, borderColor: C.line, borderStyle: "dashed", borderRadius: 19, padding: 20, marginTop: 8 }, emptyIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: C.pale, alignItems: "center", justifyContent: "center" }, emptyIconText: { color: C.bright, fontSize: 23, fontWeight: "800" }, emptyTitle: { color: C.ink, fontSize: 16, fontWeight: "800", marginTop: 10 },
  entryTopBar: { minHeight: 64, backgroundColor: C.paper, borderBottomWidth: 1, borderColor: C.line, flexDirection: "row", alignItems: "center", paddingHorizontal: 14, gap: 11 }, backButton: { width: 40, height: 40, borderRadius: 13, backgroundColor: C.card, borderWidth: 1, borderColor: C.line, alignItems: "center", justifyContent: "center" }, backArrow: { color: C.blue, fontSize: 29, marginTop: -4 }, entryTopTitle: { color: C.ink, fontSize: 16, fontWeight: "800" }, saveBadge: { backgroundColor: C.successBg, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6 }, saveBadgeWorking: { backgroundColor: C.yellow }, saveBadgeText: { color: C.good, fontSize: 10, fontWeight: "800" }, progressWrap: { paddingHorizontal: 18, paddingTop: 13, paddingBottom: 10, backgroundColor: C.card, borderBottomWidth: 1, borderColor: C.line }, progressHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" }, progressPercent: { color: C.blue, fontSize: 11, fontWeight: "800" }, progressTrack: { height: 4, borderRadius: 5, backgroundColor: C.line, marginTop: 8, overflow: "hidden" }, progressFill: { height: 4, backgroundColor: C.bright, borderRadius: 5 }, steps: { paddingTop: 12, paddingBottom: 2, alignItems: "center" }, stepItem: { flexDirection: "row", alignItems: "center" }, stepCircle: { width: 23, height: 23, borderRadius: 12, backgroundColor: C.pale, alignItems: "center", justifyContent: "center" }, stepCircleActive: { backgroundColor: C.blue }, stepNum: { color: C.muted, fontSize: 10, fontWeight: "800" }, stepNumActive: { color: C.paper }, stepLabel: { color: C.muted, fontSize: 9, marginLeft: 5, marginRight: 6 }, stepLabelActive: { color: C.blue, fontWeight: "800" }, stepConnector: { width: 13, height: 1, backgroundColor: C.line }, stepConnectorActive: { backgroundColor: C.bright }, formContent: { padding: 17, paddingBottom: 24, gap: 12 }, pageHeading: { marginBottom: 2 }, formCard: { borderWidth: 1, borderColor: C.line, borderRadius: 18, backgroundColor: C.card, padding: 15, marginBottom: 2 }, cardTitle: { color: C.ink, fontSize: 16, fontWeight: "800" }, cardSubtitle: { color: C.muted, fontSize: 12, lineHeight: 17, marginTop: 4, marginBottom: 2 }, paperNote: { borderLeftWidth: 3, borderColor: C.bright, backgroundColor: C.pale, padding: 11, borderRadius: 9, marginTop: 13 }, paperNoteTitle: { color: C.blue, fontSize: 12, fontWeight: "800" }, paperNoteText: { color: C.muted, fontSize: 11, lineHeight: 16, marginTop: 3 },
  readingRow: { flexDirection: "row", gap: 9 }, measurements: { flexDirection: "row", gap: 7, marginTop: 15 }, measure: { flex: 1, backgroundColor: C.pale, padding: 9, borderRadius: 12 }, measureLabel: { color: C.blue, fontSize: 10, fontWeight: "700" }, measureValue: { color: C.ink, fontSize: 13, fontWeight: "800", marginTop: 5 }, workerGrid: { gap: 8, marginTop: 12 }, workerChip: { borderWidth: 1, borderColor: C.line, borderRadius: 14, paddingHorizontal: 10, paddingVertical: 8, flexDirection: "row", gap: 9, alignItems: "center" }, workerChipSelected: { borderColor: C.bright, backgroundColor: C.pale }, workerInitial: { width: 30, height: 30, borderRadius: 11, backgroundColor: C.pale, alignItems: "center", justifyContent: "center" }, workerInitialSelected: { backgroundColor: C.blue }, workerInitialText: { color: C.muted, fontSize: 9, fontWeight: "800" }, workerInitialTextSelected: { color: "#fff" }, workerName: { color: C.ink, fontSize: 13, flex: 1 }, checkbox: { width: 19, height: 19, borderRadius: 6, borderWidth: 1.5, borderColor: C.muted, color: "#fff", textAlign: "center", fontSize: 12, overflow: "hidden" }, checkboxSelected: { backgroundColor: C.blue, borderColor: C.blue }, reviewRow: { borderBottomWidth: 1, borderColor: C.line, paddingVertical: 9, flexDirection: "row", justifyContent: "space-between", gap: 12 }, reviewLabel: { color: C.muted, fontSize: 12 }, reviewValue: { color: C.ink, fontSize: 12, fontWeight: "700", flex: 1, textAlign: "right" },
  bottomActions: { backgroundColor: C.card, borderTopWidth: 1, borderColor: C.line, flexDirection: "row", paddingHorizontal: 15, paddingTop: 10, paddingBottom: Platform.OS === "android" ? 12 : 20, gap: 10 }, secondaryAction: { minHeight: 49, paddingHorizontal: 18, borderRadius: 14, backgroundColor: C.raised, alignItems: "center", justifyContent: "center" }, secondaryActionText: { color: C.blue, fontWeight: "800", fontSize: 14 }, primaryAction: { flex: 1, minHeight: 49, backgroundColor: C.blue, borderRadius: 14, alignItems: "center", justifyContent: "center" }, primaryActionText: { color: C.paper, fontSize: 14, fontWeight: "800" }, stickyNotice: { backgroundColor: C.paper, paddingHorizontal: 12, paddingBottom: 8 },
  conflictCard: { borderWidth: 1, borderColor: C.errorLine, backgroundColor: C.errorBg, borderRadius: 16, padding: 13, marginBottom: 3 }, conflictTitle: { color: C.warn, fontSize: 15, fontWeight: "800" }, conflictText: { color: C.ink, fontSize: 12, lineHeight: 17, marginTop: 6 }, conflictField: { borderTopWidth: 1, borderColor: C.errorLine, paddingTop: 9, marginTop: 9 }, conflictFieldLabel: { color: C.ink, fontSize: 12, fontWeight: "800", marginBottom: 6 }, conflictChoices: { flexDirection: "row", gap: 7 }, conflictChoice: { flex: 1, borderWidth: 1, borderColor: C.line, borderRadius: 11, backgroundColor: C.card, padding: 8 }, conflictChoiceSelected: { borderColor: C.bright, backgroundColor: C.pale }, conflictChoiceTitle: { color: C.muted, fontSize: 9, fontWeight: "800", textTransform: "uppercase" }, conflictChoiceValue: { color: C.ink, fontSize: 11, marginTop: 4 }, discardLink: { alignItems: "center", padding: 10 }, discardLinkText: { color: C.warn, fontSize: 12, fontWeight: "700" },
  historyCard: { borderWidth: 1, borderColor: C.line, borderRadius: 16, backgroundColor: C.card, padding: 14, marginTop: 12 }, historyActor: { color: C.ink, fontSize: 14, fontWeight: "800" }, historyRow: { borderTopWidth: 1, borderColor: C.line, paddingTop: 8, marginTop: 8 }, historyField: { color: C.muted, fontSize: 11, fontWeight: "700" }, historyValues: { color: C.ink, fontSize: 12, marginTop: 4 }, sessionCard: { flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1, borderColor: C.line, backgroundColor: C.raised, borderRadius: 15, padding: 13, marginTop: 11 }, sessionName: { color: C.ink, fontSize: 14, fontWeight: "800", marginBottom: 3 }, revokeButton: { backgroundColor: C.errorBg, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9 }, revokeText: { color: C.warn, fontWeight: "800", fontSize: 12 },
  tabBar: { flexDirection: "row", minHeight: 68, paddingTop: 7, paddingBottom: Platform.OS === "android" ? 7 : 17, paddingHorizontal: 12, backgroundColor: C.card, borderTopWidth: 1, borderColor: C.line },
  tabButton: { flex: 1, alignItems: "center", justifyContent: "center", gap: 3, minHeight: 48 }, tabIconWrap: { width: 40, height: 30, borderRadius: 11, alignItems: "center", justifyContent: "center", position: "relative" }, tabIconWrapActive: { backgroundColor: C.pale }, tabIcon: { color: C.muted, fontSize: 19, fontWeight: "700" }, tabIconActive: { color: C.blue }, tabLabel: { color: C.muted, fontSize: 10, fontWeight: "700" }, tabLabelActive: { color: C.blue, fontWeight: "900" }, tabBadge: { position: "absolute", right: 1, top: -2, width: 15, height: 15, borderRadius: 8, backgroundColor: C.bright, alignItems: "center", justifyContent: "center" }, tabBadgeText: { color: "#fff", fontSize: 8, fontWeight: "900" },
  screenHeader: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 12, backgroundColor: C.paper }, accountContent: { paddingHorizontal: 18, paddingTop: 5, paddingBottom: 22, gap: 14 }, reviewSummary: { flexDirection: "row", alignItems: "center", gap: 12, marginHorizontal: 18, marginTop: 5, padding: 13, borderRadius: 16, borderWidth: 1, borderColor: C.line, backgroundColor: C.card }, reviewSummaryIcon: { width: 42, height: 42, borderRadius: 13, backgroundColor: C.pale, alignItems: "center", justifyContent: "center" }, reviewSummaryGlyph: { color: C.blue, fontSize: 23, fontWeight: "800" }, reviewCount: { color: C.blue, fontSize: 22, fontWeight: "900" }, reviewItem: { flexDirection: "row", alignItems: "center", gap: 11, padding: 13, marginTop: 8, borderWidth: 1, borderColor: C.line, borderRadius: 15, backgroundColor: C.card }, reviewItemStamp: { width: 36, height: 40, alignItems: "center", justifyContent: "center", backgroundColor: C.pale, borderRadius: 10, borderWidth: 1, borderColor: C.line, transform: [{ rotate: "-2deg" }] }, reviewItemStampWarn: { backgroundColor: C.errorBg, borderColor: C.errorLine }, reviewItemStampText: { color: C.blue, fontSize: 18, fontWeight: "900" }, reviewItemStampTextWarn: { color: C.warn }, reviewArrow: { color: C.bright, fontSize: 27, fontWeight: "400" },
  appearanceChoices: { gap: 8, marginTop: 12 }, appearanceChoice: { flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1, borderColor: C.line, borderRadius: 13, padding: 11, backgroundColor: C.raised }, appearanceChoiceSelected: { borderColor: C.bright, backgroundColor: C.pale }, appearanceDot: { width: 21, height: 21, borderRadius: 11, borderWidth: 1.5, borderColor: C.muted, alignItems: "center", justifyContent: "center" }, appearanceDotSelected: { borderColor: C.blue, backgroundColor: C.blue }, appearanceCheck: { color: C.paper, fontSize: 12, fontWeight: "900" }, appearanceTitle: { color: C.ink, fontSize: 14, fontWeight: "800" }, appearanceCaption: { color: C.muted, fontSize: 11, marginTop: 1 }, refreshSessions: { alignSelf: "flex-start", paddingVertical: 8 }, refreshSessionsText: { color: C.blue, fontSize: 12, fontWeight: "800" }, sessionSeal: { width: 36, height: 38, borderRadius: 11, alignItems: "center", justifyContent: "center", backgroundColor: C.pale }, sessionSealText: { color: C.blue, fontWeight: "900" }, signOutButton: { minHeight: 49, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: C.errorLine, backgroundColor: C.errorBg, borderRadius: 14 }, signOutButtonText: { color: C.warn, fontSize: 14, fontWeight: "800" }, accountFooter: { textAlign: "center", color: C.muted, fontSize: 11, marginTop: 2 },
}); }
