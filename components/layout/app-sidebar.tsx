"use client"

import { LayoutDashboard, Settings, Users, Bell } from "lucide-react"
import { usePathname } from "next/navigation"

import type { MainNavItem, SidebarNavItem } from "@/types"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { ThemeToggle } from "@/components/theme-toggle"

interface DashboardSidebarProps {
  isSuperAdmin?: boolean
  mainNav?: MainNavItem[]
  sidebarNav?: SidebarNavItem[]
}

export function DashboardSidebar({ isSuperAdmin, mainNav, sidebarNav }: DashboardSidebarProps) {
  const pathname = usePathname()

  const navMain: MainNavItem[] = [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: LayoutDashboard,
      isActive: pathname === "/dashboard",
    },
    {
      title: "Users",
      url: "/users",
      icon: Users,
      isActive: pathname === "/users",
    },
    {
      title: "Notifications",
      url: "/notifications",
      icon: Bell,
      isActive: pathname === "/notifications",
    },
  ]

  const navSettings: MainNavItem[] = [
    {
      title: "Settings",
      url: "/settings",
      icon: Settings,
      isActive: pathname === "/settings",
    },
  ]

  return (
    <div className="flex flex-col space-y-4 py-4">
      <div className="px-3 py-2">
        <div className="mb-2 flex items-center justify-between rounded-md px-2">
          <h2 className="font-semibold tracking-tight">{isSuperAdmin ? "Admin" : "User"} Dashboard</h2>
          <ThemeToggle />
        </div>
        <Separator className="my-2" />
        <div className="space-y-1">
          {navMain.map((item) => (
            <Button
              key={item.title}
              variant="ghost"
              className="w-full justify-start"
              active={item.isActive}
              onClick={() => {
                window.location.href = item.url || "#"
              }}
            >
              <item.icon className="mr-2 h-4 w-4" />
              <span>{item.title}</span>
            </Button>
          ))}
        </div>
      </div>
      <Separator />
      <div className="px-3 py-2">
        <h2 className="mb-2 px-4 text-lg font-semibold tracking-tight">Settings</h2>
        <div className="space-y-1">
          {navSettings.map((item) => (
            <Button
              key={item.title}
              variant="ghost"
              className="w-full justify-start"
              active={item.isActive}
              onClick={() => {
                window.location.href = item.url || "#"
              }}
            >
              <item.icon className="mr-2 h-4 w-4" />
              <span>{item.title}</span>
            </Button>
          ))}
        </div>
      </div>
    </div>
  )
}
