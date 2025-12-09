import NextAuth from "next-auth";
import type { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";

export const authConfig: NextAuthConfig = {
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
    error: "/auth/error",
  },
  providers: [
    Google({
      clientId: process.env.GOOGLE_OAUTH_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_OAUTH_CLIENT_SECRET!,
      allowDangerousEmailAccountLinking: true,
    }),
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const email = credentials.email as string;
        const password = credentials.password as string;

        const user = await prisma.user.findUnique({
          where: { email },
          include: { profile: true },
        });

        if (!user || !user.password) {
          return null;
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.profile?.fullName,
          role: user.profile?.role || "user",
        };
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      // For OAuth providers, auto-create profile if it doesn't exist
      if (account?.provider === "google" && user.id) {
        const existingProfile = await prisma.profile.findUnique({
          where: { userId: user.id },
        });

        if (!existingProfile) {
          await prisma.profile.create({
            data: {
              userId: user.id,
              email: user.email || "",
              fullName: user.name || "",
              role: "user",
            },
          });
        }
      }
      return true;
    },
    async jwt({ token, user, trigger, session }) {
      if (user) {
        // Initial sign-in - get profile data
        const profile = await prisma.profile.findUnique({
          where: { userId: user.id },
        });
        token.id = user.id;
        token.role = profile?.role || "user";
        token.fullName = profile?.fullName || user.name;
      }
      
      // Handle session updates (e.g., when role changes)
      if (trigger === "update" && session) {
        token.role = session.role || token.role;
        token.fullName = session.fullName || token.fullName;
      }
      
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.fullName = token.fullName as string;
      }
      return session;
    },
  },
  events: {
    async createUser({ user }) {
      // Create profile when user is created via OAuth
      if (user.id) {
        const existingProfile = await prisma.profile.findUnique({
          where: { userId: user.id },
        });
        
        if (!existingProfile) {
          await prisma.profile.create({
            data: {
              userId: user.id,
              email: user.email || "",
              fullName: user.name || "",
              role: "user",
            },
          });
        }
      }
    },
  },
};

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);

// Extended session type
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      image?: string | null;
      role: string;
      fullName?: string;
    };
  }

  interface User {
    role?: string;
    fullName?: string;
  }

  interface JWT {
    id?: string;
    role?: string;
    fullName?: string;
  }
}
