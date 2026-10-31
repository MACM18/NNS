"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BookOpen, CalendarDays, Check, CheckCircle2, ChevronLeft, ChevronRight, Clock3, History, Loader2, Plus, Save, UserRound, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type Worker = { id: string; fullName: string };
type Entry = {
  id: string; date: string; telephoneNo: string; dp: string | null; name: string | null; address: string | null;
  status: string | null; powerDp: number | string; powerInbox: number | string; cableStart: number; cableMiddle: number; cableEnd: number;
  ont: string | null; voiceTestNo: string | null; stb: string | null; ontSerial: string | null; voiceTestNoNew: string | null; stbSerial: string | null; phoneNumber: string | null;
  workAssignments: { workerId: string; workerName: string }[];
};
type Revision = { id: string; createdAt: string; actor: string; changedFields: string[]; beforeValues: Record<string, unknown> | null; afterValues: Record<string, unknown> };

const fieldLabels: Record<string, string> = {
  telephoneNo: "Telephone number", date: "Date", name: "Customer name", address: "Address", dp: "DP", powerDp: "DP power", powerInbox: "Inbox power",
  cableStart: "Cable start reading", cableMiddle: "Cable middle reading", cableEnd: "Cable end reading", ont: "ONT", voiceTestNo: "Voice test number",
  stb: "STB", ontSerial: "ONT serial", voiceTestNoNew: "Voice test number (new)", stbSerial: "STB serial", phoneNumber: "Contact number", status: "Status", workerIds: "Assigned workers",
};

function todayInColombo() {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Colombo", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function displayDate(date: string) {
  return new Intl.DateTimeFormat("en", { dateStyle: "full", timeZone: "Asia/Colombo" }).format(new Date(`${date}T00:00:00+05:30`));
}

