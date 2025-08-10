"use client"

import type React from "react"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import {
  Briefcase,
  FileText,
  LayoutDashboard,
  Menu,
  Newspaper,
  Package,
  Phone,
  PieChart,
  Settings,
  Tag,
  Users,
} from "lucide-react"
import Image from "next/image"

interface NavLinkProps {
  href: string
  icon: React.ElementType
  label: string
  isCollapsed: boolean
  pathname: string
}

const NavLink: React.FC<NavLinkProps> = ({ href, icon: Icon, label, isCollapsed, pathname }) => {
  const isActive = pathname === href || (href !== "/dashboard" && pathname.startsWith(href))
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2 text-gray-900 transition-all hover:bg-gray-100 dark:text-gray-50 dark:hover:bg-gray-800",
        isActive && "bg-gray-100 dark:bg-gray-800",
      )}
    >
      <Icon className="h-5 w-5" />
      {!isCollapsed && label}
    </Link>
  )
}

export function AppSidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const pathname = usePathname()

  const navItems = [
    { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { href: "/users", icon: Users, label: "User Management" },
    { href: "/lines", icon: Phone, label: "Telephone Lines" },
    { href: "/inventory", icon: Package, label: "Inventory" },
    { href: "/invoices", icon: FileText, label: "Invoices" },
    { href: "/tasks", icon: Briefcase, label: "Task Management" },
    { href: "/reports", icon: PieChart, label: "Reports" },
    { href: "/content", icon: Newspaper, label: "Content Management" },
    { href: "/careers", icon: Tag, label: "Career Management" },
    { href: "/settings", icon: Settings, label: "Settings" },
  ]

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={cn(
          "hidden md:flex flex-col border-r bg-white dark:bg-gray-950 transition-all duration-300",
          isCollapsed ? "w-16" : "w-64",
        )}
      >
        <div className="flex h-16 items-center border-b px-4 shrink-0">
          <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
            <Image src="/placeholder-logo.svg" alt="NNS Enterprise Logo" width={32} height={32} />
            {!isCollapsed && <span className="text-lg">NNS Dashboard</span>}
          </Link>
          <Button variant="ghost" size="icon" className="ml-auto h-8 w-8" onClick={() => setIsCollapsed(!isCollapsed)}>
            <Menu className="h-4 w-4" />
            <span className="sr-only">Toggle sidebar</span>
          </Button>
        </div>
        <ScrollArea className="flex-1 py-4">
          <nav className="grid items-start px-2 text-sm font-medium lg:px-4">
            {navItems.map((item) => (
              <NavLink
                key={item.href}
                href={item.href}
                icon={item.icon}
                label={item.label}
                isCollapsed={isCollapsed}
                pathname={pathname}
              />
            ))}
          </nav>
        </ScrollArea>
      </aside>

      {/* Mobile Sidebar */}
      <Sheet>
        <SheetTrigger asChild>
          <Button size="icon" variant="outline" className="md:hidden fixed top-4 left-4 z-50 bg-transparent">
            <Menu className="h-5 w-5" />
            <span className="sr-only">Toggle Menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="flex flex-col bg-white dark:bg-gray-950 w-64">
          <div className="flex h-16 items-center border-b px-4 shrink-0">
            <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
              <Image src="/placeholder-logo.svg" alt="NNS Enterprise Logo" width={32} height={32} />
              <span className="text-lg">NNS Dashboard</span>
            </Link>
          </div>
          <ScrollArea className="flex-1 py-4">
            <nav className="grid items-start px-2 text-sm font-medium">
              {navItems.map((item) => (
                <NavLink
                  key={item.href}
                  href={item.href}
                  icon={item.icon}
                  label={item.label}
                  isCollapsed={false} // Mobile sidebar is never collapsed
                  pathname={pathname}
                />
              ))}
            </nav>
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </>
  )
}
