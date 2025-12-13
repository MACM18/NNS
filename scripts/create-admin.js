/*
  One-off admin creation script.
  - Creates or updates the user with email hello@macm.dev
  - Sets password to a bcrypt hash of NNS1218
  - Ensures a Profile with role "admin" exists for the user
*/

require("dotenv").config();
const bcrypt = require("bcryptjs");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

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