"use client"

import type React from "react"

import Link from "next/link"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { MenuIcon } from "lucide-react"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

export function PublicLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  const navLinks = [
    { href: "/services", label: "Services" },
    { href: "/why-us", label: "Why Us" },
    { href: "/job-listings", label: "Careers" },
    { href: "/welcome/contact", label: "Contact" },
  ]

  const footerLinks = {
    company: [
      { href: "/welcome/about", label: "About Us" },
      { href: "/job-listings", label: "Careers" },
      { href: "/welcome/contact", label: "Contact" },
    ],
    resources: [
      { href: "/articles", label: "Articles" },
      { href: "/insights", label: "Insights" },
      { href: "#", label: "Support" }, // Placeholder
    ],
    legal: [
      { href: "#", label: "Privacy Policy" }, // Placeholder
      { href: "#", label: "Terms of Service" }, // Placeholder
    ],
  }

  return (
    <div className="flex flex-col min-h-screen">
      <header className="sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur-lg">
        <div className="container flex h-16 items-center justify-between px-4 md:px-6">
          <Link href="/" className="flex items-center gap-2 font-semibold" prefetch={false}>
            <span className="sr-only">NNS Enterprise</span>
            <img src="/placeholder-logo.svg" alt="NNS Enterprise Logo" className="h-8 w-auto" />
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "transition-colors hover:text-foreground/80",
                  pathname === link.href ? "text-foreground" : "text-foreground/60",
                )}
                prefetch={false}
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="md:hidden bg-transparent">
                <MenuIcon className="h-6 w-6" />
                <span className="sr-only">Toggle navigation menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right">
              <Link href="/" className="flex items-center gap-2 font-semibold py-4" prefetch={false}>
                <img src="/placeholder-logo.svg" alt="NNS Enterprise Logo" className="h-8 w-auto" />
                <span className="sr-only">NNS Enterprise</span>
              </Link>
              <div className="grid gap-2 py-6">
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={cn(
                      "flex w-full items-center py-2 text-lg font-semibold",
                      pathname === link.href ? "text-foreground" : "text-foreground/60",
                    )}
                    prefetch={false}
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </header>
      <div className="flex-1">{children}</div>
      <footer className="bg-muted py-12 md:py-16">
        <div className="container grid grid-cols-1 gap-8 px-4 md:grid-cols-4 md:px-6">
          <div className="space-y-4">
            <Link href="/" className="flex items-center gap-2 font-semibold" prefetch={false}>
              <img src="/placeholder-logo.svg" alt="NNS Enterprise Logo" className="h-8 w-auto" />
              <span className="sr-only">NNS Enterprise</span>
            </Link>
            <p className="text-sm text-muted-foreground">
              &copy; {new Date().getFullYear()} NNS Enterprise. All rights reserved.
            </p>
          </div>
          <div className="grid gap-2">
            <h3 className="font-semibold text-foreground">Company</h3>
            <nav className="grid gap-1 text-sm">
              {footerLinks.company.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-muted-foreground hover:text-foreground"
                  prefetch={false}
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="grid gap-2">
            <h3 className="font-semibold text-foreground">Resources</h3>
            <nav className="grid gap-1 text-sm">
              {footerLinks.resources.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-muted-foreground hover:text-foreground"
                  prefetch={false}
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="grid gap-2">
            <h3 className="font-semibold text-foreground">Legal</h3>
            <nav className="grid gap-1 text-sm">
              {footerLinks.legal.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-muted-foreground hover:text-foreground"
                  prefetch={false}
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      </footer>
    </div>
  )
}
