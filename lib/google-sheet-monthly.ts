import { randomUUID } from "node:crypto";
import { google, type sheets_v4 } from "googleapis";
import { encrypt, decrypt } from "@/lib/encryption";
import prisma from "@/lib/prisma";
import { escapeEmailHtml, sendEmail } from "@/lib/email-service";
import { currentSheetPeriod } from "@/lib/google-sheet-auto-sync";

export const MONTHLY_SHEET_TIME = "00:05";
export const MONTHLY_SHEET_TIME_ZONE = "Asia/Colombo";
type MonthlyConfig = { editors: string[] };
type MonthlyCellUpdate = { range: string; values: unknown[][] };

export function monthlyTemplateUpdates(period: string): MonthlyCellUpdate[] {
  const [yearText, monthText] = period.split("-");
  const year = Number(yearText), month = Number(monthText);
  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) throw new Error("Invalid monthly sheet period.");
  const monthName = new Intl.DateTimeFormat("en", { month: "long", timeZone: MONTHLY_SHEET_TIME_ZONE }).format(new Date(Date.UTC(year, month - 1, 1))).toUpperCase();
  const twoDigitYear = yearText.slice(-2);
  const nextMonthDate = new Date(Date.UTC(year, month, 2));
  const invoiceDate = `${nextMonthDate.getUTCFullYear()}-${String(nextMonthDate.getUTCMonth() + 1).padStart(2, "0")}-02`;
  return [
    { range: "'Material Balance'!DW2", values: [[month]] },
    { range: "'Material Balance - Month'!D4", values: [[`: ${monthName}`]] },
    { range: "'Material Balance - Month'!D5", values: [[`: ${yearText}`]] },
    ...(["A", "B"] as const).flatMap(type => [
      { range: `'Invoice ${type}'!F5`, values: [[`NNS/WPS/HR/NC/${twoDigitYear}/${monthName}/${type}`]] },
      { range: `'Invoice ${type}'!F7`, values: [[invoiceDate]] },
      { range: `'Invoice ${type}'!F8`, values: [[`${monthName} ${yearText}`]] },
    ]),
    { range: "'Invoice back'!O1", values: [[`Invoice No: NNS/WPS/HR/NC/${twoDigitYear}/${monthName}/001`]] },
  ];
}

/** Rewrites template ranges to use the tab titles returned by Google Sheets.
 * Google treats surrounding whitespace as part of a tab title, so preserve it
 * when building A1 ranges even though validation ignores case and whitespace. */
export function resolveMonthlyTemplateRanges(updates: MonthlyCellUpdate[], tabTitles: string[]) {
  const normalize = (title: string) => title.trim().toLocaleLowerCase();
  const actualTitles = new Map(tabTitles.map(title => [normalize(title), title]));
  const requiredTabs = ["Material Balance", "Material Balance - Month", "Invoice A", "Invoice B", "Invoice back"];
  const missingTabs = requiredTabs.filter(tab => !actualTitles.has(normalize(tab)));
  if (missingTabs.length) throw new Error(`The selected spreadsheet is missing required template tabs: ${missingTabs.join(", ")}.`);

  return updates.map(update => {
    const match = update.range.match(/^'((?:[^']|'')+)'!(.+)$/);
    if (!match) return update;
    const expectedTitle = match[1].replace(/''/g, "'");
    const actualTitle = actualTitles.get(normalize(expectedTitle));
    if (!actualTitle) throw new Error(`Could not find the spreadsheet tab '${expectedTitle}'.`);
    return { ...update, range: `'${actualTitle.replace(/'/g, "''")}'!${match[2]}` };
  });
}

export function monthlyBalanceDestinations(values: unknown[][]) {
  if (!values.length) return [];
  return [
    { range: "'Material Balance'!C3:C", values },
    { range: "'Material Balance - Month'!C8:C", values },
  ];
}

