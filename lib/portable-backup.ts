import { prisma } from "@/lib/prisma";

export const BACKUP_VERSION = 1;
export const BACKUP_DATASETS = [
  "companySettings", "invoiceSettings", "pricingSchedule", "pricingTier",
  "inventoryItem", "monthlyInventoryUsage", "inventoryInvoice", "inventoryInvoiceItem", "materialBalanceItemMapping", "inventoryStockEvent",
  "drumTracking", "drumTrackingHistory", "drumUsage", "lineDetails", "task", "worker",
  "workAssignment", "lineAssignee", "generatedInvoice", "monthlyReport", "monthlyReportVersion",
  "monthlyReportDocument", "monthlyReportEmailRecipient", "monthlyWastage", "wasteTracking",
  "blog", "post", "jobVacancy", "payrollPeriod", "workerPayment", "payrollAdjustment", "payrollRule",
] as const;

const PROFILE_LINK_FIELDS = ["createdById", "assignedToId", "rejectedById", "completedById", "reportedById", "profileId"];
const NEVER_EXPORT = new Set(["password", "twoFactorSecret", "twoFactorBackupCodes", "refresh_token", "access_token", "id_token", "encryptedRefreshToken", "tokenHash", "shareTokenHash", "encryptedShareToken"]);
const DATE_FIELDS = new Set(["createdAt", "updatedAt", "importedAt", "lastSyncedAt", "lastSynced", "dueDate", "sourceDate", "assignedDate", "assignedAt", "date", "taskDate", "addedDate", "completedAt", "completedDate", "rejectedAt", "publishedAt", "shareRevokedAt", "lockedAt", "effectiveFrom", "startDate", "endDate", "paidDate", "paidAt", "invoiceDate", "balanceDate", "wasteDate", "receivedDate", "usageDate", "syncDate", "startedAt", "finishedAt", "previousSyncAt", "sheetPreparedAt", "accessGrantedAt", "connectionRegisteredAt", "summaryEmailSentAt"]);

export function portableValue(value: any): any {
  if (value instanceof Date) return value.toISOString();
  if (value instanceof Uint8Array) return { $nnsBytes: Buffer.from(value).toString("base64") };
  if (Array.isArray(value)) return value.map(portableValue);
  if (value && typeof value === "object") {
    const result: Record<string, any> = {};
    for (const [key, child] of Object.entries(value)) if (!NEVER_EXPORT.has(key)) result[key] = portableValue(child);
    return result;
  }
  return value;
}

export function restoreValue(value: any, field?: string): any {
  if (DATE_FIELDS.has(field || "") && typeof value === "string") {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date;
  }
  if (Array.isArray(value)) return value.map((child) => restoreValue(child));
  if (value && typeof value === "object") {
    if (typeof value.$nnsBytes === "string") return Buffer.from(value.$nnsBytes, "base64");
    return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, restoreValue(child, key)]));
  }
  return value;
}

export async function buildPortableData() {
  const data: Record<string, any[]> = {};
  for (const name of BACKUP_DATASETS) {
    const delegate = (prisma as any)[name];
    data[name] = (await delegate.findMany()).map(portableValue);
  }
  const profiles = await prisma.profile.findMany({ include: { user: { select: { email: true } } } });
  const { avatarObjectKeyFromUrl, readAvatar } = await import("@/lib/avatar-storage");
  const sourceUsers = await Promise.all(profiles.map(async (profile) => {
    const key = avatarObjectKeyFromUrl(profile.avatarUrl);
    let avatarImage: { contentType: string; base64: string } | undefined;
    if (key) {
      const image = await readAvatar(key);
      avatarImage = { contentType: image.contentType, base64: image.bytes.toString("base64") };
    }
    return { id: profile.id, email: profile.user.email, fullName: profile.fullName, phone: profile.phone, address: profile.address, bio: profile.bio, preferences: portableValue(profile.preferences), avatarImage };
  }));
  return { version: BACKUP_VERSION, product: "NNS Enterprise", exportedAt: new Date().toISOString(), sourceUsers, data };
}

export async function mapBackupUsers(sourceUsers: any[], explicitMappings: Record<string, string> = {}) {
  const destinationProfiles = await prisma.profile.findMany({ include: { user: { select: { email: true } } } });
  const byId = new Map(destinationProfiles.map((p) => [p.id, p]));
  const byEmail = new Map(destinationProfiles.map((p) => [p.user.email.toLowerCase(), p]));
  const mapping = new Map<string, string>();
  const unresolved: any[] = [];
  for (const source of sourceUsers) {
    const explicit = explicitMappings[source.id];
    const target = explicit ? byId.get(explicit) : byId.get(source.id) || byEmail.get(String(source.email || "").trim().toLowerCase());
    if (target) mapping.set(source.id, target.id);
    else unresolved.push({ id: source.id, email: source.email || "", fullName: source.fullName || "" });
  }
  return { mapping, unresolved, destinationProfiles: destinationProfiles.map((p) => ({ id: p.id, email: p.user.email, fullName: p.fullName, role: p.role })) };
}

export function remapPortableRow(name: string, input: any, userMap: Map<string, string>) {
  const row = restoreValue(input);
  for (const field of PROFILE_LINK_FIELDS) {
    if (row[field] && userMap.has(row[field])) row[field] = userMap.get(row[field]);
  }
  if (name === "lineAssignee" && row.userId && userMap.has(row.userId)) row.userId = userMap.get(row.userId);
  if (name === "inventoryInvoice") row.materialBalanceImportId = null;
  if (name === "inventoryStockEvent") row.materialBalanceImportId = null;
  if (name === "monthlyReportVersion") {
    row.shareActive = false;
    row.shareTokenHash = null;
    row.encryptedShareToken = null;
    row.shareRevokedAt = new Date();
  }
  if (name === "generatedInvoice") row.pdfUrl = null;
  if (name === "monthlyInventoryUsage") row.connectionId = null;
  return row;
}

export function referencedProfileIds(data: Record<string, any[]>) {
  const ids = new Set<string>();
  for (const [name, rows] of Object.entries(data)) {
    if (!BACKUP_DATASETS.includes(name as any)) continue;
    for (const row of rows) for (const field of PROFILE_LINK_FIELDS) if (row?.[field]) ids.add(row[field]);
    if (name === "lineAssignee") for (const row of rows) if (row?.userId) ids.add(row.userId);
  }
  return ids;
}
