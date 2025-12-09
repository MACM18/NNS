"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useSession, signOut as nextAuthSignOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";

// Profile type
export interface Profile {
  id: string;
  userId: string;
  email: string | null;
  fullName: string | null;
  role: string;
  createdAt: Date;
  updatedAt: Date;
}

// Context type
interface AuthContextType {
  user: {
    id: string;
    email: string;
    name?: string | null;
    role: string;
  } | null;
  profile: Profile | null;
  loading: boolean;
  role: string | null;
  isGoogleUser: boolean;
  refreshSession: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { data: session, status, update } = useSession();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isGoogleUser, setIsGoogleUser] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const loading = status === "loading";
  const user = session?.user ? {
    id: session.user.id,
    email: session.user.email || "",
    name: session.user.name,
    role: session.user.role || "user",
  } : null;
  const role = session?.user?.role || null;

  // Fetch full profile from database
  const fetchProfile = useCallback(async () => {
    if (!session?.user?.id) {
      setProfile(null);
      return;
    }

    try {
      const response = await fetch(`/api/profile/${session.user.id}`);
      if (response.ok) {
        const data = await response.json();
        setProfile(data.profile);
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
    }
  }, [session?.user?.id]);

  // Check if user is Google OAuth user
  useEffect(() => {
    if (session?.user) {
      // Check if the user has an account with Google provider
      // This is simplified - in production you might want to check the accounts table
      setIsGoogleUser(false); // Will be updated when we have account info
      fetchProfile();
    } else {
      setProfile(null);
      setIsGoogleUser(false);
    }
  }, [session, fetchProfile]);

  // Refresh session
  const refreshSession = useCallback(async () => {
    try {
      await update();
      await fetchProfile();
      toast({
        title: "Refreshed",
        description: "Session refreshed",
        duration: 2000,
      });
    } catch (error) {
      console.error("Error refreshing session:", error);
    }
  }, [update, fetchProfile, toast]);

  // Sign out
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
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
