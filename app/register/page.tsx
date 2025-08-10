"use client"

import { AuthWrapper } from "@/components/auth/auth-wrapper"
import { RegisterForm } from "@/components/auth/register-form"

export default function RegisterPage() {
  return (
    <AuthWrapper>
      <RegisterForm />
    </AuthWrapper>
  )
}
