import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { reconcileSheetAutoSync } from "@/lib/google-sheet-auto-sync";
import { syncConnectionForCron } from "@/app/dashboard/integrations/google-sheets/actions";
import { escapeEmailHtml, sendEmail } from "@/lib/email-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ImportResult = {
  total: number;
  insertedCount: number;
  updatedCount: number;
  removedCount: number;
  skippedCount: number;
  hardwareUpdated: number;
  issueSummaries: string[];
};

async function sendDailyImportReport(input: {
  localDate: string;
  period: string;
  sheetName: string;
  result?: ImportResult;
  error?: string;
}) {
  const [monthlySettings, admins] = await Promise.all([
    prisma.googleSheetMonthlySettings.findUnique({ where: { id: "default" }, select: { adminEmail: true } }),
    prisma.profile.findMany({ where: { role: { in: ["admin", "superadmin"] }, email: { not: null } }, select: { email: true } }),
  ]);
  const recipients = [...new Set(
    [monthlySettings?.adminEmail, ...admins.map((admin) => admin.email)]
      .filter((email): email is string => Boolean(email?.trim()))
      .map((email) => email.trim()),
  )];
  if (!recipients.length) return { status: "skipped" as const, error: "No administrator email is configured." };

  const { result, error } = input;
  const issues = [...(result?.issueSummaries || []), ...(error ? [error] : [])];
  const failed = Boolean(error);
  const subject = `${failed ? "Action needed: " : issues.length ? "Import report with issues: " : "Import complete: "}${input.period} Google Sheet`;
  const metricRows = result ? [
    ["New lines", result.insertedCount],
    ["Updated lines", result.updatedCount],
    ["Removed from app", result.removedCount],
    ["Skipped rows", result.skippedCount],
    ["Stock items updated", result.hardwareUpdated],
  ] : [];
  const html = `<h2 style="margin:0 0 12px;color:${failed || issues.length ? "#9f2d28" : "#134160"}">${failed ? "Import failed" : issues.length ? "Import completed with issues" : "Daily import completed"}</h2>
    <p style="margin:0 0 8px"><strong>Date:</strong> ${escapeEmailHtml(input.localDate)}</p>
    <p style="margin:0 0 16px"><strong>Sheet:</strong> ${escapeEmailHtml(input.sheetName)} · <strong>Period:</strong> ${escapeEmailHtml(input.period)}</p>
    ${metricRows.length ? `<table role="presentation" cellpadding="7" cellspacing="0" style="width:100%;border-collapse:collapse;border:1px solid #dce5eb">${metricRows.map(([label, value]) => `<tr><td style="border-bottom:1px solid #dce5eb;color:#445766">${escapeEmailHtml(label)}</td><td align="right" style="border-bottom:1px solid #dce5eb;font-weight:bold">${escapeEmailHtml(value)}</td></tr>`).join("")}</table>` : ""}
    ${issues.length ? `<h3 style="margin:20px 0 8px;color:#9f2d28">Issues to review</h3><ul style="padding-left:20px;margin:0">${issues.slice(0, 12).map((issue) => `<li style="margin:0 0 6px">${escapeEmailHtml(issue)}</li>`).join("")}</ul>` : `<p style="margin:16px 0 0">No import issues were reported.</p>`}
    <p style="margin:20px 0 0"><a href="${escapeEmailHtml(`${process.env.NEXTAUTH_URL || "https://nns.lk"}/dashboard/integrations/google-sheets`)}" style="color:#135c83">Open Google Sheets import logs</a></p>`;
  const text = [
    failed ? "Import failed" : issues.length ? "Daily import completed with issues" : "Daily import completed",
    `Date: ${input.localDate}`,
    `Sheet: ${input.sheetName} (${input.period})`,
    ...(result ? [`New lines: ${result.insertedCount}`, `Updated lines: ${result.updatedCount}`, `Removed from app: ${result.removedCount}`, `Skipped rows: ${result.skippedCount}`, `Stock items updated: ${result.hardwareUpdated}`] : []),
    ...(issues.length ? ["Issues to review:", ...issues.slice(0, 12).map((issue) => `- ${issue}`)] : ["No import issues were reported."]),
    `Import logs: ${process.env.NEXTAUTH_URL || "https://nns.lk"}/dashboard/integrations/google-sheets`,
  ].join("\n");
  const mail = await sendEmail({ to: recipients, subject, html, text, preheader: `${input.period} sheet import summary for ${input.localDate}` });
  return mail.success
    ? { status: "sent" as const, sentAt: new Date() }
    : { status: "failed" as const, error: mail.error || "Email provider did not accept the summary." };
}

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET || process.env.VERCEL_CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { settings, clock, newestConnection } = await reconcileSheetAutoSync();
    if (!settings.enabled || clock.localTime < settings.dailyTime || !newestConnection?.autoSyncEnabled) {
      return NextResponse.json({ ok: true, skipped: "Not due or no current-month sheet selected" });
    }

    // Multiple scheduler instances can hit this endpoint at once. Claim the
    // unique local date without provoking a noisy P2002 Prisma error.
    const claim = await prisma.googleSheetAutoSyncRun.createMany({
      data: [{ localDate: clock.localDate, connectionId: newestConnection.id }],
      skipDuplicates: true,
    });
    if (claim.count === 0) {
      return NextResponse.json({ ok: true, skipped: "Already started today" });
    }
    const run = await prisma.googleSheetAutoSyncRun.findUnique({ where: { localDate: clock.localDate } });
    if (!run) throw new Error("The scheduled import run could not be loaded after claiming today’s run.");

    let result: ImportResult | undefined;
    let importError: string | undefined;
    try {
      result = await syncConnectionForCron(newestConnection.id, secret) as ImportResult;
    } catch (error) {
      importError = error instanceof Error ? error.message : String(error);
      console.error("[cron/google-sheet-import] Sync failed:", error);
    }

    const report = await sendDailyImportReport({
      localDate: clock.localDate,
      period: clock.period,
      sheetName: newestConnection.sheetName || `Google Sheet ${clock.period}`,
      result,
      error: importError,
    }).catch((error) => ({ status: "failed" as const, error: error instanceof Error ? error.message : String(error) }));

    if (importError) {
      const message = importError;
      await prisma.googleSheetAutoSyncRun.update({
        where: { id: run.id },
        data: { status: "failed", error: message, finishedAt: new Date(), summaryEmailStatus: report.status, summaryEmailError: "error" in report ? report.error : null, summaryEmailSentAt: "sentAt" in report ? report.sentAt : null },
      });
      return NextResponse.json({ error: "Scheduled import failed" }, { status: 500 });
    }
    await prisma.googleSheetAutoSyncRun.update({
      where: { id: run.id },
      data: { status: result?.issueSummaries.length ? "warning" : "success", finishedAt: new Date(), summaryEmailStatus: report.status, summaryEmailError: "error" in report ? report.error : null, summaryEmailSentAt: "sentAt" in report ? report.sentAt : null },
    });
    return NextResponse.json({ ok: true, connectionId: newestConnection.id, total: result?.total ?? 0, summaryEmailStatus: report.status });
  } catch (error) {
    console.error("[cron/google-sheet-import] Error:", error);
    return NextResponse.json({ error: "Scheduled import failed" }, { status: 500 });
  }
}
