import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { BACKUP_DATASETS, mapBackupUsers, referencedProfileIds } from "@/lib/portable-backup";

const managers = ["admin", "superadmin"];

function uniqueClauses(name: string, row: any): any[] {
  const clauses: any[] = row.id ? [{ id: row.id }] : [];
  const add = (where: any) => clauses.push(where);
  switch (name) {
    case "inventoryItem": if (row.name) add({ name: row.name }); break;
    case "monthlyInventoryUsage": if (row.itemId) add({ itemId_month_year: { itemId: row.itemId, month: row.month, year: row.year } }); break;
    case "inventoryInvoice": for (const field of ["invoiceNumber", "autoInvoiceNumber", "sourceKey"]) if (row[field]) add({ [field]: row[field] }); break;
    case "lineDetails": if (row.telephoneNo && row.date) add({ telephoneNo: row.telephoneNo, date: new Date(row.date) }); break;
    case "worker": if (row.employeeNo) add({ employeeNo: row.employeeNo }); if (row.profileId) add({ profileId: row.profileId }); break;
    case "monthlyReport": if (row.year && row.month) add({ year_month: { year: row.year, month: row.month } }); break;
    case "monthlyReportVersion": if (row.reportId) add({ reportId_version: { reportId: row.reportId, version: row.version } }); break;
    case "monthlyReportDocument": if (row.publicId) add({ publicId: row.publicId }); if (row.versionId) add({ versionId_reportType: { versionId: row.versionId, reportType: row.reportType } }); break;
    case "monthlyReportEmailRecipient": if (row.email) add({ email: row.email }); break;
    case "blog": if (row.slug) add({ slug: row.slug }); break;
    case "materialBalanceItemMapping": if (row.normalizedSourceName) add({ normalizedSourceName: row.normalizedSourceName }); break;
    case "payrollPeriod": if (row.month && row.year) add({ month_year: { month: row.month, year: row.year } }); break;
    case "workerPayment": if (row.payrollPeriodId && row.workerId) add({ payrollPeriodId_workerId: { payrollPeriodId: row.payrollPeriodId, workerId: row.workerId } }); break;
    case "pricingSchedule": if (row.effectiveFrom) add({ effectiveFrom: row.effectiveFrom }); break;
  }
  return clauses;
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user || !managers.includes((session.user.role || "").toLowerCase())) return NextResponse.json({ error: "Only administrators can restore backups." }, { status: session?.user ? 403 : 401 });
  if (Number(request.headers.get("content-length") || 0) > 50 * 1024 * 1024) return NextResponse.json({ error: "Backup files must be 50 MB or smaller." }, { status: 413 });
  try {
    const backup = await request.json();
    if (backup?.product !== "NNS Enterprise" || backup?.version !== 1 || !backup?.data || typeof backup.data !== "object") return NextResponse.json({ error: "This file is not a supported NNS backup." }, { status: 400 });
    const errors: string[] = [];
    for (const name of Object.keys(backup.data)) {
      if (!BACKUP_DATASETS.includes(name as any)) errors.push(`Unsupported backup section: ${name}`);
      else if (!Array.isArray(backup.data[name])) errors.push(`The ${name} section must be a list.`);
      else if (backup.data[name].length > 100000) errors.push(`The ${name} section exceeds the safe import limit.`);
    }
    if (errors.length) return NextResponse.json({ error: "The backup could not be validated.", errors }, { status: 400 });
    const users = Array.isArray(backup.sourceUsers) ? backup.sourceUsers : [];
    if (new Set(users.map((user: any) => user?.id).filter(Boolean)).size !== users.length || users.some((user: any) => typeof user?.id !== "string" || typeof user?.email !== "string")) return NextResponse.json({ error: "The backup account list is invalid." }, { status: 400 });
    const { mapping, unresolved, destinationProfiles } = await mapBackupUsers(users, backup.mappings || {});
    const requiredIds = referencedProfileIds(backup.data);
    const sourceUserIds = new Set(users.map((user: any) => user.id));
    const missingSourceUsers = [...requiredIds].filter((id) => !sourceUserIds.has(id));
    if (missingSourceUsers.length) return NextResponse.json({ error: "Some records refer to accounts missing from the backup account list.", missingSourceUsers }, { status: 400 });
    const requiredMappings = unresolved.filter((user) => requiredIds.has(user.id));
    const datasets: Record<string, { backup: number; existing: number; new: number }> = {};
    for (const name of BACKUP_DATASETS) {
      const rows = backup.data[name] || [];
      const delegate = (prisma as any)[name];
      let existing = 0;
      for (const row of rows) {
        const clauses = uniqueClauses(name, row);
        if (clauses.length && await delegate.findFirst({ where: { OR: clauses }, select: name === "monthlyReportEmailRecipient" ? { email: true } : { id: true } }).catch(() => null)) existing++;
      }
      datasets[name] = { backup: rows.length, existing, new: Math.max(0, rows.length - existing) };
    }
    return NextResponse.json({ success: true, version: backup.version, datasets, requiredMappings, unresolvedAccounts: unresolved.length, availableAccounts: destinationProfiles, ready: requiredMappings.length === 0, warnings: ["Existing records are preserved. Duplicate IDs and unique keys will be skipped.", "Report PDFs will remain private and report links will need to be shared again.", "Google Sheets, OAuth, and email connections are excluded and must be reconnected."] });
  } catch (error) {
    console.error("Backup preview failed:", error);
    return NextResponse.json({ error: "Unable to read this backup file." }, { status: 400 });
  }
}
