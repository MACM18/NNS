"use client"

import type React from "react"

import { createContext, useContext, useEffect, useState, useCallback } from "react"
import { createClientComponentClient, type User } from "@supabase/auth-helpers-nextjs"
import { useRouter } from "next/navigation"
import { toast } from "@/hooks/use-toast"

interface AuthContextType {
  user: User | null
  profile: any | null // You might want to define a more specific type for profile
  loading: boolean
  role: string | null
  signIn: (email: string, password: string) => Promise<{ error: any | null }>
  signInWithGoogle: () => Promise<{ error: any | null }>
  signUp: (email: string, password: string) => Promise<{ error: any | null }>
  signOut: () => Promise<{ error: any | null }>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)
  const [role, setRole] = useState<string | null>(null)
  const supabase = createClientComponentClient()
  const router = useRouter()

  const fetchUserAndProfile = useCallback(async () => {
    setLoading(true)
    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser()
    setUser(currentUser)

    if (currentUser) {
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", currentUser.id)
        .single()

      if (profileError) {
        console.error("Error fetching profile:", profileError)
        setProfile(null)
        setRole(null)
      } else {
        setProfile(profileData)
        setRole(profileData?.role || null)
      }
    } else {
      setProfile(null)
      setRole(null)
    }
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    fetchUserAndProfile()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("Auth state changed:", event, session)
      if (event === "SIGNED_IN") {
        setUser(session?.user || null)
        fetchUserAndProfile()
        router.push("/dashboard") // Redirect to dashboard on sign in
      } else if (event === "SIGNED_OUT") {
        setUser(null)
        setProfile(null)
        setRole(null)
        router.push("/") // Redirect to landing page on sign out
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [supabase, fetchUserAndProfile, router])

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error }
  }

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${location.origin}/auth/callback`,
      },
    })
    return { error }
  }

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${location.origin}/auth/callback`,
      },
    })
    return { error }
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (!error) {
      toast({
        title: "Logged out",
        description: "You have been successfully logged out.",
      })
    }
    return { error }
  }

  const value = {
    user,
    profile,
    loading,
    role,
    signIn,
    signInWithGoogle,
    signUp,
    signOut,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