export function googleOAuthClient() {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_SHEETS_DRIVE_REDIRECT_URI || `${process.env.NEXTAUTH_URL || process.env.APP_URL}/api/integrations/google-sheets/monthly/oauth/callback`;
  if (!clientId || !clientSecret || !redirectUri.startsWith("http")) throw new Error("Configure GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET, APP_URL/NEXTAUTH_URL, and GOOGLE_SHEETS_DRIVE_REDIRECT_URI.");
  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

export async function getMonthlyGoogleClients() {
  const settings = await prisma.googleSheetMonthlySettings.findUnique({ where: { id: "default" } });
  if (!settings?.encryptedRefreshToken) throw new Error("Connect the admin Google Drive account first.");
  const oauth = googleOAuthClient();
  oauth.setCredentials({ refresh_token: decrypt(settings.encryptedRefreshToken) });
  const { token } = await oauth.getAccessToken();
  if (!token) throw new Error("Google authorization expired. Reconnect the admin Drive account.");
  return { drive: google.drive({ version: "v3", auth: oauth }), sheets: google.sheets({ version: "v4", auth: oauth }), settings, accessToken: token };
}

/** Uses the same service account that completed the previous-month sync.
 * The admin OAuth connection is intentionally limited to drive.file and may
 * not have API access to older sheets that were connected manually.
 */
async function getServiceAccountSheetsClient() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const keyRaw = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (!email || !keyRaw) {
    throw new Error("Google service account credentials are not configured for reading previous-month balances.");
  }

  let key: string;
  try {
    const credentials = JSON.parse(keyRaw);
    if (!credentials.private_key) throw new Error("Missing private_key");
    key = String(credentials.private_key).replace(/\\n/g, "\n");
  } catch {
    key = keyRaw.replace(/\\n/g, "\n");
    if (!key.includes("-----BEGIN PRIVATE KEY-----") && !key.includes("-----BEGIN RSA PRIVATE KEY-----")) {
      throw new Error("Google service account key is not valid JSON credentials or a PEM private key.");
    }
  }

  const client = new google.auth.JWT({ email, key, scopes: ["https://www.googleapis.com/auth/spreadsheets"] });
  await client.authorize();
  return google.sheets({ version: "v4", auth: client });
}

function googleApiFailure(error: unknown, operation: string, details: Record<string, string | number | boolean | null>) {
  const cause = error as { message?: string; code?: number | string; response?: { status?: number; data?: { error?: { status?: string; errors?: Array<{ reason?: string }> } } } };
  const apiReason = cause.response?.data?.error?.errors?.map(item => item.reason).filter(Boolean).join(", ");
  throw new MonthlyProvisioningStageError(
    "prepare_sheet",
    `${operation}: ${redactProviderText(cause.message || "Google Sheets API request failed.")}`,
    {
      ...details,
      ...(cause.code ? { httpStatus: Number(cause.code) || null } : cause.response?.status ? { httpStatus: cause.response.status } : {}),
      ...(cause.response?.data?.error?.status ? { googleStatus: cause.response.data.error.status } : {}),
      ...(apiReason ? { googleReason: apiReason } : {}),
    },
  );
}


async function writeRange(sheets: sheets_v4.Sheets, fileId: string, range: string, values: unknown[][]) {
  await sheets.spreadsheets.values.update({ spreadsheetId: fileId, range, valueInputOption: "USER_ENTERED", requestBody: { values } });
}

type MonthlyRunEvent = {
  id: string;
  at: string;
  stage: string;
  status: "running" | "success" | "warning" | "failed";
  message: string;
  durationMs?: number;
  details?: Record<string, string | number | boolean | null>;
};

class MonthlyProvisioningStageError extends Error {
  constructor(
    readonly stage: string,
    message: string,
    readonly details?: Record<string, string | number | boolean | null>,
  ) {
    super(message);
    this.name = "MonthlyProvisioningStageError";
  }
}

async function recordMonthlyRunEvent(runId: string, event: Omit<MonthlyRunEvent, "id" | "at">) {
  const current = await prisma.googleSheetMonthlyRun.findUnique({ where: { id: runId }, select: { events: true } });
  const events = Array.isArray(current?.events) ? current.events as MonthlyRunEvent[] : [];
  const nextEvent: MonthlyRunEvent = { id: randomUUID(), at: new Date().toISOString(), ...event };
  await prisma.googleSheetMonthlyRun.update({ where: { id: runId }, data: { events: [...events, nextEvent] } });
}

async function runMonthlyStage<T>(
  runId: string,
  stage: string,
  message: string,
  action: () => Promise<T>,
  summarize?: (result: T) => { status?: "success" | "warning"; message?: string; details?: Record<string, string | number | boolean | null> },
): Promise<T> {
  const started = Date.now();
  await recordMonthlyRunEvent(runId, { stage, status: "running", message });
  try {
    const result = await action();
    const summary = summarize?.(result);
    await recordMonthlyRunEvent(runId, {
      stage,
      status: summary?.status || "success",
      message: summary?.message || `Completed: ${message}`,
      durationMs: Date.now() - started,
      ...(summary?.details ? { details: summary.details } : {}),
    });
    return result;
  } catch (error) {
    const messageText = redactProviderText(error instanceof Error ? error.message : String(error));
    await recordMonthlyRunEvent(runId, {
      stage,
      status: "failed",
      message: messageText,
      durationMs: Date.now() - started,
      ...(error instanceof MonthlyProvisioningStageError && error.details ? { details: error.details } : {}),
    });
    if (error instanceof MonthlyProvisioningStageError) throw error;
    throw new MonthlyProvisioningStageError(stage, messageText);
  }
}

