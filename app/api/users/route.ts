import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

type UserSelect = {
  id: string;
  email: string | null;
  emailVerified: Date | null;
  createdAt: Date;
};

type ProfileData = {
  id: string;
  userId: string;
  email: string | null;
  full_name: string | null;
  role: string | null;
  phone: string | null;
  avatar_url: string | null;
  created_at: Date;
  updated_at: Date;
};

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get profiles (which contains role info)
    const profiles = await prisma.profile.findMany({
      orderBy: { createdAt: "desc" },
    });

    // Get users for additional info including OAuth accounts
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        emailVerified: true,
        createdAt: true,
        accounts: {
          select: {
            provider: true,
          },
        },
      },
    });

    // Combine the data
    const combinedUsers = users.map(
      (user: UserSelect & { accounts?: { provider: string }[] }) => {
        const profile = profiles.find((p) => p.userId === user.id);
        return {
          ...user,
          profile,
          role: profile?.role || "user",
          full_name: profile?.fullName || null,
        };
      }
    );

    return NextResponse.json({
      data: {
        profiles,
        users: combinedUsers,
      },
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
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

    const body = await req.json();
    const { email, password, name, role } = body;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "User with this email already exists" },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user and profile
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
      },
    });

    const profile = await prisma.profile.create({
      data: {
        userId: user.id,
        email,
        fullName: name,
        role: role || "user",
      },
    });

    const result = { user, profile };

    return NextResponse.json({
      data: {
        user: {
          id: result.user.id,
          email: result.user.email,
          name: profile.fullName,
        },
        profile: result.profile,
      },
    });
  } catch (error) {
    console.error("Error creating user:", error);
    return NextResponse.json(
      { error: "Failed to create user" },
      { status: 500 }
    );
  }
}
