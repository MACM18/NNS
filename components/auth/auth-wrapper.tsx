"use client"

import type React from "react"

import { Card } from "@/components/ui/card"
import { useAuth } from "@/contexts/auth-context"
import { Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { useEffect } from "react"

interface AuthWrapperProps {
  children: React.ReactNode
}

export function AuthWrapper({ children }: AuthWrapperProps) {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && user) {
      router.push("/dashboard")
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100 dark:bg-gray-950">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 dark:bg-gray-950 p-4">
      <Card className="w-full max-w-md p-6 shadow-lg">{children}</Card>
    </div>
  )
}
