import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const dp = searchParams.get("dp");

    if (!dp) {
      return NextResponse.json(
        { error: "DP parameter is required" },
        { status: 400 }
      );
    }

    // Check if DP already exists in line_details
    const existingLine = await prisma.lineDetails.findFirst({
      where: {
        dp: {
          equals: dp,
          mode: "insensitive",
        },
      },
      select: {
        dp: true,
      },
    });

    return NextResponse.json({
      exists: !!existingLine,
      dp: existingLine?.dp || null,
    });
  } catch (error) {
    console.error("Error validating DP:", error);
    return NextResponse.json(
      { error: "Failed to validate DP" },
      { status: 500 }
    );
  }
}
