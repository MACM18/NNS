import { google, type sheets_v4 } from "googleapis";
import { encrypt, decrypt } from "@/lib/encryption";
import prisma from "@/lib/prisma";
import { sendEmail } from "@/lib/email-service";
import { currentSheetPeriod } from "@/lib/google-sheet-auto-sync";

export const MONTHLY_SHEET_TIME = "00:05";
export const MONTHLY_SHEET_TIME_ZONE = "Asia/Colombo";
type BalanceMapping = { sourceRange: string; destinationRange: string };
type MonthlyConfig = { clearRanges: string[]; balanceMappings: BalanceMapping[]; editors: string[] };

export function monthlyClearRequests(sheetsData: sheets_v4.Schema$Sheet[]) {
  const requests: sheets_v4.Schema$Request[] = [];
  for (const sheet of sheetsData) {
    const sheetId = sheet.properties?.sheetId; if (sheetId == null) continue;
    for (const grid of sheet.data || []) {
      const startRow = grid.startRow || 0, startCol = grid.startColumn || 0;
      (grid.rowData || []).forEach((row, rowOffset) => {
        (row.values || []).forEach((cell, colOffset) => {
          const entered = cell.userEnteredValue;
          if (!entered || entered.formulaValue !== undefined) return;
          if (entered.stringValue === undefined && entered.numberValue === undefined && entered.boolValue === undefined) return;
          requests.push({ updateCells: { range: { sheetId, startRowIndex: startRow + rowOffset, endRowIndex: startRow + rowOffset + 1, startColumnIndex: startCol + colOffset, endColumnIndex: startCol + colOffset + 1 }, rows: [{ values: [{}] }], fields: "userEnteredValue" } });
        });
      });
    }
  }
  return requests;
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


async function getServiceAccountSheets() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (!email || !raw) throw new Error("Google service account credentials are required to read the previous month's balance ranges.");
  let key: string;
  try { key = JSON.parse(raw).private_key || ""; } catch { key = raw.replace(/\\n/g, "\n"); }
  if (!key.includes("PRIVATE KEY")) throw new Error("Google service account private key is invalid.");
  const client = new google.auth.JWT({ email, key, scopes: ["https://www.googleapis.com/auth/spreadsheets"] });
  await client.authorize();
  return google.sheets({ version: "v4", auth: client });
}


async function clearInputValues(sheets: sheets_v4.Sheets, fileId: string, ranges: string[]) {
  if (!ranges.length) return;
  const doc = await sheets.spreadsheets.get({ spreadsheetId: fileId, ranges, includeGridData: true });
  const requests = monthlyClearRequests(doc.data.sheets || []);
  for (let offset = 0; offset < requests.length; offset += 500) {
    await sheets.spreadsheets.batchUpdate({ spreadsheetId: fileId, requestBody: { requests: requests.slice(offset, offset + 500) } });
  }
}

async function writeRange(sheets: sheets_v4.Sheets, fileId: string, range: string, values: unknown[][]) {
  await sheets.spreadsheets.values.update({ spreadsheetId: fileId, range, valueInputOption: "USER_ENTERED", requestBody: { values } });
}

