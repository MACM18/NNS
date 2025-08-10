"use client"

import { AuthWrapper } from "@/components/auth/auth-wrapper"
import { LoginForm } from "@/components/auth/login-form"
import { useAuth } from "@/contexts/auth-context"
import { useRouter } from "next/navigation"
import { useEffect } from "react"

export default function LoginPage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (user && !loading) {
      router.push("/dashboard") // Redirect to dashboard after successful login
    }
  }, [user, loading, router])

  if (loading || user) {
    return <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">Loading...</div>
  }

  return (
    <AuthWrapper
      title="Welcome Back"
      description="Sign in to your account to manage your telecom operations."
      footerText="Don't have an account?"
      footerLinkHref="/register"
      footerLinkText="Sign Up"
    >
      <LoginForm />
    </AuthWrapper>
  )
}
