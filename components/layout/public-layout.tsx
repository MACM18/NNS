"use client";

import type React from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { ArrowRight, Building2, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent } from "@/components/ui/sheet";

export function PublicLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleAuthAction = () => {
    if (user) {
      router.push("/dashboard");
    } else {
      router.push("/login");
    }
  };

  const headerNavigation = [
    { name: "Services", href: "/welcome/services" },
    { name: "Why Us", href: "/welcome/why-us" },
    { name: "About Us", href: "/welcome/about" },
    { name: "Careers", href: "/welcome/job-listings" },
    { name: "Articles", href: "/welcome/articles" },
    { name: "Contact", href: "/welcome/contact" },
  ];

  const footerCompanyLinks = [
    { name: "About Us", href: "/welcome/about" },
    { name: "Careers", href: "/welcome/job-listings" },
    { name: "Contact", href: "/welcome/contact" },
  ];

  const footerResourcesLinks = [
    { name: "Articles", href: "/welcome/articles" },
    { name: "Services", href: "/welcome/services" },
  ];

  const footerSupportLinks = [
    { name: "FAQs", href: "#" }, // Placeholder for FAQs
  ];

  const footerLegalLinks = [
    { name: "Privacy Policy", href: "/welcome/privacy" },
    { name: "Terms of Service", href: "/welcome/terms" },
  ];

  return (
    <div className='flex flex-col min-h-screen bg-background text-foreground'>
      {/* Header */}
      <header className='sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60'>
        <nav
          className='mx-auto flex max-w-7xl items-center justify-between p-6 lg:px-8'
          aria-label='Global'
        >
          <div className='flex lg:flex-1'>
            <Link href='/' className='-m-1.5 p-1.5 flex items-center space-x-2'>
              <Building2 className='h-8 w-8 text-primary' />
              <span className='text-xl font-bold text-foreground'>
                NNS Enterprise
              </span>
            </Link>
          </div>
          <div className='flex lg:hidden'>
            <Button
              variant='ghost'
              className='-m-2.5 inline-flex items-center justify-center rounded-md p-2.5 text-foreground'
              onClick={() => setMobileMenuOpen(true)}
            >
              <span className='sr-only'>Open main menu</span>
              <Menu className='h-6 w-6' aria-hidden='true' />
            </Button>
          </div>
          <div className='hidden lg:flex lg:gap-x-8'>
            {headerNavigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className='text-sm font-semibold leading-6 text-foreground hover:text-primary transition-colors'
              >
                {item.name}
              </Link>
            ))}
          </div>
          <div className='hidden lg:flex lg:flex-1 lg:justify-end'>
            <Button onClick={handleAuthAction} disabled={loading}>
              {loading ? (
                "Loading..."
              ) : user ? (
                <>
                  Go to Dashboard
                  <ArrowRight className='ml-2 h-4 w-4' />
                </>
              ) : (
                "Sign In"
              )}
            </Button>
          </div>
        </nav>

        {/* Mobile menu */}
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetContent side='right' className='lg:hidden'>
            <div className='flex flex-col gap-4 py-6'>
              {headerNavigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "-mx-3 block rounded-lg px-3 py-2 text-base font-semibold leading-7 transition-colors hover:bg-muted"
                  )}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {item.name}
                </Link>
              ))}
              <div className='py-6'>
                <Button
                  onClick={handleAuthAction}
                  disabled={loading}
                  className='w-full'
                >
                  {loading ? (
                    "Loading..."
                  ) : user ? (
                    <>
                      Go to Dashboard
                      <ArrowRight className='ml-2 h-4 w-4' />
                    </>
                  ) : (
                    "Sign In"
                  )}
                </Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </header>

      <main className='flex-1'>{children}</main>

      {/* Footer */}
      <footer className='bg-muted py-12'>
        <div className='mx-auto max-w-7xl px-6 lg:px-8'>
          <div className='grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4'>
            <div>
              <div className='flex items-center space-x-2'>
                <Building2 className='h-6 w-6 text-primary' />
                <span className='text-lg font-bold'>NNS Enterprise</span>
              </div>
              <p className='mt-4 text-sm text-muted-foreground'>
                Specialized in FTTH establishment and expanding into
                comprehensive telecom services.
              </p>
            </div>
            <div>
              <h3 className='text-sm font-semibold'>Company</h3>
              <ul className='mt-4 space-y-2'>
                {footerCompanyLinks.map((item) => (
                  <li key={item.name}>
                    <Link
                      href={item.href}
                      className='text-sm text-muted-foreground hover:text-foreground'
                    >
                      {item.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className='text-sm font-semibold'>Resources</h3>
              <ul className='mt-4 space-y-2'>
                {footerResourcesLinks.map((item) => (
                  <li key={item.name}>
                    <Link
                      href={item.href}
                      className='text-sm text-muted-foreground hover:text-foreground'
                    >
                      {item.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className='text-sm font-semibold'>Support</h3>
              <ul className='mt-4 space-y-2'>
                {footerSupportLinks.map((item) => (
                  <li key={item.name}>
                    <Link
                      href={item.href}
                      className='text-sm text-muted-foreground hover:text-foreground'
                    >
                      {item.name}
                    </Link>
                  </li>
                ))}
              </ul>
              <h3 className='text-sm font-semibold mt-6'>Legal</h3>
              <ul className='mt-4 space-y-2'>
                {footerLegalLinks.map((item) => (
                  <li key={item.name}>
                    <Link
                      href={item.href}
                      className='text-sm text-muted-foreground hover:text-foreground'
                    >
                      {item.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className='mt-8 border-t pt-8 text-center'>
            <p className='text-sm text-muted-foreground'>
              © 2024 NNS Enterprise. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
