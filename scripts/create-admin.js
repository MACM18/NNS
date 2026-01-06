/*
  One-off admin creation script.
  - Creates or updates the user with email hello@macm.dev
  - Sets password to a bcrypt hash of NNS1218
  - Ensures a Profile with role "admin" exists for the user
*/

require("dotenv").config();
const bcrypt = require("bcryptjs");
const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const { Pool } = require("pg");

// Create Prisma client with driver adapter (same as lib/prisma.ts)
function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;

  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);

  return new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });
}

const prisma = createPrismaClient();

async function main() {
  const email = "hello@macm.dev";
  const plainPassword = "NNS1218";

  const passwordHash = await bcrypt.hash(plainPassword, 10);

  // Upsert user by email
  const user = await prisma.user.upsert({
    where: { email },
    update: { password: passwordHash },
    create: {
      email,
      password: passwordHash,
    },
    include: { profile: true },
  });

  // Ensure profile with admin role
  await prisma.profile.upsert({
    where: { userId: user.id },
    update: {
      email,
      fullName: user.profile?.fullName || "Admin",
      role: "admin",
    },
    create: {
      userId: user.id,
      email,
      fullName: "Admin",
      role: "admin",
    },
  });

  console.log("Admin user ensured:", { id: user.id, email });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