export async function provisionMonthlySheet(period: string, secret: string) {
  const settings = await prisma.googleSheetMonthlySettings.findUnique({ where: { id: "default" } });
  if (!settings?.enabled || !settings.templateFileId || !settings.destinationFolderId) throw new Error("Monthly sheet automation is not fully configured.");
  if (!settings.encryptedRefreshToken) throw new Error("Connect the admin Google Drive account first.");
  const [yearText, monthText] = period.split("-");
  const year = Number(yearText), month = Number(monthText);
  const name = settings.namePattern.replaceAll("{Month}", new Intl.DateTimeFormat("en", { month: "long", timeZone: MONTHLY_SHEET_TIME_ZONE }).format(new Date(Date.UTC(year, month - 1, 1)))).replaceAll("{Year}", yearText).replaceAll("{MM}", monthText);

  let run = await prisma.googleSheetMonthlyRun.findUnique({ where: { period } });
  if (run?.status === "success") return { skipped: true, fileUrl: run.fileUrl };
  if (!run) {
    try { run = await prisma.googleSheetMonthlyRun.create({ data: { period, status: "running" } }); }
    catch (error) {
      if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") return { skipped: true, reason: "Run is already in progress" };
      throw error;
    }
  } else {
    if (run.status === "running" && Date.now() - run.startedAt.getTime() < 10 * 60_000) return { skipped: true, reason: "Run is already in progress" };
    const canClaim = run.status === "failed" || run.status === "running";
    if (!canClaim) return { skipped: true, reason: "Monthly run is already claimed" };
    const claimed = await prisma.googleSheetMonthlyRun.updateMany({
      where: { id: run.id, status: run.status, ...(run.status === "running" ? { startedAt: { lt: new Date(Date.now() - 10 * 60_000) } } : {}) },
      data: { status: "running", error: null, startedAt: new Date(), finishedAt: null },
    });
    if (claimed.count !== 1) return { skipped: true, reason: "Run is already in progress" };
    run = await prisma.googleSheetMonthlyRun.findUnique({ where: { period } });
  }
  if (!run) throw new Error("Could not claim the monthly provisioning run.");

  try {
    const secretConfigured = process.env.CRON_SECRET || process.env.VERCEL_CRON_SECRET;
    if (secretConfigured !== secret) throw new Error("Scheduled request secret mismatch.");
    const { drive, sheets } = await getMonthlyGoogleClients();
    const priorDate = new Date(Date.UTC(year, month - 2, 1));
    const prior = await prisma.googleSheetConnection.findFirst({ where: { year: priorDate.getUTCFullYear(), month: priorDate.getUTCMonth() + 1 }, orderBy: [{ createdAt: "desc" }] });
    if (!run.previousSyncAt) {
      if (prior) {
        const { syncConnectionForCron } = await import("@/app/dashboard/integrations/google-sheets/actions");
        await syncConnectionForCron(prior.id, secret);
      }
      run = await prisma.googleSheetMonthlyRun.update({ where: { id: run.id }, data: { previousSyncAt: new Date() } });
    }

    let fileId = run.fileId;
    if (!fileId) {
      const found = await drive.files.list({ q: `appProperties has { key='nnsMonthlyPeriod' and value='${period}' } and trashed=false`, fields: "files(id,webViewLink,name)", pageSize: 10, includeItemsFromAllDrives: true, supportsAllDrives: true });
      fileId = found.data.files?.[0]?.id || null;
    }
    if (!fileId) {
      const copied = await drive.files.copy({ fileId: settings.templateFileId, requestBody: { name, parents: [settings.destinationFolderId], appProperties: { nnsMonthlyPeriod: period, nnsMonthlyTemplateId: settings.templateFileId } }, fields: "id,webViewLink", supportsAllDrives: true });
      fileId = copied.data.id || null;
    }
    if (!fileId) throw new Error("Google Drive did not return the copied sheet ID.");
    const fileUrl = `https://docs.google.com/spreadsheets/d/${fileId}/edit`;
    await prisma.googleSheetMonthlyRun.update({ where: { id: run.id }, data: { fileId, fileUrl } });

    const config = { clearRanges: Array.isArray(settings.clearRanges) ? settings.clearRanges as string[] : [], balanceMappings: Array.isArray(settings.balanceMappings) ? settings.balanceMappings as BalanceMapping[] : [], editors: Array.isArray(settings.editors) ? settings.editors as string[] : [] } satisfies MonthlyConfig;
    if (!run.sheetPreparedAt) {
      await clearInputValues(sheets, fileId, config.clearRanges);
      if (settings.monthCell) await writeRange(sheets, fileId, settings.monthCell, [[`${name}`]]);
      if (prior?.sheetId && config.balanceMappings.length) {
        const sourceSheets = await getServiceAccountSheets();
        for (const mapping of config.balanceMappings) {
          const old = await sourceSheets.spreadsheets.values.get({ spreadsheetId: prior.sheetId, range: mapping.sourceRange, valueRenderOption: "UNFORMATTED_VALUE" });
          if (old.data.values?.length) await writeRange(sheets, fileId, mapping.destinationRange, old.data.values as unknown[][]);
        }
      }
      run = await prisma.googleSheetMonthlyRun.update({ where: { id: run.id }, data: { sheetPreparedAt: new Date() } });
    }

    const serviceAccount = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim().toLowerCase();
    const recipients = [...new Map([...config.editors.map(value => { const group = value.toLowerCase().startsWith("group:"); return [value.replace(/^group:/i, "").trim().toLowerCase(), group ? "group" : "user"] as const; }), ...(serviceAccount ? [[serviceAccount, "user"] as const] : [])]).entries()];
    if (!run.accessGrantedAt) {
      const existingPermissions = await drive.permissions.list({ fileId, fields: "permissions(id,emailAddress,type,role)" });
      const alreadyShared = new Set((existingPermissions.data.permissions || []).map(permission => `${permission.type}:${permission.emailAddress?.toLowerCase()}`));
      for (const [emailAddress, type] of recipients) {
        if (alreadyShared.has(`${type}:${emailAddress}`)) continue;
        await drive.permissions.create({ fileId, sendNotificationEmail: emailAddress !== serviceAccount, requestBody: { type, role: "writer", emailAddress }, fields: "id" });
      }
      run = await prisma.googleSheetMonthlyRun.update({ where: { id: run.id }, data: { accessGrantedAt: new Date() } });
    }

    if (!run.connectionRegisteredAt) await prisma.$transaction(async tx => {
      const existing = await tx.googleSheetConnection.findFirst({ where: { sheetId: fileId } });
      await tx.googleSheetConnection.updateMany({ where: { autoSyncEnabled: true }, data: { autoSyncEnabled: false } });
      if (existing) await tx.googleSheetConnection.update({ where: { id: existing.id }, data: { month, year, sheetUrl: fileUrl, sheetName: name, autoSyncEnabled: true, status: "active" } });
      else await tx.googleSheetConnection.create({ data: { month, year, sheetUrl: fileUrl, sheetId: fileId, sheetName: name, autoSyncEnabled: true, status: "active" } });
    });
    if (!run.connectionRegisteredAt) run = await prisma.googleSheetMonthlyRun.update({ where: { id: run.id }, data: { connectionRegisteredAt: new Date() } });
    if (!run.summaryEmailSentAt) {
      const to = [...new Set([...config.editors.map(e => e.replace(/^group:/i, "")), settings.adminEmail || ""].map(e => e.trim()).filter(Boolean))];
      const mail = await sendEmail({ to, subject: `New Google Sheet ready: ${name}`, text: `The monthly Google Sheet is ready: ${fileUrl}`, html: `<p>The monthly Google Sheet is ready.</p><p><a href="${fileUrl}">${name}</a></p>` });
      if (!mail.success) throw new Error(`Sheet created and shared, but summary email failed: ${mail.error || "email provider error"}`);
      run = await prisma.googleSheetMonthlyRun.update({ where: { id: run.id }, data: { summaryEmailSentAt: new Date() } });
    }
    await prisma.googleSheetMonthlyRun.update({ where: { id: run.id }, data: { status: "success", fileId, fileUrl, finishedAt: new Date(), error: null } });
    return { ok: true, fileId, fileUrl, name };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await prisma.googleSheetMonthlyRun.update({ where: { id: run.id }, data: { status: "failed", error: message, finishedAt: new Date() } });
    throw error;
  }
}

export function monthlyProvisioningDue(now = new Date()) {
  const clock = currentSheetPeriod(MONTHLY_SHEET_TIME_ZONE, now);
  return { ...clock, due: clock.localDate.endsWith("-01") && clock.localTime >= MONTHLY_SHEET_TIME };
}

export function encryptMonthlyRefreshToken(token: string) { return encrypt(token); }
