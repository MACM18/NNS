"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Users,
  Phone,
  FileText,
  Package,
  ClipboardList,
  Briefcase,
  Newspaper,
  Settings,
  BarChart2,
  Search,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { ScrollArea } from "@/components/ui/scroll-area"

export function Navigation() {
  const pathname = usePathname()

  const navItems = [
    {
      title: "Dashboard",
      href: "/",
      icon: LayoutDashboard,
    },
    {
      title: "Users",
      href: "/users",
      icon: Users,
    },
    {
      title: "Lines",
      href: "/lines",
      icon: Phone,
    },
    {
      title: "Invoices",
      href: "/invoices",
      icon: FileText,
    },
    {
      title: "Inventory",
      href: "/inventory",
      icon: Package,
    },
    {
      title: "Tasks",
      href: "/tasks",
      icon: ClipboardList,
    },
    {
      title: "Careers",
      href: "/careers",
      icon: Briefcase,
    },
    {
      title: "Content",
      href: "/content",
      icon: Newspaper,
    },
    {
      title: "Reports",
      href: "/reports",
      icon: BarChart2,
    },
    {
      title: "Settings",
      href: "/settings",
      icon: Settings,
    },
    {
      title: "Search", // Added Search item
      href: "/search",
      icon: Search,
    },
  ]

  return (
    <ScrollArea className="h-full py-6">
      <nav className="grid items-start px-4 text-sm font-medium">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary",
              pathname === item.href && "bg-muted text-primary",
            )}
          >
            <item.icon className="h-4 w-4" />
            {item.title}
          </Link>
        ))}
      </nav>
    </ScrollArea>
  )
}

export function AppSidebar() {
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r bg-background p-4 lg:flex">
      <div className="flex h-16 items-center px-4">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <img src="/placeholder-logo.svg" alt="NNS Logo" className="h-6 w-6" />
          <span className="text-lg">NNS Enterprise</span>
        </Link>
      </div>
      <div className="flex-1">
        <Navigation />
      </div>
    </aside>
  )
}
