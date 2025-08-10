"use client"

import type React from "react"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { SheetTrigger, SheetContent, Sheet } from "@/components/ui/sheet"
import { MenuIcon, PhoneIcon, MailIcon, MapPinIcon } from "lucide-react"
import Image from "next/image"

export function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen">
      <header className="px-4 lg:px-6 h-14 flex items-center justify-between bg-background border-b">
        <Link className="flex items-center justify-center" href="/">
          <Image src="/placeholder-logo.svg" alt="Company Logo" width={32} height={32} className="h-8 w-8" />
          <span className="sr-only">Company Name</span>
        </Link>
        <nav className="hidden lg:flex gap-4 sm:gap-6">
          <Link className="text-sm font-medium hover:underline underline-offset-4" href="/services">
            Services
          </Link>
          <Link className="text-sm font-medium hover:underline underline-offset-4" href="/why-us">
            Why Us
          </Link>
          <Link className="text-sm font-medium hover:underline underline-offset-4" href="/job-listings">
            Careers
          </Link>
          <Link className="text-sm font-medium hover:underline underline-offset-4" href="/contact">
            Contact
          </Link>
        </nav>
        <Sheet>
          <SheetTrigger asChild>
            <Button className="lg:hidden bg-transparent" size="icon" variant="outline">
              <MenuIcon className="h-6 w-6" />
              <span className="sr-only">Toggle navigation menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="right">
            <div className="flex flex-col gap-4 py-6">
              <Link className="text-lg font-medium" href="/services">
                Services
              </Link>
              <Link className="text-lg font-medium" href="/why-us">
                Why Us
              </Link>
              <Link className="text-lg font-medium" href="/job-listings">
                Careers
              </Link>
              <Link className="text-lg font-medium" href="/contact">
                Contact
              </Link>
              <Link className="text-lg font-medium" href="/about-us">
                About Us
              </Link>
              <Link className="text-lg font-medium" href="/articles">
                Articles
              </Link>
              <Link className="text-lg font-medium" href="/insights">
                Insights
              </Link>
            </div>
          </SheetContent>
        </Sheet>
      </header>
      {children}
      <footer className="flex flex-col gap-4 sm:flex-row py-6 w-full shrink-0 items-center px-4 md:px-6 border-t bg-muted/40 text-muted-foreground">
        <p className="text-xs">&copy; 2024 Your Company. All rights reserved.</p>
        <nav className="sm:ml-auto flex gap-4 sm:gap-6 text-sm">
          <div className="flex flex-col gap-2">
            <h3 className="font-semibold text-foreground">Company</h3>
            <Link className="hover:underline underline-offset-4" href="/about-us">
              About Us
            </Link>
            <Link className="hover:underline underline-offset-4" href="/job-listings">
              Careers
            </Link>
            <Link className="hover:underline underline-offset-4" href="/contact">
              Contact
            </Link>
          </div>
          <div className="flex flex-col gap-2">
            <h3 className="font-semibold text-foreground">Resources</h3>
            <Link className="hover:underline underline-offset-4" href="/articles">
              Articles
            </Link>
            <Link className="hover:underline underline-offset-4" href="/insights">
              Insights
            </Link>
          </div>
          <div className="flex flex-col gap-2">
            <h3 className="font-semibold text-foreground">Connect</h3>
            <div className="flex items-center gap-2">
              <PhoneIcon className="h-4 w-4" />
              <span>+1 (123) 456-7890</span>
            </div>
            <div className="flex items-center gap-2">
              <MailIcon className="h-4 w-4" />
              <span>info@example.com</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPinIcon className="h-4 w-4" />
              <span>123 Main St, Anytown USA</span>
            </div>
          </div>
        </nav>
      </footer>
    </div>
  )
}
