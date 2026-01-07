// ==========================================
// ACCOUNTING API - INITIALIZE
// POST /api/accounting/initialize
// ==========================================

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  hasAccountingAccess,
  initializeAccounting,
} from "@/lib/accounting-service";

export async function POST() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user profile and role
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

    const result = await initializeAccounting();

    return NextResponse.json({
      success: true,
      message: "Accounting module initialized successfully",
      data: result,
    });
  } catch (error) {
    console.error("Error initializing accounting:", error);
    return NextResponse.json(
      { error: "Failed to initialize accounting module" },
      { status: 500 }
    );
  }
}