function redactProviderText(value: string) {
  return value
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[email address]")
    .replace(/\b(?:re|rk|key|sk)_[A-Za-z0-9_-]{12,}\b/g, "[redacted credential]")
    .replace(/Bearer\s+\S+/gi, "Bearer [redacted]")
    .replace(/(access_token|refresh_token|api[_-]?key|password)\s*[:=]\s*[^\s,;]+/gi, "$1=[redacted]");
}

function emailFailureDetails(mail: Awaited<ReturnType<typeof sendEmail>>) {
  return {
    provider: mail.provider || "unknown",
    configSource: mail.configSource || "unknown",
    recipientCount: 0,
    ...(mail.configWarning ? { configWarning: mail.configWarning } : {}),
    ...(mail.error ? { providerError: redactProviderText(mail.error) } : {}),
  };
}

type SharingOutcome = { recipient: string; kind: "user" | "group"; status: "added" | "already_shared" | "failed"; error?: string };
type MonthlySheetRecipient = { emailAddress: string; type: "user" | "group" };
export async function grantMonthlySheetPermissions(
  recipients: MonthlySheetRecipient[],
  existingPermissions: Array<{ type?: string | null; emailAddress?: string | null }>,
  addPermission: (recipient: MonthlySheetRecipient) => Promise<void>,
): Promise<SharingOutcome[]> {
  const alreadyShared = new Set(existingPermissions.map(permission => `${permission.type}:${permission.emailAddress?.toLowerCase()}`));
  const outcomes: SharingOutcome[] = [];
  for (const recipient of recipients) {
    if (alreadyShared.has(`${recipient.type}:${recipient.emailAddress}`)) {
      outcomes.push({ recipient: recipient.emailAddress, kind: recipient.type, status: "already_shared" });
      continue;
    }
    try {
      await addPermission(recipient);
      outcomes.push({ recipient: recipient.emailAddress, kind: recipient.type, status: "added" });
    } catch (error) {
      outcomes.push({ recipient: recipient.emailAddress, kind: recipient.type, status: "failed", error: redactProviderText(error instanceof Error ? error.message : String(error)) });
    }
  }
  return outcomes;
}
function maskRecipient(email: string) {
  const [name, domain] = email.split("@");
  return domain ? `${name.slice(0, 1)}***@${domain}` : "[recipient]";
}

export async function sendSheetSharingReport(period: string, fileUrl: string, name: string, adminEmail: string | null, outcomes: SharingOutcome[]) {
  if (!adminEmail) return { sent: false, reason: "Connected Google admin email is unavailable." };
  const labels = { added: "Access granted", already_shared: "Already had access", failed: "Access failed" };
  const rows = outcomes.map(outcome => `<tr><td style="padding:9px 8px;border-bottom:1px solid #e4ebef">${escapeEmailHtml(outcome.recipient)}</td><td style="padding:9px 8px;border-bottom:1px solid #e4ebef">${outcome.kind === "group" ? "Google Group" : "User"}</td><td style="padding:9px 8px;border-bottom:1px solid #e4ebef;color:${outcome.status === "failed" ? "#a73535" : "#285d43"}">${labels[outcome.status]}${outcome.error ? ` — ${escapeEmailHtml(outcome.error)}` : ""}</td></tr>`).join("");
  const counts = outcomes.reduce((result, outcome) => { result[outcome.status] += 1; return result; }, { added: 0, already_shared: 0, failed: 0 });
  const mail = await sendEmail({
    to: adminEmail,
    subject: `Sheet sharing report: ${period}`,
    preheader: `Google Drive access results for ${name}.`,
    text: `Google Sheet sharing results for ${period} (${name})\n${fileUrl}\n\n${outcomes.map(outcome => `${outcome.recipient} (${outcome.kind}): ${labels[outcome.status]}${outcome.error ? ` — ${redactProviderText(outcome.error)}` : ""}`).join("\n")}\n\nTotals: ${counts.added} granted, ${counts.already_shared} already shared, ${counts.failed} failed.`,
    html: `<h2 style="margin:0 0 12px;color:#134160">Google Sheet access report</h2><p>Sharing results for <strong>${escapeEmailHtml(name)}</strong> (${escapeEmailHtml(period)}).</p><p style="margin:18px 0"><a href="${escapeEmailHtml(fileUrl)}" style="color:#135c83">Open the sheet</a></p><table role="presentation" style="width:100%;border-collapse:collapse;font-size:13px"><thead><tr style="background:#e1f1f9;color:#134160;text-align:left"><th style="padding:9px 8px">Recipient</th><th style="padding:9px 8px">Type</th><th style="padding:9px 8px">Google Drive result</th></tr></thead><tbody>${rows || "<tr><td colspan=\"3\" style=\"padding:9px 8px\">No editor permissions were configured.</td></tr>"}</tbody></table><p style="margin-top:16px;font-size:12px;color:#607383">${counts.added} granted · ${counts.already_shared} already shared · ${counts.failed} failed. These results describe Drive permissions; they do not confirm delivery of Google invitation emails.</p>`,
  });
  return { sent: mail.success, mail, recipientCount: outcomes.length, counts };
}

