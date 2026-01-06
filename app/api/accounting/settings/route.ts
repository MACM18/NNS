// ==========================================
// ACCOUNTING API - SETTINGS
// GET/PUT /api/accounting/settings
// ==========================================

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  getAccountingSettings,
  hasAccountingAccess,
  updateAccountingSettings,
} from "@/lib/accounting-service";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const profile = await prisma.profile.findUnique({
      where: { userId: session.user.id },
      select: { role: true },
    });

    if (!hasAccountingAccess(profile?.role)) {
      return NextResponse.json(
        { error: "Access denied. Moderator or admin role required." },
        { status: 403 }
      );
    }

    const settings = await getAccountingSettings();

    return NextResponse.json({ data: settings });
  } catch (error) {
    console.error("Error fetching accounting settings:", error);
    return NextResponse.json(
      { error: "Failed to fetch accounting settings" },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const profile = await prisma.profile.findUnique({
      where: { userId: session.user.id },
      select: { role: true },
    });

    if (!hasAccountingAccess(profile?.role)) {
      return NextResponse.json(
        { error: "Access denied. Moderator or admin role required." },
        { status: 403 }
      );
    }

    // Only admin can update settings
    const role = (profile?.role || "").toLowerCase();
    if (!["admin", "superadmin"].includes(role)) {
      return NextResponse.json(
        { error: "Only administrators can update accounting settings" },
        { status: 403 }
      );
    }

    const body = await req.json();

    const settings = await updateAccountingSettings(body);

    return NextResponse.json({ data: settings });
  } catch (error) {
    console.error("Error updating accounting settings:", error);
    return NextResponse.json(
      { error: "Failed to update accounting settings" },
      { status: 500 }
    );
  }
}
