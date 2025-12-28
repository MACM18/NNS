import NextAuth from "next-auth";
import type { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";

// Maximum login attempts before account lockout
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_MINUTES = 15;

export const authConfig: NextAuthConfig = {
  // Allow runtime host when behind a trusted proxy (e.g., Coolify)
  trustHost: true,
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
        twoFactorCode: { label: "2FA Code", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const email = credentials.email as string;
        const password = credentials.password as string;
        const twoFactorCode = credentials.twoFactorCode as string | undefined;

        const user = await prisma.user.findUnique({
          where: { email },
          include: { profile: true },
        });

        if (!user || !user.password) {
          return null;
        }

        // Check if account is locked
        if (user.accountLockedUntil && user.accountLockedUntil > new Date()) {
          const remainingMinutes = Math.ceil(
            (user.accountLockedUntil.getTime() - Date.now()) / 60000
          );
          throw new Error(
            `Account locked. Try again in ${remainingMinutes} minutes.`
          );
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
          // Increment login attempts
          const newAttempts = user.loginAttempts + 1;
          const updateData: Record<string, unknown> = {
            loginAttempts: newAttempts,
          };

          // Lock account if max attempts reached
          if (newAttempts >= MAX_LOGIN_ATTEMPTS) {
            updateData.accountLockedUntil = new Date(
              Date.now() + LOCKOUT_DURATION_MINUTES * 60 * 1000
            );
          }

          await prisma.user.update({
            where: { id: user.id },
            data: updateData,
          });

          // Log failed attempt
          await prisma.loginHistory.create({
            data: {
              userId: user.id,
              success: false,
              failReason: "invalid_password",
            },
          });

          return null;
        }

        // Check if 2FA is enabled
        if (user.twoFactorEnabled && user.twoFactorSecret) {
          if (!twoFactorCode) {
            // Signal that 2FA is required
            throw new Error("2FA_REQUIRED:" + user.id);
          }

          // Verify 2FA code
          const { authenticator } = await import("otplib");
          const { decrypt, verifyBackupCode } = await import(
            "@/lib/encryption"
          );

          const secret = decrypt(user.twoFactorSecret);
          const cleanCode = twoFactorCode.replace(/[-\s]/g, "").toUpperCase();

          let isValid2FA = authenticator.verify({
            token: cleanCode,
            secret,
          });

          // If not valid as TOTP, try backup codes
          if (!isValid2FA && user.twoFactorBackupCodes) {
            const backupCodes = user.twoFactorBackupCodes as string[];
            const formattedCode =
              cleanCode.length === 8
                ? `${cleanCode.slice(0, 4)}-${cleanCode.slice(4)}`
                : cleanCode;

            for (let i = 0; i < backupCodes.length; i++) {
              if (verifyBackupCode(formattedCode, backupCodes[i])) {
                isValid2FA = true;
                // Remove used backup code
                const updatedCodes = [...backupCodes];
                updatedCodes.splice(i, 1);
                await prisma.user.update({
                  where: { id: user.id },
                  data: { twoFactorBackupCodes: updatedCodes },
                });
                break;
              }
            }
          }

          if (!isValid2FA) {
            // Log failed 2FA attempt
            await prisma.loginHistory.create({
              data: {
                userId: user.id,
                success: false,
                failReason: "2fa_failed",
              },
            });
            throw new Error("Invalid 2FA code");
          }
        }

        // Reset login attempts on successful login
        await prisma.user.update({
          where: { id: user.id },
          data: {
            loginAttempts: 0,
            accountLockedUntil: null,
          },
        });

        // Log successful login
        await prisma.loginHistory.create({
          data: {
            userId: user.id,
            success: true,
          },
        });

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

        // Log OAuth login
        await prisma.loginHistory.create({
          data: {
            userId: user.id,
            success: true,
          },
        });
      }
      return true;
    },
    async jwt({ token, user, trigger, session }) {
      if (user) {
        // Initial sign-in - get profile data and password expiry info
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: {
            lastPasswordChange: true,
            password: true,
            profile: {
              select: {
                role: true,
                fullName: true,
                preferences: true,
              },
            },
          },
        });

        token.id = user.id;
        token.role = dbUser?.profile?.role || "user";
        token.fullName = dbUser?.profile?.fullName || user.name;

        // Check password expiry (only for non-OAuth users)
        if (dbUser?.password && dbUser.profile?.preferences) {
          const prefs = dbUser.profile.preferences as Record<
            string,
            Record<string, unknown>
          >;
          const passwordExpiryDays = parseInt(
            String(prefs?.security?.password_expiry || "0"),
            10
          );

          if (passwordExpiryDays > 0 && dbUser.lastPasswordChange) {
            const expiryDate = new Date(dbUser.lastPasswordChange);
            expiryDate.setDate(expiryDate.getDate() + passwordExpiryDays);
            token.passwordExpired = new Date() > expiryDate;
          }
        }
      }

      // Handle session updates (e.g., when role changes)
      if (trigger === "update" && session) {
        token.role = session.role || token.role;
        token.fullName = session.fullName || token.fullName;
        if (session.passwordExpired !== undefined) {
          token.passwordExpired = session.passwordExpired;
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.fullName = token.fullName as string;
        session.user.passwordExpired = token.passwordExpired as
          | boolean
          | undefined;
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
      passwordExpired?: boolean;
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
    passwordExpired?: boolean;
  }
}
