"use client"

import type React from "react"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { ArrowRight, Building2 } from "lucide-react"
import { Button } from "@/components/ui/button"

export function PublicLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const router = useRouter()

  const handleAuthAction = () => {
    if (user) {
      router.push("/dashboard")
    } else {
      router.push("/login")
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950 text-gray-900 dark:text-gray-50">
      {/* Navigation */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <nav className="mx-auto flex max-w-7xl items-center justify-between p-6 lg:px-8">
          <div className="flex lg:flex-1">
            <Link href="/" className="-m-1.5 p-1.5 flex items-center space-x-2">
              <Building2 className="h-8 w-8 text-primary" />
              <span className="text-xl font-bold text-foreground">NNS Enterprise</span>
            </Link>
          </div>
          <div className="hidden lg:flex lg:gap-x-8">
            <Link
              href="/#services"
              className="text-sm font-semibold leading-6 text-foreground hover:text-primary transition-colors"
            >
              Our Services
            </Link>
            <Link
              href="/#why-partner"
              className="text-sm font-semibold leading-6 text-foreground hover:text-primary transition-colors"
            >
              Why Partner
            </Link>
            <Link
              href="/#future-vision"
              className="text-sm font-semibold leading-6 text-foreground hover:text-primary transition-colors"
            >
              Future Vision
            </Link>
            <Link
              href="/welcome/about"
              className="text-sm font-semibold leading-6 text-foreground hover:text-primary transition-colors"
            >
              About Us
            </Link>
            <Link
              href="/welcome/contact"
              className="text-sm font-semibold leading-6 text-foreground hover:text-primary transition-colors"
            >
              Contact
            </Link>
          </div>
          <div className="flex lg:flex-1 lg:justify-end">
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
                <li>
                  <Link href="/#services" className="text-sm text-muted-foreground hover:text-foreground">
                    Our Services
                  </Link>
                </li>
                <li>
                  <Link href="/#why-partner" className="text-sm text-muted-foreground hover:text-foreground">
                    Why Partner
                  </Link>
                </li>
                <li>
                  <Link href="/#future-vision" className="text-sm text-muted-foreground hover:text-foreground">
                    Future Vision
                  </Link>
                </li>
                <li>
                  <Link href="/welcome/about" className="text-sm text-muted-foreground hover:text-foreground">
                    About Us
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold">Support</h3>
              <ul className="mt-4 space-y-2">
                <li>
                  <Link href="/welcome/contact" className="text-sm text-muted-foreground hover:text-foreground">
                    Contact Us
                  </Link>
                </li>
                <li>
                  <Link href="#" className="text-sm text-muted-foreground hover:text-foreground">
                    FAQs
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold">Legal</h3>
              <ul className="mt-4 space-y-2">
                <li>
                  <Link href="#" className="text-sm text-muted-foreground hover:text-foreground">
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link href="#" className="text-sm text-muted-foreground hover:text-foreground">
                    Terms of Service
                  </Link>
                </li>
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
