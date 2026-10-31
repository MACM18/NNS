import crypto from "node:crypto";

const ENCRYPTED_PREFIX = "nnsenc:v1:";
const BINARY_PREFIX = Buffer.from("NNSENC1:", "ascii");

function encryptionKey() {
  const configured = process.env.CUSTOMER_DATA_ENCRYPTION_KEY;
  if (!configured || configured.length < 32) {
    throw new Error("CUSTOMER_DATA_ENCRYPTION_KEY must be set to a stable secret of at least 32 characters");
  }
  return crypto.createHash("sha256").update(configured, "utf8").digest();
}

export function isCustomerDataEncrypted(value: string) {
  return value.startsWith(ENCRYPTED_PREFIX);
}

export function encryptCustomerValue(value: string) {
  if (!value || isCustomerDataEncrypted(value)) return value;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${ENCRYPTED_PREFIX}${iv.toString("base64url")}:${tag.toString("base64url")}:${encrypted.toString("base64url")}`;
}

export function decryptCustomerValue(value: string) {
  if (!isCustomerDataEncrypted(value)) return value;
  const parts = value.slice(ENCRYPTED_PREFIX.length).split(":");
  if (parts.length !== 3) throw new Error("Invalid customer data ciphertext format");
  const [iv, tag, content] = parts;
  const decipher = crypto.createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(iv, "base64url"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(content, "base64url")), decipher.final()]).toString("utf8");
}

export function customerDataLookup(value: string) {
  const normalized = value.normalize("NFKC").trim().toLocaleLowerCase("en-US");
  return crypto.createHmac("sha256", encryptionKey()).update(`lookup:${normalized}`, "utf8").digest("hex");
}

export function customerDataSearchTokens(values: Array<string | null | undefined>) {
  const tokens = new Set<string>();
  for (const value of values) {
    if (!value) continue;
    const normalized = value.normalize("NFKC").toLocaleLowerCase("en-US");
    for (const word of normalized.split(/\s+/).filter(Boolean)) {
      for (let size = 1; size <= Math.min(3, word.length); size++) {
        for (let index = 0; index <= word.length - size; index++) {
          tokens.add(customerDataLookup(`search:${word.slice(index, index + size)}`));
        }
      }
    }
  }
  return [...tokens];
}

export function encryptCustomerJson(value: unknown) {
  if (value == null) return value;
  if (typeof value === "string" && isCustomerDataEncrypted(value)) return value;
  return encryptCustomerValue(JSON.stringify(value));
}

export function decryptCustomerJson(value: unknown) {
  if (typeof value !== "string" || !isCustomerDataEncrypted(value)) return value;
  return JSON.parse(decryptCustomerValue(value));
}

export function encryptCustomerBytes(value: Uint8Array) {
  const bytes = Buffer.from(value);
  if (bytes.subarray(0, BINARY_PREFIX.length).equals(BINARY_PREFIX)) return bytes;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(bytes), cipher.final()]);
  return Buffer.concat([BINARY_PREFIX, iv, cipher.getAuthTag(), encrypted]);
}

export function decryptCustomerBytes(value: Uint8Array) {
  const bytes = Buffer.from(value);
  if (!bytes.subarray(0, BINARY_PREFIX.length).equals(BINARY_PREFIX)) return bytes;
  const offset = BINARY_PREFIX.length;
  const iv = bytes.subarray(offset, offset + 12);
  const tag = bytes.subarray(offset + 12, offset + 28);
  const content = bytes.subarray(offset + 28);
  const decipher = crypto.createDecipheriv("aes-256-gcm", encryptionKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(content), decipher.final()]);
}

const encryptedStringFields: Record<string, string[]> = {
  LineDetails: ["telephoneNo", "dp", "name", "address", "ont", "voiceTestNo", "stb", "drumNumber", "phoneNumber", "ontSerial", "voiceTestNoNew", "stbSerial", "drumNumberNew"],
  Task: ["telephoneNo", "dp", "contactNo", "customerName", "address", "rejectionReason", "notes"],
};
const encryptedJsonFields: Record<string, string[]> = {
  LineDetailsRevision: ["beforeValues", "afterValues"],
  GeneratedInvoice: ["lineDetailsSnapshot", "invoiceContentSnapshot"],
  MonthlyReportVersion: ["sourceSnapshot"],
};

function sensitiveTexts(model: string, data: Record<string, any>) {
  return (encryptedStringFields[model] || []).map((field) => data[field]).filter((value): value is string => typeof value === "string" && value.length > 0);
}

function transformWrite(model: string, operation: string, args: any) {
  if (!args || (!args.data && operation !== "upsert")) return args;
  const transform = (record: any, isCreate = operation === "create" || operation === "createMany") => {
    if (!record || typeof record !== "object" || Array.isArray(record)) return record;
    const output = { ...record };
    const originalTexts = sensitiveTexts(model, output);
    for (const field of encryptedStringFields[model] || []) {
      const value = output[field];
      if (typeof value === "string" && value) output[field] = encryptCustomerValue(value);
    }
    if ((model === "LineDetails" || model === "Task") && typeof output.telephoneNo === "string") {
      const rawPhone = isCustomerDataEncrypted(output.telephoneNo) ? decryptCustomerValue(output.telephoneNo) : output.telephoneNo;
      output.telephoneNoLookup = customerDataLookup(rawPhone);
    }
    if ((model === "LineDetails" || model === "Task") && originalTexts.length) {
      const tokens = customerDataSearchTokens(originalTexts);
      output.customerSearchTokens = isCreate ? tokens : { push: tokens };
    }
    for (const field of encryptedJsonFields[model] || []) {
      if (Object.prototype.hasOwnProperty.call(output, field)) output[field] = encryptCustomerJson(output[field]);
    }
    if (model === "MonthlyReportDocument" && output.pdfBytes instanceof Uint8Array) output.pdfBytes = encryptCustomerBytes(output.pdfBytes);
    return output;
  };
  if (operation === "upsert") return { ...args, create: transform(args.create, true), update: transform(args.update, false) };
  const data = args.data;
  const nextData = Array.isArray(data) ? data.map((record) => transform(record, true)) : transform(data);
  return { ...args, data: nextData };
}

function transformWhere(model: string, value: any): any {
  if (!value || typeof value !== "object") return value;
  // Prisma filters can contain special values such as Date instances. Only
  // walk plain filter objects; rebuilding a Date as `{}` corrupts gte/lte
  // operands (for example, the Daily Book date range).
  if (value instanceof Date || value instanceof Uint8Array) return value;
  if (Array.isArray(value)) return value.map((item) => transformWhere(model, item));
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) return value;
  const output: Record<string, any> = {};
  for (const [key, child] of Object.entries(value)) {
    const encryptedFields = encryptedStringFields[model] || [];
    if (encryptedFields.includes(key)) {
      if (key === "telephoneNo" && typeof child === "string") {
        output.OR = [...(Array.isArray(output.OR) ? output.OR : []), { telephoneNoLookup: customerDataLookup(child) }, { telephoneNo: child }];
        continue;
      }
      if (key === "telephoneNo" && child && typeof child === "object" && Array.isArray((child as any).in)) {
        output.OR = [...(Array.isArray(output.OR) ? output.OR : []), { telephoneNoLookup: { in: (child as any).in.map((item: string) => customerDataLookup(item)) } }, { telephoneNo: child }];
        continue;
      }
      if (child && typeof child === "object" && !Array.isArray(child) && typeof (child as any).contains === "string") {
        const search = (child as any).contains;
        const normalized = search.normalize("NFKC").toLocaleLowerCase("en-US");
        const tokens = customerDataSearchTokens([normalized]);
        output.customerSearchTokens = { hasEvery: tokens };
        continue;
      }
      if (key === "telephoneNo" && child && typeof child === "object" && typeof (child as any).equals === "string") {
        const raw = (child as any).equals;
        output.OR = [...(Array.isArray(output.OR) ? output.OR : []), { telephoneNoLookup: customerDataLookup(raw) }, { telephoneNo: raw }];
        continue;
      }
    }
    output[key] = transformWhere(model, child);
  }
  return output;
}

function decryptResultValue(value: any): any {
  if (Array.isArray(value)) return value.map(decryptResultValue);
  if (!value || typeof value !== "object") return value;
  if (value instanceof Date || value instanceof Uint8Array || Object.getPrototypeOf(value) !== Object.prototype) return value;
  const output: Record<string, any> = { ...value };
  for (const [key, child] of Object.entries(output)) {
    if (key === "telephoneNoLookup" || key === "customerSearchTokens") { delete output[key]; continue; }
    if (typeof child === "string" && isCustomerDataEncrypted(child)) {
      const plaintext = decryptCustomerValue(child);
      output[key] = ["beforeValues", "afterValues", "lineDetailsSnapshot", "invoiceContentSnapshot", "sourceSnapshot"].includes(key) ? JSON.parse(plaintext) : plaintext;
    } else if ((key === "pdfBytes") && child instanceof Uint8Array) output[key] = decryptCustomerBytes(child);
    else output[key] = decryptResultValue(child);
  }
  return output;
}

export function withCustomerDataEncryption(client: any) {
  return client.$extends({
    query: {
      $allModels: {
        $allOperations: async ({ model, operation, args, query }: any) => {
          const modelName = String(model || "");
          const nextArgs = { ...(args || {}) };
          if (nextArgs.where && (encryptedStringFields[modelName] || []).length) nextArgs.where = transformWhere(modelName, nextArgs.where);
          const writeOperations = ["create", "createMany", "update", "updateMany", "upsert"];
          const transformedArgs = writeOperations.includes(operation) ? transformWrite(modelName, operation, nextArgs) : nextArgs;
          return decryptResultValue(await query(transformedArgs));
        },
      },
    },
  });
}
