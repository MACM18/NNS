import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getActiveMonthlyVersionShare } from "@/lib/monthly-report-service";
import { canManageMonthlyReports } from "@/lib/monthly-report-sharing";
import { isValidEmailAddress } from "@/lib/email-validation";
import { escapeEmailHtml, sendEmail } from "@/lib/email-service";

export async function POST(request: NextRequest, context: { params: Promise<{ reportId: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const profile = await prisma.profile.findUnique({ where: { userId: session.user.id }, select: { role: true } });
  if (!canManageMonthlyReports(profile?.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await request.json().catch(() => ({}));
  const recipientValues: unknown[] = Array.isArray(body.recipients) ? body.recipients : String(body.recipients || "").split(/[\n,;]/);
  const recipients: string[] = [...new Set(recipientValues.map(value => String(value).trim().toLowerCase()).filter(Boolean))];
  const versionId = typeof body.versionId === "string" ? body.versionId : "";
  if (!versionId) return NextResponse.json({ error: "Choose a shared report version to email." }, { status: 400 });
  if (!recipients.length || recipients.length > 10 || recipients.some(email => !isValidEmailAddress(email))) {
    return NextResponse.json({ error: "Enter between 1 and 10 valid email addresses." }, { status: 400 });
  }
  const { reportId } = await context.params;
  try {
    const shared = await getActiveMonthlyVersionShare(reportId, versionId);
    if (!shared) return NextResponse.json({ error: "Share this published report first. A revoked link must be explicitly re-enabled before emailing." }, { status: 409 });
    const { token, version } = shared;
    const report = version.report;
    const label = new Intl.DateTimeFormat("en", { month: "long", year: "numeric", timeZone: "Asia/Colombo" }).format(new Date(Date.UTC(report.year, report.month - 1, 1)));
    const shareUrl = new URL(`/reports/shared/${token}`, request.nextUrl.origin).toString();
    const results = [];
    for (const recipient of recipients) {
      const result = await sendEmail({
        to: recipient,
        subject: `NNS Enterprise monthly reports: ${label} (version ${version.version})`,
        preheader: `View version ${version.version} of the monthly report set for ${label}.`,
        text: `NNS Enterprise monthly reports for ${label}, version ${version.version}, are ready. Anyone with this link can view the reports: ${shareUrl}`,
        html: `<h2 style="margin:0 0 12px;color:#134160">Monthly reports are ready</h2><p>The NNS Enterprise report set for <strong>${escapeEmailHtml(label)}</strong>, version ${version.version}, is available.</p><p style="margin:22px 0"><a href="${escapeEmailHtml(shareUrl)}" style="display:inline-block;background:#134160;color:#fff;padding:12px 18px;border-radius:5px;text-decoration:none">View monthly reports</a></p><p style="font-size:12px;color:#607383">Anyone with this link can view the reports. The link can be disabled by an administrator.</p>`,
      });
      results.push({ recipient, success: result.success, ...(result.success ? {} : { error: result.error || "Email could not be sent." }) });
    }
    const sent = results.filter(result => result.success).length;
    return NextResponse.json({ data: { sent, failed: results.length - sent, results } }, { status: sent ? 200 : 502 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to email this report link." }, { status: 400 });
  }
}
