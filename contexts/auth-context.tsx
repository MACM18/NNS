"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import { getSupabaseClient } from "@/lib/supabase"
import type { User } from "@supabase/supabase-js"

interface AuthContextType {
  user: User | null
  loading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = getSupabaseClient()

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user || null)
      setLoading(false)
      if (event === "SIGNED_IN" && session?.user) {
        router.push("/dashboard") // Redirect to dashboard on sign in
      } else if (event === "SIGNED_OUT") {
        router.push("/login") // Redirect to login on sign out
      }
    })

    // Initial check
    supabase.auth.getUser().then(({ data: { user: initialUser } }) => {
      setUser(initialUser)
      setLoading(false)
    })

    return () => {
      if (subscription) {
        subscription.unsubscribe() // Corrected: calling unsubscribe on the 'subscription' object
      }
    }
  }, [router, supabase])

  const signOut = async () => {
    setLoading(true)
    const { error } = await supabase.auth.signOut()
    if (error) {
      console.error("Error signing out:", error.message)
    } else {
      setUser(null)
      router.push("/login") // Ensure redirect after successful sign out
    }
    setLoading(false)
  }

  return <AuthContext.Provider value={{ user, loading, signOut }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
