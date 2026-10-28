import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { BACKUP_DATASETS, mapBackupUsers, referencedProfileIds, remapPortableRow } from "@/lib/portable-backup";
import { deleteAvatarKey, storeAvatarBytes } from "@/lib/avatar-storage";

const managers = ["admin", "superadmin"];

async function matchExistingIds(tx: any, model: string, rows: any[], whereFor: (row: any) => any[]) {
  const map = new Map<string, string>();
  const delegate = tx[model];
  for (const row of rows) {
    if (!row?.id) continue;
    const clauses = whereFor(row);
    if (!clauses.length) continue;
    const existing = await delegate.findFirst({ where: { OR: clauses }, select: { id: true } });
    if (existing) map.set(row.id, existing.id);
  }
  return map;
}

function remapRowReferences(name: string, row: any, maps: Record<string, Map<string, string>>) {
  const fields: Record<string, string[]> = {
    monthlyInventoryUsage: ["itemId"], inventoryInvoice: [], inventoryInvoiceItem: ["invoiceId", "itemId"],
    materialBalanceItemMapping: ["inventoryItemId"], inventoryStockEvent: ["inventoryItemId"],
    drumTracking: ["itemId"], drumTrackingHistory: ["drumId", "lineDetailsId"], drumUsage: ["drumId", "lineDetailsId"],
    monthlyWastage: ["itemId"], wasteTracking: ["itemId"], workAssignment: ["lineId", "workerId"],
    lineAssignee: ["lineId"], task: ["lineDetailsId"], generatedInvoice: ["pricingScheduleId"],
    pricingTier: ["pricingScheduleId"], workerPayment: ["workerId", "payrollPeriodId"],
    payrollAdjustment: ["workerPaymentId"], monthlyReportVersion: ["reportId"], monthlyReportDocument: ["versionId"],
  };
  for (const field of fields[name] || []) {
    const targetModel = field === "itemId" || field === "inventoryItemId" ? "inventoryItem"
      : field === "invoiceId" ? "inventoryInvoice"
      : field === "lineId" || field === "lineDetailsId" ? "lineDetails"
      : field === "workerId" ? "worker"
      : field === "pricingScheduleId" ? "pricingSchedule"
      : field === "payrollPeriodId" ? "payrollPeriod"
      : field === "workerPaymentId" ? "workerPayment"
      : field === "reportId" ? "monthlyReport"
      : field === "versionId" ? "monthlyReportVersion" : null;
    const replacement = targetModel && row[field] ? maps[targetModel]?.get(row[field]) : undefined;
    if (replacement) row[field] = replacement;
  }
  return row;
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user || !managers.includes((session.user.role || "").toLowerCase())) return NextResponse.json({ error: "Only administrators can restore backups." }, { status: session?.user ? 403 : 401 });
  if (Number(request.headers.get("content-length") || 0) > 50 * 1024 * 1024) return NextResponse.json({ error: "Backup files must be 50 MB or smaller." }, { status: 413 });
  try {
    const backup = await request.json();
    if (backup?.product !== "NNS Enterprise" || backup?.version !== 1 || !backup?.data || typeof backup.data !== "object" || backup.confirm !== true) return NextResponse.json({ error: "Confirm the restore after reviewing its preview." }, { status: 400 });
    if (Object.keys(backup.data).some((name) => !BACKUP_DATASETS.includes(name as any) || !Array.isArray(backup.data[name]) || backup.data[name].length > 100000)) return NextResponse.json({ error: "The backup contains invalid or oversized sections." }, { status: 400 });
    const sourceUsers = Array.isArray(backup.sourceUsers) ? backup.sourceUsers : [];
    const { mapping, unresolved } = await mapBackupUsers(sourceUsers, backup.mappings || {});
    const requiredIds = referencedProfileIds(backup.data);
    const sourceUserIds = new Set((backup.sourceUsers || []).map((user: any) => user?.id).filter(Boolean));
    if ([...requiredIds].some((id) => !sourceUserIds.has(id))) return NextResponse.json({ error: "Some records refer to accounts missing from the backup account list." }, { status: 400 });
    const missing = unresolved.filter((user) => requiredIds.has(user.id));
    if (missing.length) return NextResponse.json({ error: "Map every required source user to an existing account before restoring.", requiredMappings: missing }, { status: 409 });
    const results: Record<string, number> = {};
    const avatarUploads: Array<{ profileId: string; key: string; url: string; preferences: unknown }> = [];
    for (const source of sourceUsers) {
      const profileId = mapping.get(source.id);
      const image = source.avatarImage;
      if (!profileId || !image) continue;
      if (!/^image\/(jpeg|png|webp)$/.test(image.contentType || "") || typeof image.base64 !== "string" || image.base64.length > 5_600_000 || !/^[A-Za-z0-9+/]*={0,2}$/.test(image.base64)) throw new Error("The backup contains an invalid profile photo.");
      const imageBytes = Buffer.from(image.base64, "base64");
      if (!imageBytes.length || imageBytes.length > 4 * 1024 * 1024) throw new Error("The backup contains an invalid profile photo.");
      const jpeg = imageBytes[0] === 0xff && imageBytes[1] === 0xd8 && imageBytes[2] === 0xff;
      const png = imageBytes.subarray(0, 8).toString("hex") === "89504e470d0a1a0a";
      const webp = imageBytes.subarray(0, 4).toString("ascii") === "RIFF" && imageBytes.subarray(8, 12).toString("ascii") === "WEBP";
      if (!(image.contentType === "image/jpeg" && jpeg) && !(image.contentType === "image/png" && png) && !(image.contentType === "image/webp" && webp)) throw new Error("The backup contains an invalid profile photo.");
      const current = await prisma.profile.findUnique({ where: { id: profileId }, select: { avatarUrl: true } });
      if (current?.avatarUrl) continue;
      const stored = await storeAvatarBytes(profileId, imageBytes, image.contentType);
      avatarUploads.push({ profileId, key: stored.key, url: stored.url, preferences: source.preferences ?? null });
    }
    try {
    await prisma.$transaction(async (tx: any) => {
      const newlyCreatedReportIds: string[] = [];
      const data = backup.data;
      const idMaps: Record<string, Map<string, string>> = {
        inventoryItem: await matchExistingIds(tx, "inventoryItem", data.inventoryItem || [], (row) => row.name ? [{ id: row.id }, { name: row.name }] : [{ id: row.id }]),
        worker: await matchExistingIds(tx, "worker", data.worker || [], (row) => [{ id: row.id }, ...(row.employeeNo ? [{ employeeNo: row.employeeNo }] : []), ...(row.profileId ? [{ profileId: row.profileId }] : [])]),
        lineDetails: await matchExistingIds(tx, "lineDetails", data.lineDetails || [], (row) => [{ id: row.id }, ...(row.telephoneNo && row.date ? [{ telephoneNo_date: { telephoneNo: row.telephoneNo, date: new Date(row.date) } }] : [])]),
        monthlyReport: await matchExistingIds(tx, "monthlyReport", data.monthlyReport || [], (row) => [{ id: row.id }, { year_month: { year: row.year, month: row.month } }]),
        pricingSchedule: await matchExistingIds(tx, "pricingSchedule", data.pricingSchedule || [], (row) => [{ id: row.id }, ...(row.effectiveFrom ? [{ effectiveFrom: new Date(row.effectiveFrom) }] : [])]),
        payrollPeriod: await matchExistingIds(tx, "payrollPeriod", data.payrollPeriod || [], (row) => [{ id: row.id }, { month_year: { month: row.month, year: row.year } }]),
        inventoryInvoice: await matchExistingIds(tx, "inventoryInvoice", data.inventoryInvoice || [], (row) => [{ id: row.id }, ...["invoiceNumber", "autoInvoiceNumber", "sourceKey"].filter((key) => row[key]).map((key) => ({ [key]: row[key] }))]),
      };
      const reportVersionRows = (data.monthlyReportVersion || []).map((row: any) => ({ ...row, reportId: idMaps.monthlyReport.get(row.reportId) || row.reportId }));
      idMaps.monthlyReportVersion = await matchExistingIds(tx, "monthlyReportVersion", reportVersionRows, (row) => [{ id: row.id }, { reportId_version: { reportId: row.reportId, version: row.version } }]);
      const paymentRows = (data.workerPayment || []).map((row: any) => ({ ...row, payrollPeriodId: idMaps.payrollPeriod.get(row.payrollPeriodId) || row.payrollPeriodId, workerId: idMaps.worker.get(row.workerId) || row.workerId }));
      idMaps.workerPayment = await matchExistingIds(tx, "workerPayment", paymentRows, (row) => [{ id: row.id }, { payrollPeriodId_workerId: { payrollPeriodId: row.payrollPeriodId, workerId: row.workerId } }]);
      for (const row of data.monthlyReport || []) if (!idMaps.monthlyReport.has(row.id)) newlyCreatedReportIds.push(row.id);
      for (const name of BACKUP_DATASETS) {
        const sourceRows = backup.data[name] || [];
        if (!sourceRows.length) { results[name] = 0; continue; }
        const delegate = tx[name];
        let rows = sourceRows.map((row: any) => remapRowReferences(name, remapPortableRow(name, row, mapping), idMaps));
        if (name === "drumTrackingHistory") rows = rows.map((row: any) => ({ ...row, syncConnectionId: null }));
        if (name === "monthlyReport") rows = rows.map((row: any) => ({ ...row, currentVersionId: null }));
        const result = await delegate.createMany({ data: rows, skipDuplicates: true });
        results[name] = result.count;
      }
      const reports = backup.data.monthlyReport || [];
      for (const report of reports) {
        if (!newlyCreatedReportIds.includes(report.id) || !report.currentVersionId) continue;
        const reportId = idMaps.monthlyReport.get(report.id) || report.id;
        const versionId = idMaps.monthlyReportVersion.get(report.currentVersionId) || report.currentVersionId;
        const versionExists = await tx.monthlyReportVersion.findUnique({ where: { id: versionId }, select: { id: true } });
        if (versionExists) await tx.monthlyReport.update({ where: { id: reportId }, data: { currentVersionId: versionId } });
      }
      for (const source of sourceUsers) {
        const profileId = mapping.get(source.id);
        if (!profileId) continue;
        const current = await tx.profile.findUnique({ where: { id: profileId }, select: { fullName: true, phone: true, address: true, bio: true, avatarUrl: true, preferences: true } });
        if (!current) continue;
        const data: Record<string, unknown> = {};
        for (const field of ["fullName", "phone", "address", "bio"] as const) if (!current[field] && source[field]) data[field] = source[field];
        const avatar = avatarUploads.find((item) => item.profileId === profileId);
        if (!current.avatarUrl && avatar) data.avatarUrl = avatar.url;
        if (current.preferences == null && source.preferences != null) data.preferences = source.preferences;
        if (Object.keys(data).length) await tx.profile.update({ where: { id: profileId }, data });
      }
      for (const table of ["blogs", "posts", "job_vacancies"]) {
        await tx.$queryRawUnsafe(`SELECT setval(pg_get_serial_sequence('public.${table}', 'id'), COALESCE((SELECT MAX(id) FROM public.${table}), 1), true)`);
      }
    }, { maxWait: 10000, timeout: 120000 });
    } catch (error) {
      await Promise.all(avatarUploads.map((avatar) => deleteAvatarKey(avatar.key).catch(() => undefined)));
      throw error;
    }
    return NextResponse.json({ success: true, imported: results, totalImported: Object.values(results).reduce((sum, count) => sum + count, 0), skippedConflicts: true, reportLinksInvalidated: true });
  } catch (error) {
    console.error("Backup restore rolled back:", error);
    return NextResponse.json({ error: "Restore was not completed. No backup records were imported. Check that the file is valid and retry." }, { status: 400 });
  }
}
