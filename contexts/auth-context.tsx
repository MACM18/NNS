"use client";

import type React from "react";
import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { useSession, signOut as nextAuthSignOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";

interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  role: string;
  created_at?: string;
  updated_at?: string;
  phone?: string | null;
  address?: string | null;
  bio?: string | null;
  avatar_url?: string | null;
}

// Extend the session user type
interface ExtendedUser {
  id: string;
  email?: string | null;
  name?: string | null;
  image?: string | null;
  role?: string;
}

interface AuthContextType {
  user: ExtendedUser | null;
  profile: Profile | null;
  loading: boolean;
  role: string | null;
  isGoogleUser: boolean;
  refreshSession: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { data: session, status, update } = useSession();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isGoogleUser, setIsGoogleUser] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const loading = status === "loading";
  const user = session?.user as ExtendedUser | null;
  const role = (user?.role || "user").toLowerCase();

  // Fetch profile data when session changes
  useEffect(() => {
    const fetchProfile = async () => {
      if (!user?.id) {
        setProfile(null);
        setIsGoogleUser(false);
        return;
      }

      try {
        const response = await fetch(`/api/profile/${user.id}`);
        if (response.ok) {
          const data = await response.json();
          const p = data.profile || {};
          // Normalize API camelCase profile to UI snake_case shape
          const normalizedProfile = {
            id: p.id,
            email: p.email ?? null,
            full_name: p.fullName ?? p.full_name ?? null,
            role: p.role ?? "user",
            created_at: p.createdAt
              ? new Date(p.createdAt).toISOString()
              : undefined,
            updated_at: p.updatedAt
              ? new Date(p.updatedAt).toISOString()
              : undefined,
            phone: p.phone ?? null,
            address: p.address ?? null,
            bio: p.bio ?? null,
            avatar_url: p.avatarUrl ?? p.avatar_url ?? null,
          };
          setProfile(normalizedProfile as any);

          // Check if user is a Google OAuth user
          const accountsResponse = await fetch(`/api/users/${user.id}`);
          if (accountsResponse.ok) {
            const userData = await accountsResponse.json();
            const hasGoogleAccount = userData.data?.accounts?.some(
              (acc: { provider: string }) => acc.provider === "google"
            );
            setIsGoogleUser(hasGoogleAccount || false);
          }
        }
      } catch (error) {
        console.error("Error fetching profile:", error);
      }
    };

    fetchProfile();
  }, [user?.id]);

  const refreshSession = useCallback(async () => {
    try {
      await update();
      toast({
        title: "Refreshed",
        description: "Session refreshed",
        duration: 2000,
      });
    } catch (err) {
      console.error("Error refreshing session:", err);
    }
  }, [update, toast]);

  const signOut = useCallback(async () => {
    try {
      await nextAuthSignOut({ redirect: false });
      setProfile(null);
      setIsGoogleUser(false);
      router.push("/");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  }, [router]);

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        role,
        isGoogleUser,
        refreshSession,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  // Return a default loading state during SSR prerendering
  // This prevents build errors while still enforcing context in development
  if (context === undefined) {
    // During SSR/prerendering, return a default state
    if (typeof window === "undefined") {
      return {
        user: null,
        profile: null,
        loading: true,
        role: null,
        isGoogleUser: false,
        refreshSession: async () => {},
        signOut: async () => {},
      };
    }
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
