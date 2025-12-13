import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

let profileColumnsCache: Set<string> | null = null;
let profileColumnsCacheAt = 0;

async function getProfileTableColumns(): Promise<Set<string>> {
  // Cache for 5 minutes to avoid hitting information_schema on every request.
  const now = Date.now();
  if (profileColumnsCache && now - profileColumnsCacheAt < 5 * 60 * 1000) {
    return profileColumnsCache;
  }

  const rows = (await prisma.$queryRaw`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles'
  `) as Array<{ column_name: string }>;

  profileColumnsCache = new Set(rows.map((r) => r.column_name));
  profileColumnsCacheAt = now;
  return profileColumnsCache;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const { id } = await params;

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Users can only fetch their own profile, unless they're admin
    if (session.user.id !== id && session.user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const columns = await getProfileTableColumns();

    const profile = await prisma.profile.findUnique({
      where: { userId: id },
      select: {
        id: true,
        userId: true,
        email: true,
        fullName: true,
        role: true,
        createdAt: true,
        updatedAt: true,
        ...(columns.has("phone") ? { phone: true } : {}),
        ...(columns.has("address") ? { address: true } : {}),
        ...(columns.has("bio") ? { bio: true } : {}),
        ...(columns.has("avatar_url") ? { avatarUrl: true } : {}),
      },
    });

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    return NextResponse.json({ profile });
  } catch (error) {
    console.error("Error fetching profile:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const { id } = await params;

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Users can only update their own profile, unless they're admin
    if (session.user.id !== id && session.user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const columns = await getProfileTableColumns();

    const body = await request.json();
    const { fullName, email, phone, address, bio, avatarUrl } = body;

    const data: Record<string, unknown> = {
      ...(fullName !== undefined && { fullName }),
      ...(email !== undefined && { email }),
      ...(phone !== undefined && columns.has("phone") && { phone }),
      ...(address !== undefined && columns.has("address") && { address }),
      ...(bio !== undefined && columns.has("bio") && { bio }),
      ...(avatarUrl !== undefined && columns.has("avatar_url") && { avatarUrl }),
    };

    const profile = await prisma.profile.update({
      where: { userId: id },
      data,
    });

    return NextResponse.json({ profile });
  } catch (error) {
    console.error("Error updating profile:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
