import crypto from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const configuredKey = process.env.CUSTOMER_DATA_ENCRYPTION_KEY;
if (!configuredKey || configuredKey.length < 32) throw new Error("Set CUSTOMER_DATA_ENCRYPTION_KEY (at least 32 characters) before running this migration.");
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required.");
const key = crypto.createHash("sha256").update(configuredKey, "utf8").digest();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
const prefix = "nnsenc:v1:";
const binaryPrefix = Buffer.from("NNSENC1:", "ascii");

function encrypted(value) { return typeof value === "string" && value.startsWith(prefix); }
function encrypt(value) {
  if (!value || encrypted(value)) return value;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const content = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return `${prefix}${iv.toString("base64url")}:${cipher.getAuthTag().toString("base64url")}:${content.toString("base64url")}`;
}
function decrypt(value) {
  if (!encrypted(value)) return value;
  const [iv, tag, content] = value.slice(prefix.length).split(":");
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, Buffer.from(iv, "base64url"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(content, "base64url")), decipher.final()]).toString("utf8");
}
function lookup(value) {
  const normalized = value.normalize("NFKC").trim().toLocaleLowerCase("en-US");
  return crypto.createHmac("sha256", key).update(`lookup:${normalized}`, "utf8").digest("hex");
}
function searchTokens(values) {
  const tokens = new Set();
  for (const value of values) {
    if (!value) continue;
    for (const word of value.normalize("NFKC").toLocaleLowerCase("en-US").split(/\s+/).filter(Boolean)) {
      for (let size = 1; size <= Math.min(3, word.length); size++) {
        for (let index = 0; index <= word.length - size; index++) tokens.add(lookup(`search:${word.slice(index, index + size)}`));
      }
    }
  }
  return [...tokens];
}
function encryptJson(value) {
  if (value == null || (typeof value === "string" && encrypted(value))) return value;
  return encrypt(JSON.stringify(value));
}
function encryptBytes(value) {
  const bytes = Buffer.from(value);
  if (bytes.subarray(0, binaryPrefix.length).equals(binaryPrefix)) return bytes;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encryptedContent = Buffer.concat([cipher.update(bytes), cipher.final()]);
  return Buffer.concat([binaryPrefix, iv, cipher.getAuthTag(), encryptedContent]);
}

async function main() {
  let lineCount = 0;
  const lineFields = ["telephoneNo", "dp", "name", "address", "ont", "voiceTestNo", "stb", "drumNumber", "phoneNumber", "ontSerial", "voiceTestNoNew", "stbSerial", "drumNumberNew"];
  const lineRows = await prisma.lineDetails.findMany();
  const phoneDates = new Map();
  for (const row of lineRows) {
    const phone = decrypt(row.telephoneNo);
    const key = `${lookup(phone)}:${row.date.toISOString().slice(0, 10)}`;
    const duplicateId = phoneDates.get(key);
    if (duplicateId) throw new Error(`Cannot encrypt line data: records ${duplicateId} and ${row.id} normalize to the same phone and date. Resolve this duplicate before retrying.`);
    phoneDates.set(key, row.id);
  }
  for (const row of lineRows) {
    const plain = Object.fromEntries(lineFields.map((field) => [field, row[field] ? decrypt(row[field]) : row[field]]));
    const data = Object.fromEntries(lineFields.map((field) => [field, plain[field] ? encrypt(plain[field]) : plain[field]]));
    data.telephoneNoLookup = lookup(plain.telephoneNo);
    data.customerSearchTokens = searchTokens(lineFields.map((field) => plain[field]));
    await prisma.lineDetails.update({ where: { id: row.id }, data });
    lineCount++;
  }

  let taskCount = 0;
  const taskFields = ["telephoneNo", "dp", "contactNo", "customerName", "address", "rejectionReason", "notes"];
  for (const row of await prisma.task.findMany()) {
    const plain = Object.fromEntries(taskFields.map((field) => [field, row[field] ? decrypt(row[field]) : row[field]]));
    const data = Object.fromEntries(taskFields.map((field) => [field, plain[field] ? encrypt(plain[field]) : plain[field]]));
    data.telephoneNoLookup = lookup(plain.telephoneNo);
    data.customerSearchTokens = searchTokens(taskFields.map((field) => plain[field]));
    await prisma.task.update({ where: { id: row.id }, data });
    taskCount++;
  }

  let revisionCount = 0;
  for (const row of await prisma.lineDetailsRevision.findMany()) {
    const data = {};
    for (const field of ["beforeValues", "afterValues"]) {
      const value = row[field];
      if (typeof value === "string" && encrypted(value)) continue;
      data[field] = encryptJson(value);
    }
    if (Object.keys(data).length) await prisma.lineDetailsRevision.update({ where: { id: row.id }, data });
    revisionCount++;
  }

  let invoiceCount = 0;
  for (const row of await prisma.generatedInvoice.findMany()) {
    const data = {};
    for (const field of ["lineDetailsSnapshot", "invoiceContentSnapshot"]) data[field] = encryptJson(row[field]);
    await prisma.generatedInvoice.update({ where: { id: row.id }, data });
    invoiceCount++;
  }

  let reportCount = 0;
  for (const row of await prisma.monthlyReportVersion.findMany()) {
    await prisma.monthlyReportVersion.update({ where: { id: row.id }, data: { sourceSnapshot: encryptJson(row.sourceSnapshot) } });
    reportCount++;
  }

  let documentCount = 0;
  for (const row of await prisma.monthlyReportDocument.findMany({ select: { id: true, pdfBytes: true } })) {
    await prisma.monthlyReportDocument.update({ where: { id: row.id }, data: { pdfBytes: encryptBytes(row.pdfBytes) } });
    documentCount++;
  }

  console.log(JSON.stringify({ encrypted: true, lineCount, taskCount, revisionCount, invoiceCount, reportCount, documentCount }));
}

try { await main(); }
finally { await prisma.$disconnect(); await pool.end(); }
