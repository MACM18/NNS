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

interface AuthContextType {
  user: User | null;
  profile: any | null;
  loading: boolean;
  role: string | null;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const fetchUserProfile = useCallback(async (userId: string) => {
    try {
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (error) {
        console.error("Error fetching user profile:", error);
        return { role: "user", profile: null };
      }

      return {
        role: (profile?.role as string) || "user",
        profile: profile,
      };
    } catch (error) {
      console.error("Error fetching user profile:", error);
      return { role: "user", profile: null };
    }
  }, []);

  const applySession = useCallback(
    async (session: Session | null, isMounted: () => boolean) => {
      if (!isMounted()) return;

      if (session?.user) {
        setUser(session.user);
        const { role: roleValue, profile: profileData } =
          await fetchUserProfile(session.user.id);
        if (!isMounted()) return;
        setRole(roleValue?.toLowerCase?.() || "user");
        setProfile(profileData);
      } else {
        setUser(null);
        setRole(null);
        setProfile(null);
      }
    },
    [fetchUserProfile]
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

        if (error) {
          console.error("Error retrieving session:", error);
        }

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
    const handleVisibilityChange = async () => {
      if (!isMounted()) return;

      if (!document.hidden) {
        // Page became visible, refresh the session
        try {
          const {
            data: { session },
            error,
          } = await supabase.auth.getSession();

          if (error) {
            console.error(
              "Error refreshing session on visibility change:",
              error
            );
            return;
          }

          // If no session, try to refresh
          if (!session) {
            const { data: refreshData, error: refreshError } =
              await supabase.auth.refreshSession();
            if (refreshError) {
              console.warn(
                "Unable to refresh session on visibility change:",
                refreshError.message
              );
            }
            await applySession(refreshData?.session ?? null, isMounted);
          } else {
            await applySession(session, isMounted);
          }
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

  const signOut = useCallback(async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error("Error signing out:", error.message);
      } else {
        setUser(null);
        setRole(null);
        setProfile(null);
        router.push("/");
      }
    } finally {
      setLoading(false);
    }
  }, [router]);

  return (
    <AuthContext.Provider value={{ user, profile, loading, role, signOut }}>
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
