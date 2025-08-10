"use client"

import { AuthWrapper } from "@/components/auth/auth-wrapper"
import { LoginForm } from "@/components/auth/login-form"

export default function AuthPage() {
  return (
    <AuthWrapper>
      <LoginForm />
    </AuthWrapper>
  )
}