async function sendMonthlySummaryEmail(period: string, fileUrl: string, settings: MonthlyConfig & { adminEmail?: string | null }, name: string) {
  const to = [...new Set([...settings.editors.map(e => e.replace(/^group:/i, "")), settings.adminEmail || ""].map(e => e.trim()).filter(Boolean))];
  const mail = await sendEmail({
    to,
    subject: `New Google Sheet ready: ${name}`,
    preheader: `The ${period} monthly sheet is ready for your team.`,
    text: `The monthly Google Sheet for ${period} is ready: ${fileUrl}`,
    html: `<h2 style="margin:0 0 12px;color:#134160">Monthly sheet ready</h2><p>The shared Google Sheet for <strong>${escapeEmailHtml(period)}</strong> is ready.</p><p style="margin:22px 0"><a href="${escapeEmailHtml(fileUrl)}" style="display:inline-block;background:#134160;color:#fff;padding:12px 18px;border-radius:5px;text-decoration:none">Open ${escapeEmailHtml(name)}</a></p><p style="font-size:12px;color:#607383">This sheet is shared with the editors configured for monthly operations.</p>`,
  });
  return { mail, recipientCount: to.length };
}

export async function provisionMonthlySheet(period: string, secret: string, options: { manual?: boolean } = {}) {
  const manual = options.manual === true;
  const settings = await prisma.googleSheetMonthlySettings.findUnique({ where: { id: "default" } });
  if (!manual && !settings?.enabled) throw new Error("Monthly sheet automation is not enabled.");
  const [yearText, monthText] = period.split("-");
  const year = Number(yearText), month = Number(monthText);
  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) throw new Error("Invalid monthly sheet period.");
  const monthName = new Intl.DateTimeFormat("en", { month: "long", timeZone: MONTHLY_SHEET_TIME_ZONE }).format(new Date(Date.UTC(year, month - 1, 1)));
  const name = (settings?.namePattern || "NNS Telecom - {Month} {Year}").replaceAll("{Month}", monthName).replaceAll("{Year}", yearText).replaceAll("{MM}", monthText.padStart(2, "0"));

  let run = await prisma.googleSheetMonthlyRun.findUnique({ where: { period } });
  if (run?.status === "success") return { ok: true, runId: run.id, status: run.status, skipped: true, fileUrl: run.fileUrl };
  if (!run) {
    try { run = await prisma.googleSheetMonthlyRun.create({ data: { period, status: "running", events: [] } }); }
    catch (error) {
      if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") return { ok: true, skipped: true, reason: "Run is already in progress" };
      throw error;
    }
  } else {
    if (run.status === "running" && Date.now() - run.startedAt.getTime() < 10 * 60_000) return { ok: true, runId: run.id, status: run.status, skipped: true, reason: "Run is already in progress", fileUrl: run.fileUrl };
    const canClaim = run.status === "failed" || run.status === "partial" || run.status === "running";
    if (!canClaim) return { ok: true, runId: run.id, status: run.status, skipped: true, reason: "Monthly run is already claimed", fileUrl: run.fileUrl };
    const claimed = await prisma.googleSheetMonthlyRun.updateMany({
      where: { id: run.id, status: run.status, ...(run.status === "running" ? { startedAt: { lt: new Date(Date.now() - 10 * 60_000) } } : {}) },
      data: { status: "running", error: null, events: [], startedAt: new Date(), finishedAt: null },
    });
    if (claimed.count !== 1) return { ok: true, runId: run.id, status: "running", skipped: true, reason: "Run is already in progress", fileUrl: run.fileUrl };
    run = await prisma.googleSheetMonthlyRun.findUnique({ where: { id: run.id } });
  }
  if (!run) throw new Error("Could not claim the monthly provisioning run.");

  await recordMonthlyRunEvent(run.id, {
    stage: "request",
    status: "success",
    message: manual ? "Manual monthly sheet preparation requested by an administrator." : "Scheduled monthly sheet preparation started.",
  });

  try {
    const clients = await runMonthlyStage(run.id, "authorization", "Validate setup and connect to the administrator’s Google Drive", async () => {
      if (!settings) throw new Error("Save the monthly sheet setup before creating a sheet.");
      if (!settings.templateFileId || !settings.destinationFolderId) throw new Error("Choose a master template and destination folder before creating a sheet.");
      if (!settings.encryptedRefreshToken) throw new Error("Connect the admin Google Drive account first.");
      if (!manual) {
        const secretConfigured = process.env.CRON_SECRET || process.env.VERCEL_CRON_SECRET;
        if (!secretConfigured || secretConfigured !== secret) throw new Error("Scheduled request secret mismatch.");
      }
      return getMonthlyGoogleClients();
    }, () => ({ details: { source: manual ? "manual" : "scheduled", driveConnected: true } }));
    const { drive, sheets } = clients;

    const prior = await runMonthlyStage(run.id, "previous_month_sync", "Finish syncing the previous month’s sheet", async () => {
      const priorDate = new Date(Date.UTC(year, month - 2, 1));
      const connection = await prisma.googleSheetConnection.findFirst({
        where: { year: priorDate.getUTCFullYear(), month: priorDate.getUTCMonth() + 1 },
        orderBy: [{ createdAt: "desc" }],
      });
      if (!connection?.sheetId) throw new Error(`No connected Google Sheet was found for the previous month (${priorDate.getUTCFullYear()}-${String(priorDate.getUTCMonth() + 1).padStart(2, "0")}), so balances cannot be carried forward.`);
      if (!run!.previousSyncAt) {
        const actions = await import("@/app/dashboard/integrations/google-sheets/actions");
        if (manual) await actions.syncConnection(connection.id);
        else await actions.syncConnectionForCron(connection.id, secret);
        run = await prisma.googleSheetMonthlyRun.update({ where: { id: run!.id }, data: { previousSyncAt: new Date() } });
      }
      return { ...connection, period: `${connection.year}-${String(connection.month).padStart(2, "0")}` };
    }, result => ({
      message: run?.previousSyncAt ? "Previous month is synced and ready for balance carryover." : "Previous month sync completed.",
      details: { sourcePeriod: result.period, sheetId: result.sheetId || "unknown" },
    }));

    const copied = await runMonthlyStage(run.id, "copy_sheet", "Find or create the new monthly sheet", async () => {
      let fileId = run!.fileId;
      let reused = false;
      const validateSpreadsheet = async (candidateId: string): Promise<string[]> => {
        await drive.files.get({ fileId: candidateId, fields: "id,name,mimeType,trashed", supportsAllDrives: true });
        const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId: candidateId, fields: "spreadsheetId,properties.title,sheets.properties.title" });
        const tabTitles = (spreadsheet.data.sheets || []).map(sheet => sheet.properties?.title).filter((title): title is string => Boolean(title));
        resolveMonthlyTemplateRanges(monthlyTemplateUpdates(period), tabTitles);
        return tabTitles;
      };
      if (fileId) {
        try {
          await validateSpreadsheet(fileId);
          reused = true;
        } catch (error) {
          const cause = error as { code?: number; response?: { status?: number; data?: { error?: { status?: string } } } };
          const missing = Number(cause.code) === 404 || cause.response?.status === 404 || cause.response?.data?.error?.status === "NOT_FOUND";
          if (!missing) throw error;
          // A prior attempt may belong to a disconnected Google account or point
          // to a deleted file. Never keep retrying a target the current account cannot open.
          fileId = null;
          await prisma.googleSheetMonthlyRun.update({ where: { id: run!.id }, data: { fileId: null, fileUrl: null } });
        }
      }
      if (!fileId) {
        const found = await drive.files.list({
          q: `appProperties has { key='nnsMonthlyPeriod' and value='${period}' } and trashed=false`,
          fields: "files(id,webViewLink,name,mimeType)", pageSize: 10, includeItemsFromAllDrives: true, supportsAllDrives: true,
        });
        for (const candidate of found.data.files || []) {
          if (!candidate.id || candidate.mimeType !== "application/vnd.google-apps.spreadsheet") continue;
          try { await validateSpreadsheet(candidate.id); fileId = candidate.id; reused = true; break; }
          catch (error) {
            const cause = error as { code?: number; response?: { status?: number; data?: { error?: { status?: string } } } };
            const missing = Number(cause.code) === 404 || cause.response?.status === 404 || cause.response?.data?.error?.status === "NOT_FOUND";
            if (!missing) throw error;
          }
        }
      }
      if (!fileId) {
        const created = await drive.files.copy({
          fileId: settings!.templateFileId!,
          requestBody: { name, parents: [settings!.destinationFolderId!], appProperties: { nnsMonthlyPeriod: period, nnsMonthlyTemplateId: settings!.templateFileId! } },
          fields: "id,webViewLink", supportsAllDrives: true,
        });
        fileId = created.data.id || null;
      }
      if (!fileId) throw new Error("Google Drive did not return the copied sheet ID.");
      const fileUrl = `https://docs.google.com/spreadsheets/d/${fileId}/edit`;
      run = await prisma.googleSheetMonthlyRun.update({ where: { id: run!.id }, data: { fileId, fileUrl } });
      let tabTitles: string[];
      try { tabTitles = await validateSpreadsheet(fileId); }
      catch (error) {
        const cause = error as { message?: string };
        throw new MonthlyProvisioningStageError("copy_sheet", `The monthly copy exists in Drive but Google Sheets cannot open it: ${redactProviderText(cause.message || "Spreadsheet access failed.")}`, { operation: "verify_copied_spreadsheet", sheetAccessible: false });
      }
      return { fileId, fileUrl, reused, tabTitles };
    }, result => ({
      message: result.reused ? "Verified the existing monthly sheet is accessible and will reuse it." : "Created and verified a new monthly sheet copy.",
      details: { fileUrl: result.fileUrl, copyReused: result.reused },
    }));

    await runMonthlyStage(run.id, "prepare_sheet", "Update month and invoice cells and carry opening balances forward", async () => {
      if (run!.sheetPreparedAt) return { updatedRanges: 0, balancesCopied: 0, resumed: true };
      const updates = resolveMonthlyTemplateRanges(monthlyTemplateUpdates(period), copied.tabTitles);
      let balances: unknown[][];
      try {
        const sourceSheets = await getServiceAccountSheetsClient();
        const previous = await sourceSheets.spreadsheets.values.get({
          spreadsheetId: prior.sheetId!,
          range: "'Material Balance - Month'!H8:H",
          valueRenderOption: "UNFORMATTED_VALUE",
        });
        balances = (previous.data.values || []) as unknown[][];
      } catch (error) {
        googleApiFailure(error, `Could not read ending balances from the previous sheet (${prior.period})`, {
          operation: "read_previous_month_balances",
          sourcePeriod: prior.period,
          sourceTab: "Material Balance - Month",
          sourceRange: "H8:H",
          reader: "Google Sheets importer service account",
        });
      }
      for (const update of updates) {
        try { await writeRange(sheets, copied.fileId, update.range, update.values); }
        catch (error) { googleApiFailure(error, `Could not update ${update.range} on the new sheet`, { operation: "write_template_cell", targetRange: update.range }); }
      }
      const balanceUpdates = resolveMonthlyTemplateRanges(monthlyBalanceDestinations(balances!), copied.tabTitles);
      for (const update of balanceUpdates) {
        try { await writeRange(sheets, copied.fileId, update.range, update.values); }
        catch (error) { googleApiFailure(error, `Could not write carried balances to ${update.range} on the new sheet`, { operation: "write_opening_balances", targetRange: update.range, openingBalanceRows: balances!.length }); }
      }
      run = await prisma.googleSheetMonthlyRun.update({ where: { id: run!.id }, data: { sheetPreparedAt: new Date() } });
      return { updatedRanges: updates.length, balancesCopied: balances!.length, resumed: false };
    }, result => ({
      message: result.resumed ? "Template updates were completed in an earlier attempt." : "Template cells updated and opening balances copied.",
      details: { templateRangesUpdated: result.updatedRanges, openingBalanceRowsCopied: result.balancesCopied },
    }));

    const editorEntries = Array.isArray(settings!.editors) ? settings!.editors as string[] : [];
    const serviceAccount = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim().toLowerCase();
    const recipients = [...new Map([...editorEntries.map(value => {
      const group = value.toLowerCase().startsWith("group:");
      return [value.replace(/^group:/i, "").trim().toLowerCase(), group ? "group" : "user"] as const;
    }), ...(serviceAccount ? [[serviceAccount, "user"] as const] : [])]).entries()];

    let sharingOutcomes: SharingOutcome[] = [];
    await runMonthlyStage(run.id, "share_sheet", "Share the new sheet with configured editors", async () => {
      const existing = await drive.permissions.list({ fileId: copied.fileId, fields: "permissions(id,emailAddress,type,role)" });
      const recipientEntries = recipients.map(([emailAddress, type]) => ({ emailAddress, type }));
      sharingOutcomes = await grantMonthlySheetPermissions(recipientEntries, existing.data.permissions || [], async ({ emailAddress, type }) => {
        await drive.permissions.create({ fileId: copied.fileId, sendNotificationEmail: emailAddress !== serviceAccount, requestBody: { type, role: "writer", emailAddress }, fields: "id" });
      });
      if (sharingOutcomes.every(outcome => outcome.status !== "failed")) {
        run = await prisma.googleSheetMonthlyRun.update({ where: { id: run!.id }, data: { accessGrantedAt: new Date() } });
      }
      return { outcomes: sharingOutcomes };
    }, result => {
      const failed = result.outcomes.filter(outcome => outcome.status === "failed").length;
      return {
        status: failed ? "warning" : "success",
        message: failed ? `Google Drive granted access to ${result.outcomes.length - failed} of ${result.outcomes.length} recipients.` : "Google Drive access is present for every configured recipient.",
        details: {
          configuredRecipients: result.outcomes.length,
          permissionsAdded: result.outcomes.filter(outcome => outcome.status === "added").length,
          permissionsAlreadyPresent: result.outcomes.filter(outcome => outcome.status === "already_shared").length,
          permissionsFailed: failed,
          recipientResults: JSON.stringify(result.outcomes.map(outcome => ({ recipient: maskRecipient(outcome.recipient), type: outcome.kind, status: outcome.status, ...(outcome.error ? { error: outcome.error } : {}) }))),
        },
      };
    });

    await runMonthlyStage(run.id, "sharing_report", "Email the Google Drive sharing results to the connected administrator", async () => {
      return sendSheetSharingReport(period, copied.fileUrl, name, settings!.adminEmail, sharingOutcomes);
    }, result => ({
      status: !result.sent || result.mail?.configWarning ? "warning" : "success",
      message: result.sent ? `Sharing report sent to the connected Google administrator (${result.mail?.provider || "email provider"}).` : result.reason || `Sharing report delivery failed: ${result.mail?.error || "email provider error"}`,
      details: { reportSent: result.sent, reportRecipient: settings!.adminEmail ? maskRecipient(settings!.adminEmail) : "not configured", ...(result.counts || {}), ...(result.mail ? { provider: result.mail.provider || "unknown", configSource: result.mail.configSource || "unknown", ...(result.mail.configWarning ? { configWarning: result.mail.configWarning } : {}), ...(result.mail.error ? { providerError: redactProviderText(result.mail.error) } : {}), ...(result.mail.messageId ? { messageId: result.mail.messageId } : {}) } : {}) },
    }));
    if (sharingOutcomes.some(outcome => outcome.status === "failed")) {
      throw new MonthlyProvisioningStageError("share_sheet", "Some Google Drive editor permissions could not be granted. Review the access report and run details.", { permissionsFailed: sharingOutcomes.filter(outcome => outcome.status === "failed").length });
    }

    await runMonthlyStage(run.id, "register_connection", "Select the new sheet for the current month’s import", async () => {
      if (run!.connectionRegisteredAt) return { resumed: true };
      await prisma.$transaction(async tx => {
        const existing = await tx.googleSheetConnection.findFirst({ where: { sheetId: copied.fileId } });
        await tx.googleSheetConnection.updateMany({ where: { autoSyncEnabled: true }, data: { autoSyncEnabled: false } });
        if (existing) await tx.googleSheetConnection.update({ where: { id: existing.id }, data: { month, year, sheetUrl: copied.fileUrl, sheetName: name, autoSyncEnabled: true, status: "active" } });
        else await tx.googleSheetConnection.create({ data: { month, year, sheetUrl: copied.fileUrl, sheetId: copied.fileId, sheetName: name, autoSyncEnabled: true, status: "active" } });
      });
      run = await prisma.googleSheetMonthlyRun.update({ where: { id: run!.id }, data: { connectionRegisteredAt: new Date() } });
      return { resumed: false };
    }, result => ({ message: result.resumed ? "The sheet was already selected for import." : "Current-month import connection registered." }));

    if (!run.summaryEmailSentAt) {
      await runMonthlyStage(run.id, "summary_email", "Email the new sheet link to configured recipients", async () => {
        const result = await sendMonthlySummaryEmail(period, copied.fileUrl, { editors: editorEntries, adminEmail: settings!.adminEmail }, name);
        if (!result.mail.success) {
          throw new MonthlyProvisioningStageError(
            "summary_email",
            `${result.mail.provider || "Email provider"} reported: ${redactProviderText(result.mail.error || "The message was not accepted.")}`,
            { ...emailFailureDetails(result.mail), recipientCount: result.recipientCount },
          );
        }
        return result;
      }, result => ({
        status: result.mail.configWarning ? "warning" : "success",
        message: result.mail.configWarning ? `Email sent, but with a configuration warning: ${result.mail.configWarning}` : `Summary email sent through ${result.mail.provider || "the configured provider"}.`,
        details: { ...emailFailureDetails(result.mail), recipientCount: result.recipientCount, messageId: result.mail.messageId || null },
      }));
      run = await prisma.googleSheetMonthlyRun.update({ where: { id: run.id }, data: { summaryEmailSentAt: new Date() } });
    } else {
      await recordMonthlyRunEvent(run.id, { stage: "summary_email", status: "success", message: "Summary email was already sent in an earlier attempt." });
    }

    await prisma.googleSheetMonthlyRun.update({ where: { id: run.id }, data: { status: "success", fileId: copied.fileId, fileUrl: copied.fileUrl, finishedAt: new Date(), error: null } });
    await recordMonthlyRunEvent(run.id, { stage: "complete", status: "success", message: "Monthly sheet is ready, shared, and selected for import.", details: { fileUrl: copied.fileUrl } });
    return { ok: true, runId: run.id, status: "success", fileId: copied.fileId, fileUrl: copied.fileUrl, name };
  } catch (error) {
    const message = redactProviderText(error instanceof Error ? error.message : String(error));
    const failedStage = error instanceof MonthlyProvisioningStageError ? error.stage : "provisioning";
    const latest = await prisma.googleSheetMonthlyRun.findUnique({ where: { id: run.id } });
    const partial = failedStage === "summary_email" && Boolean(latest?.fileUrl && latest.connectionRegisteredAt && !latest.summaryEmailSentAt);
    await prisma.googleSheetMonthlyRun.update({ where: { id: run.id }, data: { status: partial ? "partial" : "failed", error: message, finishedAt: new Date() } });
    if (partial) return { ok: false, runId: run.id, status: "partial", fileId: latest?.fileId, fileUrl: latest?.fileUrl, name, error: message };
    throw error;
  }
}

