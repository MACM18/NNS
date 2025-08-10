import type React from "react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { Home, Users, Settings, Briefcase, FileText, Package, Phone, BarChart2, Newspaper, Search } from "lucide-react"

export function MainNav({ className, ...props }: React.HTMLAttributes<HTMLElement>) {
  const navItems = [
    {
      name: "Home",
      href: "/",
    },
    {
      name: "Careers",
      href: "/job-listings",
    },
    {
      name: "Articles",
      href: "/articles",
    },
    {
      name: "Insights",
      href: "/insights",
    },
  ]

  return (
    <nav className={cn("flex items-center space-x-4 lg:space-x-6", className)} {...props}>
      {navItems.map((item) => (
        <Link key={item.name} href={item.href} className="text-sm font-medium transition-colors hover:text-primary">
          {item.name}
        </Link>
      ))}
    </nav>
  )
}

export function DashboardNav({ className, ...props }: React.HTMLAttributes<HTMLElement>) {
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

  return (
    <nav className={cn("grid items-start gap-2 text-sm font-medium", className)} {...props}>
      {navItems.map((item) => (
        <Link
          key={item.name}
          href={item.href}
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-gray-500 transition-all hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-50"
        >
          <item.icon className="h-4 w-4" />
          {item.name}
        </Link>
      ))}
    </nav>
  )
}
