import { useEffect, useMemo, useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Button, Card, Divider, ActivityIndicator } from "react-native-paper";
import { apiFetch } from "../../session";
import { getCachedEntries } from "../../storage";
import { cableLengths, Entry } from "../../types";
import { useAppearance } from "../../theme";

type Revision = { id: string; actor: string; createdAt: string; changedFields: string[]; beforeValues: Record<string, unknown>; afterValues: Record<string, unknown> };

const labels: Record<string, string> = {
  date: "Work date", telephoneNo: "Telephone number", name: "Customer", address: "Address", dp: "DP",
  powerDp: "DP power", powerInbox: "Inbox power", cableStart: "Cable start", cableMiddle: "Cable middle", cableEnd: "Cable end",
  ont: "ONT", ontSerial: "ONT serial", voiceTestNo: "Voice test number", voiceTestNoNew: "New voice test number",
  stb: "STB", stbSerial: "STB serial", phoneNumber: "Contact number", status: "Status", workerIds: "Workers",
};

function display(value: unknown) {
  if (value == null || value === "") return "—";
  if (typeof value === "number") return String(value);
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.join(", ") || "—";
  return JSON.stringify(value);
}

export default function MobileLineDetailScreen() {
  const params = useLocalSearchParams<{ id: string | string[] }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const router = useRouter();
  const { palette, resolvedMode } = useAppearance();
  const styles = useMemo(() => makeStyles(palette), [palette]);
  const [line, setLine] = useState<Entry | null>(null);
  const [revisions, setRevisions] = useState<Revision[]>([]);
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [historyMessage, setHistoryMessage] = useState("");
  const [historyOpen, setHistoryOpen] = useState(false);
  const lengths = line ? cableLengths(line) : null;

  useEffect(() => {
    let active = true;
    setLoading(true);
    setMessage("");
    void (async () => {
      try {
        const response = await apiFetch(`/api/mobile/lines/${encodeURIComponent(id || "")}`);
        const payload = await response.json();
        if (!response.ok) throw new Error(typeof payload?.error === "string" ? payload.error : "Could not load this line.");
        if (!active) return;
        setLine({ ...payload.data, date: String(payload.data.date).slice(0, 10) } as Entry);
      } catch (error) {
        try {
          const cached = (await getCachedEntries()).find((item) => item.entry.id === id)?.entry;
          if (active && cached) {
            setLine(cached);
            setMessage("Offline · showing the encrypted recent copy saved on this device.");
          } else if (active) {
            setMessage(error instanceof Error ? error.message : "This line could not be loaded.");
          }
        } catch {
          if (active) setMessage(error instanceof Error ? error.message : "This line could not be loaded.");
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [id]);

  async function showHistory() {
    if (!id) return;
    setHistoryOpen(true);
    if (revisions.length || historyLoading) return;
    setHistoryLoading(true);
    setHistoryMessage("");
    try {
      const response = await apiFetch(`/api/daily-book/${encodeURIComponent(id)}/history`);
      const payload = await response.json();
      if (!response.ok) throw new Error(typeof payload?.error === "string" ? payload.error : "Could not load revision history.");
      setRevisions(payload.data || []);
    } catch (error) {
      setHistoryMessage(error instanceof Error ? error.message : "Revision history is unavailable.");
    } finally {
      setHistoryLoading(false);
    }
  }

  function editLine() {
    if (!line) return;
    router.replace({ pathname: "/", params: { mobileEditLineId: line.id } });
  }

  const section = (title: string, rows: [string, unknown][]) => <Card mode="outlined" style={styles.card}>
    <Card.Content>
      <Text style={styles.sectionTitle}>{title}</Text>
      {rows.map(([label, value], index) => <View key={label}>
        {index ? <Divider style={styles.divider} /> : null}
        <View style={styles.detailRow}><Text style={styles.label}>{label}</Text><Text selectable style={styles.value}>{display(value)}</Text></View>
      </View>)}
    </Card.Content>
  </Card>;

  return <SafeAreaView style={styles.safe}>
    <StatusBar style={resolvedMode === "dark" ? "light" : "dark"} />
    <View style={styles.topBar}>
      <Button compact mode="text" icon="arrow-left" onPress={() => router.back()} textColor={palette.blue}>Back</Button>
      <Text style={styles.topTitle}>Line details</Text>
      <Button compact mode="text" icon="pencil-outline" onPress={editLine} disabled={!line} textColor={palette.blue}>Edit</Button>
    </View>
    {loading ? <View style={styles.center}><ActivityIndicator color={palette.blue} /><Text style={styles.muted}>Loading line…</Text></View> : line ? <ScrollView contentContainerStyle={styles.content}>
      <Card mode="contained" style={styles.hero}>
        <Card.Content>
          <Text style={styles.kicker}>{line.date}</Text>
          <Text style={styles.phone}>{line.telephoneNo || "Line"}</Text>
          <Text style={styles.heroSub}>{line.name || "Customer details"}{line.dp ? ` · ${line.dp}` : ""}</Text>
          <View style={styles.statusRow}><Text style={styles.status}>{line.status === "completed" ? "Complete" : "In progress"}</Text><Text style={styles.sync}>{line.sheetSyncStatus ? `Sheet · ${line.sheetSyncStatus.replaceAll("_", " ")}` : "Sheet sync · not linked"}</Text></View>
        </Card.Content>
      </Card>
      {message ? <Text style={styles.notice}>{message}</Text> : null}
      {section("Customer & location", [["Customer", line.name], ["Address", line.address], ["DP", line.dp], ["Contact number", line.phoneNumber]])}
      {section("Power & cable", [["DP power", line.powerDp], ["Inbox power", line.powerInbox], ["Start mark", line.cableStart], ["Middle mark", line.cableMiddle], ["End mark", line.cableEnd]])}
      {lengths ? <View style={styles.lengthGrid}><Length label="F1" value={lengths.f1} styles={styles} /><Length label="G1" value={lengths.g1} styles={styles} /><Length label="Total cable" value={lengths.total} styles={styles} /></View> : null}
      {section("Equipment & identifiers", [["ONT", line.ont], ["ONT serial", line.ontSerial], ["Voice test number", line.voiceTestNo], ["New voice test number", line.voiceTestNoNew], ["STB", line.stb], ["STB serial", line.stbSerial]])}
      {section("Team", [["Assigned workers", line.workAssignments.map((worker) => worker.workerName)]])}
      <Card mode="outlined" style={styles.card}>
        <Card.Content>
          <View style={styles.historyHeader}><View style={{ flex: 1 }}><Text style={styles.sectionTitle}>Edit history</Text><Text style={styles.muted}>Who changed this line and what was updated</Text></View><Button compact mode="text" onPress={() => void showHistory()} textColor={palette.blue}>{historyOpen ? "Refresh" : "View"}</Button></View>
          {historyOpen ? historyLoading ? <ActivityIndicator color={palette.blue} /> : historyMessage ? <Text style={styles.notice}>{historyMessage}</Text> : revisions.length ? revisions.map((revision) => <View key={revision.id} style={styles.revision}>
            <Text style={styles.revisionActor}>{revision.actor}</Text><Text style={styles.muted}>{new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Colombo" }).format(new Date(revision.createdAt))}</Text>
            {revision.changedFields.map((field) => <View key={field} style={styles.revisionField}><Text style={styles.label}>{labels[field] || field}</Text><Text style={styles.value}>{display(revision.beforeValues?.[field])}  →  {display(revision.afterValues?.[field])}</Text></View>)}
          </View>) : <Text style={styles.muted}>No earlier edits are recorded.</Text> : null}
        </Card.Content>
      </Card>
      <Button mode="contained" icon="pencil-outline" buttonColor={palette.blue} textColor={resolvedMode === "dark" ? "#172019" : "#fffaf1"} onPress={editLine} style={styles.editButton}>Edit line</Button>
    </ScrollView> : <View style={styles.center}><Text style={styles.sectionTitle}>Line unavailable</Text><Text style={styles.muted}>{message || "This line could not be found."}</Text><Button onPress={() => router.back()} textColor={palette.blue}>Go back</Button></View>}
  </SafeAreaView>;
}

function Length({ label, value, styles }: { label: string; value: number; styles: ReturnType<typeof makeStyles> }) {
  return <View style={styles.length}><Text style={styles.label}>{label}</Text><Text style={styles.lengthValue}>{value.toFixed(2)} m</Text></View>;
}

function makeStyles(palette: ReturnType<typeof useAppearance>["palette"]) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: palette.paper }, topBar: { minHeight: 56, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 8, borderBottomWidth: 1, borderColor: palette.line }, topTitle: { color: palette.ink, fontSize: 16, fontWeight: "800" }, content: { padding: 15, paddingBottom: 30, gap: 12 }, hero: { backgroundColor: palette.pale, borderRadius: 20 }, kicker: { color: palette.bright, fontSize: 11, fontWeight: "800" }, phone: { color: palette.ink, fontSize: 25, fontWeight: "900", marginTop: 5 }, heroSub: { color: palette.muted, fontSize: 14, marginTop: 3 }, statusRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 }, status: { color: palette.good, fontSize: 11, fontWeight: "800", backgroundColor: palette.card, borderRadius: 9, paddingHorizontal: 10, paddingVertical: 6 }, sync: { color: palette.muted, fontSize: 11, paddingVertical: 6 }, card: { borderColor: palette.line, borderRadius: 17, backgroundColor: palette.card }, sectionTitle: { color: palette.ink, fontSize: 15, fontWeight: "800", marginBottom: 5 }, detailRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 15, paddingVertical: 9 }, label: { color: palette.muted, fontSize: 12, flex: 0.8 }, value: { color: palette.ink, fontSize: 13, fontWeight: "600", flex: 1.2, textAlign: "right" }, divider: { backgroundColor: palette.line }, lengthGrid: { flexDirection: "row", gap: 8 }, length: { flex: 1, minWidth: 0, backgroundColor: palette.pale, borderRadius: 14, padding: 11 }, lengthValue: { color: palette.ink, fontSize: 15, fontWeight: "800", marginTop: 5 }, historyHeader: { flexDirection: "row", alignItems: "center", gap: 8 }, muted: { color: palette.muted, fontSize: 12, marginTop: 3 }, revision: { borderTopWidth: 1, borderColor: palette.line, paddingTop: 11, marginTop: 11, gap: 4 }, revisionActor: { color: palette.ink, fontSize: 13, fontWeight: "800" }, revisionField: { borderTopWidth: 1, borderColor: palette.line, paddingTop: 7, marginTop: 6, gap: 4 }, editButton: { borderRadius: 13, marginTop: 3 }, notice: { color: palette.muted, fontSize: 12, paddingHorizontal: 3 }, center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 26, gap: 10 },
  });
}
