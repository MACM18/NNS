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
  const [isGoogleUser, setIsGoogleUser] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const fetchUserProfile = useCallback(
    async (userId: string, userEmail: string, userName: string | null) => {
      try {
        const { data: profile, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", userId)
          .single();

        if (error) {
          // If profile doesn't exist, create it
          if (error.code === "PGRST116") {
            console.log(
              "Profile not found, creating new profile for user:",
              userId
            );
            const { data: newProfile, error: insertError } = await supabase
              .from("profiles")
              .insert({
                id: userId,
                email: userEmail,
                full_name: userName || userEmail,
                role: "user",
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              })
              .select("*")
              .single();

            if (insertError) {
              console.error("Error creating user profile:", insertError);
              return { role: "user", profile: null };
            }

            return {
              role: (newProfile?.role as string) || "user",
              profile: newProfile,
            };
          }
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
    },
    []
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

        const roleValue = await fetchUserProfile(
          session.user.id,
          session.user.email || "",
          userName
        );
        if (!isMounted()) return;
        setRole(roleValue.role?.toLowerCase?.() || "user");
        setProfile(roleValue.profile);
      } else {
        setUser(null);
        setRole(null);
        setIsGoogleUser(false);
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
        setLoading(true);
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
        } finally {
          if (isMounted()) setLoading(false);
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
        setIsGoogleUser(false);
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
