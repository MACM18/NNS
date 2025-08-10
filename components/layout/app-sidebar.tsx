"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  Home,
  Users,
  Settings,
  Briefcase,
  FileText,
  Package,
  Phone,
  BarChart2,
  Menu,
  X,
  LogOut,
  Search,
  Newspaper,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { useAuth } from "@/contexts/auth-context"
import { toast } from "@/hooks/use-toast"

const navItems = [
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: Home,
    description: "Overview of system metrics",
  },
  {
    name: "Users",
    href: "/users",
    icon: Users,
    description: "Manage user accounts and roles",
  },
  {
    name: "Lines",
    href: "/lines",
    icon: Phone,
    description: "Manage telephone lines and services",
  },
  {
    name: "Inventory",
    href: "/inventory",
    icon: Package,
    description: "Track and manage equipment inventory",
  },
  {
    name: "Invoices",
    href: "/invoices",
    icon: FileText,
    description: "Handle billing and invoice generation",
  },
  {
    name: "Tasks",
    href: "/tasks",
    icon: Briefcase,
    description: "Assign and track operational tasks",
  },
  {
    name: "Reports",
    href: "/reports",
    icon: BarChart2,
    description: "Generate and view system reports",
  },
  {
    name: "Careers",
    href: "/careers",
    icon: Briefcase,
    description: "Manage job vacancies",
  },
  {
    name: "Content",
    href: "/content",
    icon: Newspaper,
    description: "Manage posts and blogs",
  },
  {
    name: "Search",
    href: "/search",
    icon: Search,
    description: "Advanced search functionality",
  },
  {
    name: "Settings",
    href: "/settings",
    icon: Settings,
    description: "Configure system settings",
  },
]

export function AppSidebar() {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)
  const { signOut } = useAuth()

  const handleSignOut = async () => {
    try {
      await signOut()
      toast({
        title: "Logged out",
        description: "You have been successfully logged out.",
      })
    } catch (error) {
      console.error("Error signing out:", error)
      toast({
        title: "Error",
        description: "Failed to log out. Please try again.",
        variant: "destructive",
      })
    }
  }

  return (
    <>
      {/* Mobile Sidebar */}
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild className="lg:hidden fixed top-4 left-4 z-[100]">
          <Button variant="outline" size="icon">
            <Menu className="h-6 w-6" />
            <span className="sr-only">Toggle sidebar</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64 p-0 bg-sidebar-background text-sidebar-foreground flex flex-col">
          <div className="flex items-center justify-between h-16 px-4 border-b border-sidebar-border">
            <Link className="flex items-center gap-2 font-semibold text-sidebar-primary-foreground" href="/dashboard">
              <img src="/placeholder-logo.svg" alt="NNS Enterprise Logo" className="h-6 w-auto" />
              NNS Dashboard
            </Link>
            <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)}>
              <X className="h-6 w-6" />
              <span className="sr-only">Close sidebar</span>
            </Button>
          </div>
          <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href))
              return (
                <Link
                  key={item.name}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sidebar-foreground transition-all hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                    isActive && "bg-sidebar-primary text-sidebar-primary-foreground",
                  )}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                >
                  <item.icon className="h-5 w-5" />
                  {item.name}
                </Link>
              )
            })}
          </nav>
          <div className="mt-auto p-4 border-t border-sidebar-border">
            <Button
              variant="ghost"
              className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              onClick={handleSignOut}
            >
              <LogOut className="mr-3 h-5 w-5" />
              Sign Out
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 h-screen border-r border-sidebar-border bg-sidebar-background text-sidebar-foreground fixed top-0 left-0 z-40">
        <div className="flex items-center h-16 px-4 border-b border-sidebar-border">
          <Link className="flex items-center gap-2 font-semibold text-sidebar-primary-foreground" href="/dashboard">
            <img src="/placeholder-logo.svg" alt="NNS Enterprise Logo" className="h-7 w-auto" />
            NNS Dashboard
          </Link>
        </div>
        <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href))
            return (
              <Link
                key={item.name}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sidebar-foreground transition-all hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                  isActive && "bg-sidebar-primary text-sidebar-primary-foreground",
                )}
                href={item.href}
              >
                <item.icon className="h-5 w-5" />
                {item.name}
              </Link>
            )
          })}
        </nav>
        <div className="mt-auto p-4 border-t border-sidebar-border">
          <Button
            variant="ghost"
            className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            onClick={handleSignOut}
          >
            <LogOut className="mr-3 h-5 w-5" />
            Sign Out
          </Button>
        </div>
      </aside>
    </>
  )
}
