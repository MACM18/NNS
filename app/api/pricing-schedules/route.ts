import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createPricingSchedule, listPricingSchedules, DEFAULT_DATA_TIERS, DEFAULT_PEO_TV_RATE } from "@/lib/pricing-service";
import { prisma } from "@/lib/prisma";
import { OPTIONAL_ITEM_RATES } from "@/lib/service-pricing-types";

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
    peo_tv_rate: Number(schedule.peoTvRate ?? DEFAULT_PEO_TV_RATE),
    optional_rates: { ...OPTIONAL_ITEM_RATES, ...(schedule.optionalRates as Record<string, number> || {}) },
    tiers: schedule.tiers.filter((tier) => tier.serviceType !== "DATA").map((tier) => ({
      id: tier.id,
      min_length: Number(tier.minLength),
      max_length: tier.maxLength == null ? null : Number(tier.maxLength),
      rate: Number(tier.rate),
    })),
    data_tiers: (schedule.tiers.some((tier) => tier.serviceType === "DATA")
      ? schedule.tiers.filter((tier) => tier.serviceType === "DATA")
      : DEFAULT_DATA_TIERS).map((tier) => ({
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
    const dataTiers = Array.isArray(body.data_tiers) ? body.data_tiers : [];
    const schedule = await createPricingSchedule({
      name: String(body.name || ""),
      effectiveFrom: String(body.effective_from || body.effectiveFrom || ""),
      tiers: tiers.map((tier: Record<string, unknown>) => ({
        minLength: Number(tier.min_length ?? tier.minLength),
        maxLength: tier.max_length == null || String(tier.max_length) === "" ? null : Number(tier.max_length ?? tier.maxLength),
        rate: Number(tier.rate),
      })),
      dataTiers: dataTiers.map((tier: Record<string, unknown>) => ({
        minLength: Number(tier.min_length ?? tier.minLength),
        maxLength: tier.max_length == null || String(tier.max_length) === "" ? null : Number(tier.max_length ?? tier.maxLength),
        rate: Number(tier.rate),
      })),
      peoTvRate: Number(body.peo_tv_rate),
      optionalRates: body.optional_rates,
      createdById: profile.id,
    });
    return NextResponse.json({ data: formatSchedule(schedule) }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create pricing schedule";
    const status = message.includes("already exists") || message.includes("required") || message.includes("tier") || message.includes("ordered") || message.includes("rate") || message.includes("positive") ? 400 : 500;
    console.error("Error creating pricing schedule:", error);
    return NextResponse.json({ error: message }, { status });
  }
}
