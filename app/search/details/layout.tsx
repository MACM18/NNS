"use client"

import type React from "react"

import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/layout/app-sidebar"
import { Header } from "@/components/layout/header"
import { useAuth } from "@/contexts/auth-context"
import { AuthWrapper } from "@/components/auth/auth-wrapper"

export default function SearchDetailsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, loading } = useAuth()

  if (!user) {
    return <AuthWrapper />
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <Header />
        {children}
      </SidebarInset>
    </SidebarProvider>
  )
}