function shortDate(date: string, offset: number) {
  const value = new Date(`${date}T00:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + offset);
  return value.toISOString().slice(0, 10);
}

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}

function formatValue(value: unknown) {
  if (value == null || value === "") return "—";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

export default function DailyBookPage() {
  const [date, setDate] = useState(todayInColombo);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [recentEntries, setRecentEntries] = useState<Entry[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [workerSelection, setWorkerSelection] = useState<string[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [entryDraft, setEntryDraft] = useState<Partial<Entry>>({});
  const [newPhone, setNewPhone] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [history, setHistory] = useState<Revision[]>([]);
  const selectedIdRef = useRef<string | null>(null);
  const workerSelectionRef = useRef<string[]>([]);
  const workerSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fieldSaveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  selectedIdRef.current = selectedId;
  const selectedEntry = useMemo(() => entries.find((entry) => entry.id === selectedId) ?? null, [entries, selectedId]);

  const loadDay = useCallback(async (nextDate: string, preserveSelection = false) => {
    setLoading(true); setError(null);
    try {
      const response = await fetch(`/api/daily-book?date=${encodeURIComponent(nextDate)}`);
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Could not load the Daily Book");
      const rows = payload.data as Entry[];
      setEntries(rows); setWorkers(payload.workers || []);
      if (!preserveSelection) {
        setSelectedId(rows[0]?.id ?? null);
        setEntryDraft(rows[0] ?? {});
        workerSelectionRef.current = rows[0]?.workAssignments.map((assignment) => assignment.workerId) ?? [];
        setWorkerSelection(workerSelectionRef.current);
      } else if (selectedIdRef.current) {
        const refreshed = rows.find((row) => row.id === selectedIdRef.current);
        if (refreshed) {
          setEntryDraft(refreshed);
          workerSelectionRef.current = refreshed.workAssignments.map((assignment) => assignment.workerId);
          setWorkerSelection(workerSelectionRef.current);
        }
      }
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not load the Daily Book"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void loadDay(date, Boolean(selectedIdRef.current)); }, [date, loadDay]);
  useEffect(() => () => {
    Object.values(fieldSaveTimers.current).forEach(clearTimeout);
    if (workerSaveTimer.current) clearTimeout(workerSaveTimer.current);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const startDate = shortDate(date, -6);
    void fetch(`/api/daily-book?startDate=${startDate}&endDate=${date}`)
      .then((response) => response.json())
      .then((payload) => { if (!cancelled && Array.isArray(payload.data)) setRecentEntries(payload.data); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [date]);

  const navigateDate = (nextDate: string) => { setSelectedId(null); setDate(nextDate); };

  const createEntry = async () => {
    if (!newPhone.trim()) { setError("Enter the telephone number to start this entry."); return; }
    setSaving(true); setError(null);
    try {
      const response = await fetch("/api/daily-book", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ date, telephoneNo: newPhone }) });
      const payload = await response.json();
      if (response.status === 409 && payload.existingId) {
        const listResponse = await fetch(`/api/daily-book?date=${encodeURIComponent(date)}`);
        const listPayload = await listResponse.json();
        const rows = (listPayload.data || []) as Entry[];
        setEntries(rows); setWorkers(listPayload.workers || []);
        const existing = rows.find((entry) => entry.id === payload.existingId);
        if (existing) selectEntry(existing);
        setNewPhone("");
        setError("That phone already has an entry for this date. It is open for you to continue.");
        return;
      }
      if (!response.ok) throw new Error(payload.error || "Could not create entry");
      setNewPhone("");
      await loadDay(date);
      setSelectedId(payload.data.id);
      setEntryDraft(payload.data);
      workerSelectionRef.current = [];
      setWorkerSelection([]);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not create entry"); }
    finally { setSaving(false); }
  };

  const savePatch = async (patch: Record<string, unknown>, targetId: string | null = selectedId) => {
    if (!targetId) return false;
    setSaving(true); setError(null);
    try {
      const response = await fetch(`/api/daily-book/${targetId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Could not save changes");
      setSavedAt(new Date().toISOString());
      const assignmentIds = Array.isArray(patch.workerIds) ? patch.workerIds as string[] : null;
      const { workerIds: _workerIds, ...lineChanges } = patch;
      const merged = {
        ...lineChanges,
        ...(assignmentIds ? { workAssignments: workers.filter((worker) => assignmentIds.includes(worker.id)).map((worker) => ({ workerId: worker.id, workerName: worker.fullName })) } : {}),
      };
      setEntries((current) => current.map((entry) => entry.id === targetId ? { ...entry, ...merged } as Entry : entry));
      setRecentEntries((current) => current.map((entry) => entry.id === targetId ? { ...entry, ...merged } as Entry : entry));
      if (selectedIdRef.current === targetId) setEntryDraft((current) => ({ ...current, ...merged }));
      return true;
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not save changes"); return false; }
    finally { setSaving(false); }
  };

  const updateField = (field: keyof Entry, value: unknown) => setEntryDraft((draft) => ({ ...draft, [field]: value }));
  const scheduleFieldSave = (field: keyof Entry, value: unknown) => {
    const key = String(field);
    const targetId = selectedId;
    if (fieldSaveTimers.current[key]) clearTimeout(fieldSaveTimers.current[key]);
    fieldSaveTimers.current[key] = setTimeout(() => {
      void savePatch({ [key]: value === "" ? null : value }, targetId);
      delete fieldSaveTimers.current[key];
    }, 700);
  };
  const saveField = (field: keyof Entry) => {
    const key = String(field);
    if (fieldSaveTimers.current[key]) {
      clearTimeout(fieldSaveTimers.current[key]);
      delete fieldSaveTimers.current[key];
    }
    if (entryDraft[field] === selectedEntry?.[field]) return;
    void savePatch({ [field]: entryDraft[field] ?? null });
  };

  const selectEntry = (entry: Entry) => { setSelectedId(entry.id); setEntryDraft(entry); workerSelectionRef.current = entry.workAssignments.map((assignment) => assignment.workerId); setWorkerSelection(workerSelectionRef.current); setError(null); setSavedAt(null); if (entry.date !== date) setDate(entry.date); };

  const setWorkersForEntry = (workerId: string, checked: boolean) => {
    const current = workerSelectionRef.current;
    const next = checked ? [...new Set([...current, workerId])] : current.filter((id) => id !== workerId);
    const targetId = selectedId;
    workerSelectionRef.current = next;
    setWorkerSelection(next);
    if (workerSaveTimer.current) clearTimeout(workerSaveTimer.current);
    workerSaveTimer.current = setTimeout(() => { void savePatch({ workerIds: next }, targetId); }, 400);
  };

  const markCompleted = async () => {
    if (!String(entryDraft.dp || "").trim()) { setError("Add the DP before marking this entry completed."); return; }
    await savePatch({ dp: entryDraft.dp, status: "completed" });
  };

  const openHistory = async () => {
    if (!selectedId) return;
    setHistoryOpen(true);
    const response = await fetch(`/api/daily-book/${selectedId}/history`);
    const payload = await response.json();
    if (response.ok) setHistory(payload.data || []);
  };

  const inputField = (field: keyof Entry, label: string, type = "text", hint?: string, meterWarning = false) => {
    const value = entryDraft[field];
    const exceedsMeterLimit = meterWarning && value !== "" && value != null && Number(value) > 25;
    return <div className="min-w-0 space-y-0.5" key={String(field)}>
      <Label htmlFor={`daily-${String(field)}`} className="text-[11px] font-medium leading-4 text-muted-foreground">{label}</Label>
      <Input id={`daily-${String(field)}`} type={type} inputMode={type === "number" ? "decimal" : undefined}
        value={String(value ?? "")} onChange={(event) => { updateField(field, event.target.value); scheduleFieldSave(field, event.target.value); }}
        onBlur={() => saveField(field)} className={`h-8 min-w-0 max-w-full px-2.5 text-sm ${exceedsMeterLimit ? "border-red-500 bg-red-50 text-red-900 ring-1 ring-red-500/30 focus-visible:ring-red-500 dark:bg-red-950/30 dark:text-red-100" : ""}`} />
      {exceedsMeterLimit ? <p className="text-[10px] font-medium leading-3 text-red-700 dark:text-red-300">Over 25 · not acceptable</p> : hint ? <p className="text-[10px] leading-3 text-muted-foreground">{hint}</p> : null}
    </div>;
  };

  const reading = (field: keyof Entry) => {
    const value = Number(entryDraft[field]);
    return Number.isFinite(value) ? value : 0;
  };
  const f1 = Math.abs(reading("cableStart") - reading("cableMiddle"));
  const g1 = Math.abs(reading("cableMiddle") - reading("cableEnd"));
  const totalCable = f1 + g1;

  return <div className="mx-auto w-full max-w-[1600px] space-y-3 pb-3">
    <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div><p className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-primary"><BookOpen className="h-4 w-4" /> Field operations</p><h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Daily Book</h1><p className="mt-1 text-sm text-muted-foreground">Add today’s work as it happens. Entries save as you move through the fields.</p></div>
      <div className="flex items-center gap-2"><Button variant="outline" size="icon" aria-label="Previous day" onClick={() => navigateDate(shortDate(date, -1))}><ChevronLeft className="h-4 w-4" /></Button><div className="relative min-w-0 flex-1 sm:flex-none"><CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input type="date" value={date} onChange={(event) => event.target.value && navigateDate(event.target.value)} className="h-10 w-full pl-9 sm:w-[170px]" aria-label="Work date" /></div><Button variant="outline" size="icon" aria-label="Next day" onClick={() => navigateDate(shortDate(date, 1))}><ChevronRight className="h-4 w-4" /></Button></div>
    </header>

    {error && <div role="alert" className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">{error}</div>}
    <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(280px,360px)_minmax(0,1fr)]">
      <section className="min-w-0 space-y-3">
        <Card className="overflow-hidden rounded-2xl border-primary/15 bg-gradient-to-br from-primary/[0.08] to-background shadow-sm"><CardContent className="p-4 sm:p-5">
          <div className="mb-3 flex items-center gap-2"><div className="rounded-xl bg-primary/10 p-2 text-primary"><Plus className="h-4 w-4" /></div><div><h2 className="font-semibold">Start an entry</h2><p className="text-xs text-muted-foreground">Phone number is enough to begin.</p></div></div>
          <div className="flex gap-2"><Input value={newPhone} onChange={(event) => setNewPhone(event.target.value)} onKeyDown={(event) => event.key === "Enter" && void createEntry()} placeholder="Phone number" inputMode="tel" className="h-11 min-w-0" aria-label="New entry phone number" /><Button onClick={() => void createEntry()} disabled={saving || !newPhone.trim()} className="h-11 shrink-0"><Plus className="mr-1.5 h-4 w-4" /><span className="hidden sm:inline">Add</span></Button></div>
        </CardContent></Card>
        <div className="flex items-center justify-between px-1"><div><h2 className="font-semibold">{displayDate(date)}</h2><p className="text-xs text-muted-foreground">{entries.length} {entries.length === 1 ? "entry" : "entries"}</p></div><span className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">{entries.filter((entry) => entry.status === "completed").length} completed</span></div>
        <div className="space-y-2">
          {loading ? <div className="flex items-center justify-center rounded-2xl border py-10 text-muted-foreground"><Loader2 className="mr-2 h-4 w-4 animate-spin" />Loading entries</div> : entries.length === 0 ? <div className="rounded-2xl border border-dashed px-4 py-10 text-center"><CalendarDays className="mx-auto mb-3 h-7 w-7 text-muted-foreground/60" /><p className="font-medium">No entries for this day</p><p className="mt-1 text-sm text-muted-foreground">Start with a phone number above.</p></div> : entries.map((entry) => <button key={entry.id} onClick={() => selectEntry(entry)} className={`w-full min-w-0 rounded-2xl border p-3.5 text-left transition-colors ${entry.id === selectedId ? "border-primary/50 bg-primary/[0.06] shadow-sm" : "bg-card hover:bg-muted/50"}`}>
            <div className="flex min-w-0 items-start justify-between gap-2"><div className="min-w-0"><p className="truncate font-semibold tabular-nums">{entry.telephoneNo}</p><p className="mt-0.5 truncate text-sm text-muted-foreground">{entry.name || entry.dp || "Details not added yet"}</p></div><span className={`shrink-0 rounded-full px-2 py-1 text-[11px] font-medium ${entry.status === "completed" ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "bg-amber-500/10 text-amber-700 dark:text-amber-300"}`}>{entry.status === "completed" ? "Complete" : "In progress"}</span></div>
            {entry.workAssignments.length > 0 && <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground"><Users className="h-3.5 w-3.5" />{entry.workAssignments.map((assignment) => initials(assignment.workerName)).join(" · ")}</div>}
          </button>)}
        </div>
        {recentEntries.some((entry) => entry.date !== date) && <div className="space-y-3 border-t pt-4"><div className="px-1"><h3 className="text-sm font-semibold">Recent days</h3><p className="text-xs text-muted-foreground">Entries from the previous six days</p></div>{Object.entries(recentEntries.filter((entry) => entry.date !== date).reduce<Record<string, Entry[]>>((groups, entry) => { (groups[entry.date] ||= []).push(entry); return groups; }, {})).sort(([a], [b]) => b.localeCompare(a)).map(([groupDate, groupEntries]) => <div key={groupDate} className="space-y-1.5"><div className="flex items-center justify-between px-1"><h4 className="text-xs font-semibold text-muted-foreground">{displayDate(groupDate)}</h4><span className="text-[11px] text-muted-foreground">{groupEntries.length}</span></div>{groupEntries.map((entry) => <button key={entry.id} onClick={() => selectEntry(entry)} className={`flex w-full min-w-0 items-center justify-between gap-2 rounded-xl border px-3 py-2.5 text-left text-sm ${entry.id === selectedId ? "border-primary/50 bg-primary/[0.06]" : "bg-card hover:bg-muted/50"}`}><span className="min-w-0 truncate font-medium tabular-nums">{entry.telephoneNo}<span className="ml-2 font-normal text-muted-foreground">{entry.name || entry.dp || "Details pending"}</span></span><span className="shrink-0 text-[10px] text-muted-foreground">{entry.status === "completed" ? "Done" : "Open"}</span></button>)}</div>)}</div>}
      </section>

      <section className="min-w-0">
        {!selectedEntry ? <div className="flex min-h-[360px] flex-col items-center justify-center rounded-2xl border border-dashed bg-card/50 p-6 text-center"><UserRound className="mb-3 h-8 w-8 text-muted-foreground/50" /><h2 className="font-semibold">Choose an entry to continue</h2><p className="mt-1 max-w-sm text-sm text-muted-foreground">Create one with just a phone number, then fill in customer, cable, and equipment information when it’s available.</p></div> : <Card className="min-w-0 overflow-hidden rounded-2xl shadow-sm">
          <div className="flex flex-col gap-3 border-b bg-muted/20 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h2 className="truncate text-lg font-bold tabular-nums sm:text-xl">{selectedEntry.telephoneNo}</h2><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${selectedEntry.status === "completed" ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "bg-amber-500/10 text-amber-700 dark:text-amber-300"}`}>{selectedEntry.status === "completed" ? "Completed" : "In progress"}</span></div><p className="mt-1 text-sm text-muted-foreground">{selectedEntry.name || "Add customer details as they become available"}</p></div><div className="flex flex-wrap items-center gap-2"><span className="mr-auto flex items-center gap-1.5 text-xs text-muted-foreground sm:mr-1">{saving ? <><Loader2 className="h-3.5 w-3.5 animate-spin" />Saving</> : savedAt ? <><Check className="h-3.5 w-3.5 text-emerald-600" />Saved</> : <><Save className="h-3.5 w-3.5" />Auto-save on field exit</>}</span><Button variant="outline" size="sm" onClick={() => void openHistory()}><History className="mr-1.5 h-4 w-4" />History</Button>{selectedEntry.status !== "completed" && <Button size="sm" onClick={() => void markCompleted()}><CheckCircle2 className="mr-1.5 h-4 w-4" />Complete</Button>}</div></div>
          <CardContent className="min-w-0 p-3 sm:p-4">
            <div className="space-y-2.5">
              <section className="rounded-xl border bg-background/70 p-2.5 sm:p-3">
                <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-2"><h3 className="text-sm font-semibold">Customer & location</h3><p className="text-[11px] text-muted-foreground">Add details as they become available.</p></div>
                <div className="grid min-w-0 grid-cols-2 gap-x-2.5 gap-y-2 sm:grid-cols-2 lg:grid-cols-4">
                  {inputField("name", "Customer name")}{inputField("address", "Address")}{inputField("dp", "DP", "text", "Required before completing")}{inputField("phoneNumber", "Contact number")}
                </div>
              </section>
              <section className="rounded-xl border bg-background/70 p-2.5 sm:p-3">
                <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-2"><h3 className="text-sm font-semibold">Cable & signal readings</h3><p className="text-[11px] text-muted-foreground">DP and inbox power above 25 is highlighted; it won’t block saving.</p></div>
                <div className="grid min-w-0 grid-cols-2 gap-x-2.5 gap-y-2 sm:grid-cols-3 xl:grid-cols-8">
                  {inputField("powerDp", "DP power", "number", undefined, true)}{inputField("powerInbox", "Inbox power", "number", undefined, true)}{inputField("cableStart", "Cable start reading", "number")}{inputField("cableMiddle", "Cable middle reading", "number")}{inputField("cableEnd", "Cable end reading", "number")}
                  {[ ["F1", f1], ["G1", g1], ["Total", totalCable] ].map(([label, value]) => <div key={String(label)} className="flex min-w-0 flex-col justify-end rounded-lg bg-sky-50 px-2.5 py-1.5 dark:bg-sky-950/30"><p className="truncate text-[10px] font-medium leading-4 text-sky-800 dark:text-sky-200">{label} length</p><p className="truncate text-sm font-semibold tabular-nums text-sky-950 dark:text-sky-50">{Number(value).toFixed(2)} m</p></div>)}
                </div>
              </section>
              <section className="rounded-xl border bg-background/70 p-2.5 sm:p-3">
                <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-2"><h3 className="text-sm font-semibold">Equipment & team</h3><p className="text-[11px] text-muted-foreground">Device identifiers and assigned workers.</p></div>
                <div className="grid min-w-0 gap-3 xl:grid-cols-[minmax(0,1.5fr)_minmax(260px,1fr)]">
                  <div className="grid min-w-0 grid-cols-2 gap-x-2.5 gap-y-2 sm:grid-cols-3">
                    {inputField("ont", "ONT")}{inputField("ontSerial", "ONT serial")}{inputField("voiceTestNo", "Voice test number")}{inputField("voiceTestNoNew", "Voice test number (new)")}{inputField("stb", "STB")}{inputField("stbSerial", "STB serial")}
                  </div>
                  {workers.length === 0 ? <p className="self-center text-xs text-muted-foreground">No active workers are available.</p> : <div className="grid content-start gap-1.5 sm:grid-cols-2 xl:grid-cols-2">
                  {workers.map((worker) => {
                    const checked = workerSelection.includes(worker.id);
                    return <label key={worker.id} className="flex min-h-8 min-w-0 cursor-pointer items-center gap-1.5 rounded-lg border bg-background px-2 py-1 text-xs">
                      <input type="checkbox" checked={checked} onChange={(event) => void setWorkersForEntry(worker.id, event.target.checked)} className="h-3.5 w-3.5 accent-primary" />
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[9px] font-semibold text-primary">{initials(worker.fullName)}</span>
                      <span className="min-w-0 truncate">{worker.fullName}</span>
                    </label>;
                  })}
                </div>}
                </div>
              </section>
            </div>
            <div className="mt-2.5 flex items-center justify-between border-t pt-2"><p className="text-[11px] text-muted-foreground">Changes save automatically when you leave a field.</p><span className="text-[11px] font-medium text-muted-foreground">F1 + G1 = Total length</span></div>
          </CardContent>
        </Card>}
      </section>
    </div>

    <Dialog open={historyOpen} onOpenChange={setHistoryOpen}><DialogContent className="max-h-[85dvh] w-[min(96vw,760px)] overflow-y-auto rounded-2xl"><DialogHeader><DialogTitle className="flex items-center gap-2"><History className="h-5 w-5 text-primary" />Entry edit history</DialogTitle></DialogHeader><p className="-mt-2 text-sm text-muted-foreground">Review previous values and who made each saved change.</p><div className="space-y-3">{history.length === 0 ? <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">No saved changes yet.</div> : history.map((revision) => <div key={revision.id} className="rounded-xl border p-3.5"><div className="mb-3 flex flex-wrap items-center justify-between gap-2"><span className="font-medium">{revision.actor}</span><span className="flex items-center gap-1.5 text-xs text-muted-foreground"><Clock3 className="h-3.5 w-3.5" />{new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Colombo" }).format(new Date(revision.createdAt))}</span></div><div className="space-y-2">{revision.changedFields.map((field) => <div key={field} className="grid min-w-0 gap-1 text-sm sm:grid-cols-[150px_minmax(0,1fr)]"><span className="font-medium text-muted-foreground">{fieldLabels[field] || field}</span><span className="min-w-0 break-words"><span className="text-muted-foreground">{formatValue(revision.beforeValues?.[field])}</span><span className="mx-2 text-primary">→</span><span>{formatValue(revision.afterValues[field])}</span></span></div>)}</div></div>)}</div></DialogContent></Dialog>
  </div>;
}
