import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { withCustomerDataEncryption } from "@/lib/customer-data-encryption";

const globalForPrisma = globalThis as unknown as {
  prisma: any;
};

// Create Prisma client with driver adapter for Prisma 7
function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;

  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);

  const client = new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });
  return withCustomerDataEncryption(client);
}

export const prisma = (globalForPrisma.prisma ?? createPrismaClient()) as PrismaClient;

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export default prisma;
