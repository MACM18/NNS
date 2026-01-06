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
    const telephoneNo = searchParams.get("telephone_no");

    if (!telephoneNo) {
      return NextResponse.json(
        { error: "telephone_no parameter is required" },
        { status: 400 }
      );
    }

    const lineDetails = await prisma.lineDetails.findFirst({
      where: {
        telephoneNo: telephoneNo,
      },
      select: {
        id: true,
      },
    });

    return NextResponse.json({
      exists: !!lineDetails,
      id: lineDetails?.id || null,
    });
  } catch (error) {
    console.error("Error checking line details:", error);
    return NextResponse.json(
      { error: "Failed to check line details" },
      { status: 500 }
    );
  }
}
