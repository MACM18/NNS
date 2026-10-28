import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function isManager(role?: string | null) {
  return ["admin", "moderator", "superadmin"].includes(String(role || "").toLowerCase());
}

async function currentProfile() {
  const session = await auth();
  if (!session?.user?.id) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  const profile = await prisma.profile.findUnique({ where: { userId: session.user.id }, select: { role: true } });
  if (!isManager(profile?.role)) return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  return { profile };
}

export async function GET() {
  try {
    const access = await currentProfile();
    if (access.error) return access.error;
    const settings = await prisma.invoiceSettings.upsert({ where: { id: "default" }, create: { id: "default" }, update: {} });
    return NextResponse.json({ data: { percentA: settings.percentA, percentB: settings.percentB } });
  } catch (error) {
    console.error("Could not load invoice settings:", error);
    return NextResponse.json({ error: "Could not load invoice settings." }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const access = await currentProfile();
    if (access.error) return access.error;
    const body = await request.json();
    const percentA = Number(body.percentA);
    const percentB = Number(body.percentB);
    if (!Number.isInteger(percentA) || !Number.isInteger(percentB) || percentA < 1 || percentA > 99 || percentB < 1 || percentB > 99 || percentA + percentB !== 100) {
      return NextResponse.json({ error: "Enter whole-number percentages between 1 and 99 that add up to 100." }, { status: 400 });
    }
    const settings = await prisma.invoiceSettings.upsert({
      where: { id: "default" },
      create: { id: "default", percentA, percentB },
      update: { percentA, percentB },
    });
    return NextResponse.json({ data: { percentA: settings.percentA, percentB: settings.percentB } });
  } catch (error) {
    console.error("Could not update invoice settings:", error);
    return NextResponse.json({ error: "Could not save invoice settings." }, { status: 500 });
  }
}
