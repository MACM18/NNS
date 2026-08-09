import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createPricingSchedule, listPricingSchedules } from "@/lib/pricing-service";
import { prisma } from "@/lib/prisma";

const MANAGEMENT_ROLES = ["admin", "superadmin"];
const VIEW_ROLES = ["admin", "moderator", "superadmin"];

async function currentProfile() {
  const session = await auth();
  if (!session?.user?.id) return null;
  return prisma.profile.findUnique({ where: { userId: session.user.id }, select: { id: true, role: true } });
}

function formatSchedule(schedule: Awaited<ReturnType<typeof listPricingSchedules>>[number]) {
  return {
    id: schedule.id,
    name: schedule.name,
    effective_from: schedule.effectiveFrom.toISOString().slice(0, 10),
    status: schedule.status,
    locked_at: schedule.lockedAt?.toISOString() || null,
    created_at: schedule.createdAt.toISOString(),
    tiers: schedule.tiers.map((tier) => ({
      id: tier.id,
      min_length: Number(tier.minLength),
      max_length: tier.maxLength == null ? null : Number(tier.maxLength),
      rate: Number(tier.rate),
    })),
  };
}

export async function GET() {
  try {
    const profile = await currentProfile();
    if (!profile) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!VIEW_ROLES.includes((profile.role || "user").toLowerCase())) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const schedules = await listPricingSchedules();
    return NextResponse.json({ data: schedules.map(formatSchedule) });
  } catch (error) {
    console.error("Error listing pricing schedules:", error);
    return NextResponse.json({ error: "Failed to load pricing schedules" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const profile = await currentProfile();
    if (!profile) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!MANAGEMENT_ROLES.includes((profile.role || "user").toLowerCase())) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const body = await request.json();
    const tiers = Array.isArray(body.tiers) ? body.tiers : [];
    const schedule = await createPricingSchedule({
      name: String(body.name || ""),
      effectiveFrom: String(body.effective_from || body.effectiveFrom || ""),
      tiers: tiers.map((tier: Record<string, unknown>) => ({
        minLength: Number(tier.min_length ?? tier.minLength),
        maxLength: tier.max_length == null || String(tier.max_length) === "" ? null : Number(tier.max_length ?? tier.maxLength),
        rate: Number(tier.rate),
      })),
      createdById: profile.id,
    });
    return NextResponse.json({ data: formatSchedule(schedule) }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create pricing schedule";
    const status = message.includes("already exists") || message.includes("required") || message.includes("tier") || message.includes("ordered") ? 400 : 500;
    console.error("Error creating pricing schedule:", error);
    return NextResponse.json({ error: message }, { status });
  }
}
