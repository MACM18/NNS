"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  Home,
  Users,
  Phone,
  Package,
  FileText,
  Briefcase,
  BookOpen,
  Settings,
  ClipboardList,
  BarChart2,
  Menu,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"

export default function AppSidebar() {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)

  const navItems = [
    { href: "/dashboard", icon: Home, label: "Dashboard" },
    { href: "/users", icon: Users, label: "Users" },
    { href: "/lines", icon: Phone, label: "Telephone Lines" },
    { href: "/inventory", icon: Package, label: "Inventory" },
    { href: "/invoices", icon: FileText, label: "Invoices" },
    { href: "/careers", icon: Briefcase, label: "Career Management" }, // This is the dashboard management page
    { href: "/content", icon: BookOpen, label: "Content Management" }, // This is the dashboard management page
    { href: "/tasks", icon: ClipboardList, label: "Tasks" },
    { href: "/reports", icon: BarChart2, label: "Reports" },
    { href: "/settings", icon: Settings, label: "Settings" },
  ]

  const NavLinks = () => (
    <nav className="grid items-start gap-2 px-4 text-sm font-medium">
      {navItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2 text-gray-500 transition-all hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-50",
            {
              "bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-50": pathname === item.href,
            },
          )}
          onClick={() => setIsOpen(false)} // Close sidebar on link click
        >
          <item.icon className="h-4 w-4" />
          {item.label}
        </Link>
      ))}
    </nav>
  )

  return (
    <>
      {/* Mobile Sidebar */}
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild className="lg:hidden fixed top-4 left-4 z-[999]">
          <Button variant="outline" size="icon">
            <Menu className="h-6 w-6" />
            <span className="sr-only">Toggle navigation menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="flex flex-col bg-white dark:bg-gray-950">
          <div className="flex h-16 items-center border-b px-4">
            <Link href="/dashboard" className="flex items-center gap-2 font-semibold" onClick={() => setIsOpen(false)}>
              <span className="text-lg font-bold text-blue-600 dark:text-blue-400">NNS Dashboard</span>
            </Link>
          </div>
          <div className="flex-1 overflow-auto py-4">
            <NavLinks />
          </div>
        </SheetContent>
      </Sheet>

      {/* Desktop Sidebar */}
      <div className="hidden lg:flex flex-col h-full max-h-screen border-r bg-gray-100/40 dark:bg-gray-800/40">
        <div className="flex h-16 items-center border-b px-6">
          <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
            <span className="text-lg font-bold text-blue-600 dark:text-blue-400">NNS Dashboard</span>
          </Link>
        </div>
        <div className="flex-1 overflow-auto py-4">
          <NavLinks />
        </div>
      </div>
    </>
  )
}
