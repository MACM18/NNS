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

        // If profile already loaded for this user, keep current state (avoid network hits)
        if (profile?.id === session.user.id && role) {
          return; // keep existing role/profile; session user updated already
        }

        // Otherwise, fetch/create profile once
        try {
          const roleValue = await getOrCreateProfile(
            session.user.id,
            session.user.email || "",
            userName
          );
          if (!isMounted()) return;
          setRole(roleValue.role?.toLowerCase?.() || "user");
          setProfile(roleValue.profile as Profile | null);
        } catch (e) {
          // Keep previous role/profile on error to avoid UX downgrades
          console.warn(
            "applySession: profile fetch/create skipped due to error",
            e
          );
        }
      } else {
        setUser(null);
        setRole(null);
        setIsGoogleUser(false);
        setProfile(null);
      }
    },
    [getOrCreateProfile, profile, role]
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
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted()) return;
      // Only block UI for explicit sign-in/out transitions
      const blockUI = event === "SIGNED_IN" || event === "SIGNED_OUT";
      if (blockUI) setLoading(true);
      try {
        await applySession(session, isMounted);
      } catch (err) {
        console.error("Error handling auth state change:", err);
        if (isMounted() && blockUI) {
          setUser(null);
          setRole(null);
        }
      } finally {
        if (isMounted() && blockUI) {
          setLoading(false);
        }
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
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

  // Idle-staleness hint: after a long inactivity, show a subtle hint and revalidate in background
  const [lastActive, setLastActive] = useState<number>(() => Date.now());
  const [staleLocked, setStaleLocked] = useState<boolean>(false);

  useEffect(() => {
    // Update lastActive on basic user interactions
    const markActive = () => {
      setLastActive(Date.now());
      setStaleLocked(false);
    };
    const events: Array<keyof DocumentEventMap> = [
      "mousemove",
      "keydown",
      "click",
      "touchstart",
    ];
    events.forEach((ev) => document.addEventListener(ev, markActive));

    const STALE_MS = 15 * 60 * 1000; // 15 minutes
    const interval = window.setInterval(() => {
      const now = Date.now();
      if (now - lastActive >= STALE_MS && !staleLocked) {
        // Show a small hint and kick off a silent refresh
        toast({
          title: "Session might be stale",
          description: "Revalidating in background…",
          duration: 2000,
        });
        setStaleLocked(true);
        void refreshSessionInternal({ notify: false, setLoading: false });
      }
    }, 60 * 1000); // check every minute

    return () => {
      events.forEach((ev) => document.removeEventListener(ev, markActive));
      window.clearInterval(interval);
    };
  }, [lastActive, staleLocked, refreshSessionInternal, toast]);

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
