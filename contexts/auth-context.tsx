"use client";

import type React from "react";
import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";

interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  role: string; // e.g., 'user' | 'admin' | 'moderator'
  created_at?: string;
  updated_at?: string;
  // Optional extended profile fields stored in DB (used by profile/settings pages)
  phone?: string | null;
  address?: string | null;
  bio?: string | null;
  avatar_url?: string | null;
}

interface AuthContextType {
  user: User | null;
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
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [isGoogleUser, setIsGoogleUser] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Helpers: fetch and create a profile without relying on PostgREST error codes
  const fetchProfile = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      // maybeSingle() returns null when not found without throwing
      .maybeSingle();

    if (error) throw error;
    return (data as unknown as Profile) ?? null;
  }, []);

  const createProfile = useCallback(
    async (userId: string, userEmail: string, userName: string | null) => {
      const payload = {
        id: userId,
        email: userEmail || null,
        full_name: userName || userEmail || null,
        role: "user" as const,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      const { data, error } = await supabase
        .from("profiles")
        .insert(payload)
        .select("*")
        .single();
      if (error) throw error;
      return data as unknown as Profile;
    },
    []
  );

  const getOrCreateProfile = useCallback(
    async (userId: string, userEmail: string, userName: string | null) => {
      try {
        const existing = await fetchProfile(userId);
        if (existing) {
          return {
            role: (existing.role || "user").toLowerCase(),
            profile: existing,
          };
        }
        const created = await createProfile(userId, userEmail, userName);
        return {
          role: (created.role || "user").toLowerCase(),
          profile: created,
        };
      } catch (err) {
        console.error("Error ensuring user profile:", err);
        return { role: "user", profile: null };
      }
    },
    [createProfile, fetchProfile]
  );

  const applySession = useCallback(
    async (session: Session | null, isMounted: () => boolean) => {
      if (!isMounted()) return;

      if (session?.user) {
        setUser(session.user);
        // Check if user is a Google OAuth user
        const googleProvider =
          session.user.app_metadata?.provider === "google" ||
          session.user.identities?.some((id) => id.provider === "google");
        setIsGoogleUser(googleProvider || false);

        // Get user name from metadata
        const userName =
          session.user.user_metadata?.full_name ||
          session.user.user_metadata?.name ||
          null;

        const roleValue = await getOrCreateProfile(
          session.user.id,
          session.user.email || "",
          userName
        );
        if (!isMounted()) return;
        setRole(roleValue.role?.toLowerCase?.() || "user");
        setProfile(roleValue.profile as Profile | null);
      } else {
        setUser(null);
        setRole(null);
        setIsGoogleUser(false);
        setProfile(null);
      }
    },
    [getOrCreateProfile]
  );

  useEffect(() => {
    let mounted = true;
    const isMounted = () => mounted;

    const initialize = async () => {
      setLoading(true);
      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        let activeSession = session;
        if (!activeSession) {
          const { data: refreshData, error: refreshError } =
            await supabase.auth.refreshSession();
          if (refreshError) {
            console.warn("Unable to refresh session:", refreshError.message);
          }
          activeSession = refreshData?.session ?? null;
        }

        await applySession(activeSession, isMounted);
      } catch (err) {
        console.error("Error initializing auth session:", err);
        if (isMounted()) {
          setUser(null);
          setRole(null);
        }
      } finally {
        if (isMounted()) {
          setLoading(false);
        }
      }
    };

    void initialize();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!isMounted()) return;
      setLoading(true);
      try {
        await applySession(session, isMounted);
      } catch (err) {
        console.error("Error handling auth state change:", err);
        if (isMounted()) {
          setUser(null);
          setRole(null);
        }
      } finally {
        if (isMounted()) {
          setLoading(false);
        }
      }
    });

    // Handle page visibility changes to refresh session when tab becomes visible
    // This performs a silent refresh (no global loading indicator and no toast)
    const handleVisibilityChange = async () => {
      if (!isMounted()) return;

      if (!document.hidden) {
        try {
          // Silent refresh: do not toggle the global loading state or show toast
          await refreshSessionInternal({ notify: false, setLoading: false });
        } catch (err) {
          console.error("Error handling visibility change:", err);
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      mounted = false;
      subscription.unsubscribe();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [applySession]);

  const { toast } = useToast();

  // Internal refresh implementation with options to suppress loading/toast
  const refreshSessionInternal = useCallback(
    async (options: { notify?: boolean; setLoading?: boolean } = {}) => {
      const { notify = true, setLoading: withLoading = true } = options;
      if (withLoading) setLoading(true);
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (session) {
          await applySession(session, () => true);
          if (notify) {
            toast({
              title: "Refreshed",
              description: "Session refreshed",
              duration: 2000,
            });
          }
          return;
        }
        const { data: refreshData } = await supabase.auth.refreshSession();
        await applySession(refreshData?.session ?? null, () => true);
        if (notify) {
          toast({
            title: "Refreshed",
            description: "Session refreshed",
            duration: 2000,
          });
        }
      } catch (err) {
        console.error("Error refreshing session:", err);
      } finally {
        if (withLoading) setLoading(false);
      }
    },
    [applySession, toast]
  );

  const refreshSession = useCallback(async () => {
    await refreshSessionInternal({ notify: true, setLoading: true });
  }, [refreshSessionInternal]);

  const signOut = useCallback(async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error("Error signing out:", error.message);
      } else {
        setUser(null);
        setRole(null);
        setIsGoogleUser(false);
        router.push("/");
      }
    } finally {
      setLoading(false);
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
