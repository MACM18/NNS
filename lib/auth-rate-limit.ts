import { createHash } from "node:crypto";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

const HOUR_MS = 60 * 60 * 1000;

/** Uses only a hash of the caller address; raw network identifiers are not stored. */
export async function allowAuthAttempt(request: NextRequest, action: string, limit: number, now = Date.now()) {
  const realIp = request.headers.get("x-real-ip")?.trim();
  const forwarded = request.headers.get("x-forwarded-for")?.split(",").map(value => value.trim()).filter(Boolean);
  const clientAddress = realIp || forwarded?.at(-1) || "unknown";
  const windowStart = Math.floor(now / HOUR_MS) * HOUR_MS;
  const expiresAt = new Date(windowStart + HOUR_MS);
  const id = createHash("sha256").update(`${action}:${clientAddress}:${windowStart}`).digest("hex");
  const bucket = await prisma.authRateLimitBucket.upsert({
    where: { id },
    create: { id, count: 1, expiresAt },
    update: { count: { increment: 1 } },
    select: { count: true },
  });

  // Opportunistic cleanup keeps this small table bounded without a separate job.
  if (parseInt(id.slice(0, 2), 16) === 0) {
    await prisma.authRateLimitBucket.deleteMany({ where: { expiresAt: { lt: new Date(now - HOUR_MS) } } });
  }
  return bucket.count <= limit;
}
