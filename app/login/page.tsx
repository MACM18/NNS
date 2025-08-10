"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { LoginForm } from "@/components/auth/login-form"
import { AuthWrapper } from "@/components/auth/auth-wrapper"

export default function LoginPage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && user) {
      router.push("/dashboard") // Redirect to dashboard if already logged in
    }
  }, [user, loading, router])

  if (loading || user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  return (
    <AuthWrapper
      title="Welcome Back"
      description="Sign in to your account to continue"
      footerText="Don't have an account?"
      footerLinkHref="/register"
      footerLinkText="Sign Up"
    >
      <LoginForm />
    </AuthWrapper>
  )
}
