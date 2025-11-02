"use client"

import type React from "react"

import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/layout/app-sidebar"
import { Header } from "@/components/layout/header"
import { useAuth } from "@/contexts/auth-context"
import { AuthWrapper } from "@/components/auth/auth-wrapper"
import { PageSkeleton } from "@/components/skeletons/page-skeleton"

export default function SearchDetailsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, loading } = useAuth()

  if (!user && !loading) {
    return <AuthWrapper />
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <Header />
        {loading ? (
          <div className="p-4 md:p-6 lg:p-8">
            <PageSkeleton />
          </div>
        ) : (
          children
        )}
      </SidebarInset>
    </SidebarProvider>
  )
}
