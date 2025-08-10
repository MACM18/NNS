"use client"

import type React from "react"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { ArrowRight, Building2, Menu, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useState } from "react"
import { cn } from "@/lib/utils"

export function PublicLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const handleAuthAction = () => {
    if (user) {
      router.push("/dashboard")
    } else {
      router.push("/login")
    }
  }

  const headerNavigation = [
    { name: "Services", href: "/#services" },
    { name: "Why Us", href: "/#why-partner" },
    { name: "Careers", href: "/job-listings" },
    { name: "Contact", href: "/welcome/contact" },
  ]

  const footerCompanyLinks = [
    { name: "Our Services", href: "/#services" },
    { name: "Why Partner", href: "/#why-partner" },
    { name: "Future Vision", href: "/#future-vision" },
    { name: "About Us", href: "/welcome/about" },
  ]

  const footerResourcesLinks = [
    { name: "Job Listings", href: "/job-listings" },
    { name: "Articles", href: "/articles" },
    { name: "Insights", href: "/insights" },
  ]

  const footerSupportLinks = [
    { name: "Contact Us", href: "/welcome/contact" },
    { name: "FAQs", href: "#" }, // Placeholder for FAQs
  ]

  const footerLegalLinks = [
    { name: "Privacy Policy", href: "#" }, // Placeholder for Privacy Policy
    { name: "Terms of Service", href: "#" }, // Placeholder for Terms of Service
  ]

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950 text-gray-900 dark:text-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <nav className="mx-auto flex max-w-7xl items-center justify-between p-6 lg:px-8" aria-label="Global">
          <div className="flex lg:flex-1">
            <Link href="/" className="-m-1.5 p-1.5 flex items-center space-x-2">
              <Building2 className="h-8 w-8 text-primary" />
              <span className="text-xl font-bold text-foreground">NNS Enterprise</span>
            </Link>
          </div>
          <div className="flex lg:hidden">
            <Button
              variant="ghost"
              className="-m-2.5 inline-flex items-center justify-center rounded-md p-2.5 text-foreground"
              onClick={() => setMobileMenuOpen(true)}
            >
              <span className="sr-only">Open main menu</span>
              <Menu className="h-6 w-6" aria-hidden="true" />
            </Button>
          </div>
          <div className="hidden lg:flex lg:gap-x-8">
            {headerNavigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className="text-sm font-semibold leading-6 text-foreground hover:text-primary transition-colors"
              >
                {item.name}
              </Link>
            ))}
          </div>
          <div className="hidden lg:flex lg:flex-1 lg:justify-end">
            <Button onClick={handleAuthAction} disabled={loading}>
              {loading ? (
                "Loading..."
              ) : user ? (
                <>
                  Go to Dashboard
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              ) : (
                "Sign In"
              )}
            </Button>
          </div>
        </nav>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden" role="dialog" aria-modal="true">
            <div className="fixed inset-0 z-50"></div>
            <div className="fixed inset-y-0 right-0 z-50 w-full overflow-y-auto bg-background px-6 py-6 sm:max-w-sm sm:ring-1 sm:ring-border">
              <div className="flex items-center justify-between">
                <Link href="/" className="-m-1.5 p-1.5 flex items-center space-x-2">
                  <Building2 className="h-8 w-8 text-primary" />
                  <span className="text-xl font-bold text-foreground">NNS Enterprise</span>
                </Link>
                <Button
                  variant="ghost"
                  className="-m-2.5 rounded-md p-2.5 text-foreground"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <span className="sr-only">Close menu</span>
                  <X className="h-6 w-6" aria-hidden="true" />
                </Button>
              </div>
              <div className="mt-6 flow-root">
                <div className="-my-6 divide-y divide-border">
                  <div className="space-y-2 py-6">
                    {headerNavigation.map((item) => (
                      <Link
                        key={item.name}
                        href={item.href}
                        className={cn(
                          "-mx-3 block rounded-lg px-3 py-2 text-base font-semibold leading-7 transition-colors hover:bg-muted",
                        )}
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        {item.name}
                      </Link>
                    ))}
                    <div className="py-6">
                      <Button onClick={handleAuthAction} disabled={loading} className="w-full">
                        {loading ? (
                          "Loading..."
                        ) : user ? (
                          <>
                            Go to Dashboard
                            <ArrowRight className="ml-2 h-4 w-4" />
                          </>
                        ) : (
                          "Sign In"
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </header>

      <main className="flex-1 pt-16">{children}</main>

      {/* Footer */}
      <footer className="bg-muted py-12">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <div className="flex items-center space-x-2">
                <Building2 className="h-6 w-6 text-primary" />
                <span className="text-lg font-bold">NNS Enterprise</span>
              </div>
              <p className="mt-4 text-sm text-muted-foreground">
                Specialized in FTTH establishment and expanding into comprehensive telecom services.
              </p>
            </div>
            <div>
              <h3 className="text-sm font-semibold">Company</h3>
              <ul className="mt-4 space-y-2">
                {footerCompanyLinks.map((item) => (
                  <li key={item.name}>
                    <Link href={item.href} className="text-sm text-muted-foreground hover:text-foreground">
                      {item.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold">Resources</h3>
              <ul className="mt-4 space-y-2">
                {footerResourcesLinks.map((item) => (
                  <li key={item.name}>
                    <Link href={item.href} className="text-sm text-muted-foreground hover:text-foreground">
                      {item.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold">Support</h3>
              <ul className="mt-4 space-y-2">
                {footerSupportLinks.map((item) => (
                  <li key={item.name}>
                    <Link href={item.href} className="text-sm text-muted-foreground hover:text-foreground">
                      {item.name}
                    </Link>
                  </li>
                ))}
              </ul>
              <h3 className="text-sm font-semibold mt-6">Legal</h3>
              <ul className="mt-4 space-y-2">
                {footerLegalLinks.map((item) => (
                  <li key={item.name}>
                    <Link href={item.href} className="text-sm text-muted-foreground hover:text-foreground">
                      {item.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="mt-8 border-t pt-8 text-center">
            <p className="text-sm text-muted-foreground">© 2024 NNS Enterprise. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