export async function retryMonthlySheetEmail(runId: string) {
  const run = await prisma.googleSheetMonthlyRun.findUnique({ where: { id: runId } });
  if (!run?.fileUrl || !run.connectionRegisteredAt || run.summaryEmailSentAt) throw new Error("This run does not have a ready sheet awaiting its summary email.");
  const settings = await prisma.googleSheetMonthlySettings.findUnique({ where: { id: "default" } });
  if (!settings) throw new Error("Monthly sheet settings were not found.");
  const claimed = await prisma.googleSheetMonthlyRun.updateMany({ where: { id: runId, status: "partial", summaryEmailSentAt: null }, data: { status: "running", error: null, events: [], finishedAt: null } });
  if (claimed.count !== 1) throw new Error("This run is not waiting for an email retry, or another retry is already in progress.");
  const editors = Array.isArray(settings.editors) ? settings.editors as string[] : [];
  const name = settings.namePattern.replaceAll("{Month}", new Intl.DateTimeFormat("en", { month: "long", timeZone: MONTHLY_SHEET_TIME_ZONE }).format(new Date(Date.UTC(Number(run.period.slice(0, 4)), Number(run.period.slice(5)) - 1, 1)))).replaceAll("{Year}", run.period.slice(0, 4)).replaceAll("{MM}", run.period.slice(5).padStart(2, "0"));
  const started = Date.now();
  await recordMonthlyRunEvent(run.id, { stage: "summary_email_retry", status: "running", message: "Retrying the summary email only; the sheet will not be recreated." });
  try {
    const result = await sendMonthlySummaryEmail(run.period, run.fileUrl, { editors, adminEmail: settings.adminEmail }, name);
    if (!result.mail.success) {
      throw new MonthlyProvisioningStageError("summary_email_retry", `${result.mail.provider || "Email provider"} reported: ${redactProviderText(result.mail.error || "The message was not accepted.")}`, { ...emailFailureDetails(result.mail), recipientCount: result.recipientCount });
    }
    await prisma.googleSheetMonthlyRun.update({ where: { id: run.id }, data: { status: "success", summaryEmailSentAt: new Date(), finishedAt: new Date(), error: null } });
    await recordMonthlyRunEvent(run.id, {
      stage: "summary_email_retry",
      status: result.mail.configWarning ? "warning" : "success",
      message: result.mail.configWarning ? `Email sent, but with a configuration warning: ${result.mail.configWarning}` : `Summary email sent through ${result.mail.provider || "the configured provider"}.`,
      durationMs: Date.now() - started,
      details: { ...emailFailureDetails(result.mail), recipientCount: result.recipientCount, messageId: result.mail.messageId || null },
    });
    await recordMonthlyRunEvent(run.id, { stage: "complete", status: "success", message: "Monthly sheet and summary email are ready.", details: { fileUrl: run.fileUrl } });
    return { runId: run.id, status: "success", fileUrl: run.fileUrl };
  } catch (error) {
    const message = redactProviderText(error instanceof Error ? error.message : String(error));
    await recordMonthlyRunEvent(run.id, {
      stage: "summary_email_retry",
      status: "failed",
      message,
      durationMs: Date.now() - started,
      ...(error instanceof MonthlyProvisioningStageError && error.details ? { details: error.details } : {}),
    });
    await prisma.googleSheetMonthlyRun.update({ where: { id: run.id }, data: { status: "partial", error: message, finishedAt: new Date() } });
    return { runId: run.id, status: "partial", fileUrl: run.fileUrl, error: message };
  }
}

export function monthlyProvisioningDue(now = new Date()) {
  const clock = currentSheetPeriod(MONTHLY_SHEET_TIME_ZONE, now);
  return { ...clock, due: clock.localDate.endsWith("-01") && clock.localTime >= MONTHLY_SHEET_TIME };
}

export function encryptMonthlyRefreshToken(token: string) { return encrypt(token); }
