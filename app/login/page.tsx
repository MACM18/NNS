"use client"
import LoginForm from "@/components/auth/login-form"
import { getSupabaseClient } from "@/lib/supabase"
import { redirect } from "next/navigation"

export default async function LoginPage() {
  const supabase = getSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    redirect("/dashboard") // Redirect to /dashboard if already logged in
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 dark:bg-gray-950">
      <LoginForm />
    </div>
  )
}
