"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { RegisterForm } from "@/components/auth/register-form"
import { useAuth } from "@/contexts/auth-context"

export default function RegisterPage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (user && !loading) {
      router.push("/")
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (user) {
    return null // Will redirect
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <RegisterForm onSwitchToLogin={() => router.push("/login")} />
    </div>
  )
}
