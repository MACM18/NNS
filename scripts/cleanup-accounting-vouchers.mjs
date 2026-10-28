import { readdir, unlink } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const directory = path.resolve(
  process.env.ACCOUNTING_VOUCHER_STORAGE_DIR || path.join(projectRoot, "storage", "accounting-vouchers"),
);
const ownedDirectory = path.join(projectRoot, "storage", "accounting-vouchers");

if (!process.env.ACCOUNTING_VOUCHER_STORAGE_DIR && directory !== ownedDirectory) {
  throw new Error("Refusing to clean a voucher directory outside the application storage path");
}

let entries;
try {
  entries = await readdir(directory, { withFileTypes: true });
} catch (error) {
  if (error?.code === "ENOENT") {
    console.log("No accounting voucher storage directory exists.");
    process.exit(0);
  }
  throw error;
}

const voucherFile = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(pdf|jpg|png)$/i;
let removed = 0;
for (const entry of entries) {
  if (!entry.isFile() || !voucherFile.test(entry.name)) continue;
  await unlink(path.join(directory, entry.name));
  removed += 1;
}

console.log(`Removed ${removed} stored accounting voucher file${removed === 1 ? "" : "s"}.`);
