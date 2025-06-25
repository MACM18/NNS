"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState } from "react"
import type { User } from "@supabase/supabase-js"
import { getSupabaseClient } from "@/lib/supabase"

interface AuthContextType {
  user: User | null
  profile: any | null
  loading: boolean
  signOut: () => Promise<void>
  role: string | null
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)
  const [role, setRole] = useState<string | null>(null)
  const supabase = getSupabaseClient()

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchProfile(session.user.id)
      }
      setLoading(false)
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchProfile(session.user.id)
      } else {
        setProfile(null)
        setRole(null)
      }
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const fetchProfile = async (userId: string) => {
    try {
      // First, try to get existing profile
      const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).limit(1)

      if (error) {
        console.error("Error querying profile:", error)
        return
      }

      if (data && data.length > 0) {
        // Profile exists, use the first one
        setProfile(data[0])
        setRole(typeof data[0].role === "string" ? data[0].role : null)
      } else {
        // No profile exists, create one
        console.log("No profile found, creating new profile for user:", userId)
        await createProfile(userId)
      }
    } catch (error) {
      console.error("Error fetching profile:", error)
    }
  }

  const createProfile = async (userId: string) => {
    try {
      const { data: userData } = await supabase.auth.getUser()
      const user = userData.user

      const newProfile = {
        id: userId,
        email: user?.email || "",
        full_name: user?.user_metadata?.full_name || user?.email?.split("@")[0] || "User",
        role: "user",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      const { data, error } = await supabase.from("profiles").insert([newProfile]).select().limit(1)

      if (error) {
        console.error("Error creating profile:", error)
        return
      }

      if (data && data.length > 0) {
        setProfile(data[0])
        setRole(typeof data[0].role === "string" ? data[0].role : null)
        console.log("Profile created successfully")
      }
    } catch (error) {
      console.error("Error creating profile:", error)
    }
  }

  const signOut = async () => {
    try {
      await supabase.auth.signOut()
      setUser(null)
      setProfile(null)
      setRole(null)
    } catch (error) {
      console.error("Error signing out:", error)
    }
  }

  return <AuthContext.Provider value={{ user, profile, loading, signOut, role }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
