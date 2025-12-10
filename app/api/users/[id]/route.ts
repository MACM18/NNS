import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        emailVerified: true,
        createdAt: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const profile = await prisma.profile.findUnique({
      where: { userId: id },
    });

    return NextResponse.json({
      data: {
        ...user,
        profile,
        role: profile?.role || "user",
        full_name: profile?.full_name || user.name,
      },
    });
  } catch (error) {
    console.error("Error fetching user:", error);
    return NextResponse.json(
      { error: "Failed to fetch user" },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if current user is admin
    const currentProfile = await prisma.profile.findUnique({
      where: { userId: session.user.id },
    });

    if (currentProfile?.role !== "admin") {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await req.json();
    const { full_name, email, role } = body;

    // Update profile
    const profile = await prisma.profile.upsert({
      where: { userId: id },
      update: {
        full_name,
        email,
        role,
        updated_at: new Date(),
      },
      create: {
        userId: id,
        full_name,
        email,
        role: role || "user",
      },
    });

    // Update user name if full_name provided
    if (full_name) {
      await prisma.user.update({
        where: { id },
        data: { name: full_name },
      });
    }

    return NextResponse.json({ data: profile });
  } catch (error) {
    console.error("Error updating user:", error);
    return NextResponse.json(
      { error: "Failed to update user" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if current user is admin
    const currentProfile = await prisma.profile.findUnique({
      where: { userId: session.user.id },
    });

    if (currentProfile?.role !== "admin") {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    const { id } = await params;

    // Use transaction to delete related records
    await prisma.$transaction(async (tx: any) => {
      // Delete profile first
      await tx.profile.deleteMany({
        where: { userId: id },
      });

      // Delete sessions
      await tx.session.deleteMany({
        where: { userId: id },
      });

      // Delete accounts (OAuth connections)
      await tx.account.deleteMany({
        where: { userId: id },
      });

      // Finally delete user
      await tx.user.delete({
        where: { id },
      });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting user:", error);
    return NextResponse.json(
      { error: "Failed to delete user" },
      { status: 500 }
    );
  }
}
