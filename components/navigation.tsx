"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, Building2 } from "lucide-react";
import { useState } from "react";
import { Button } from "./ui/button";
import { cn } from "@/lib/utils";

const navigation = [
  { name: "Home", href: "/welcome" },
  { name: "About", href: "/welcome/about" },
  { name: "Blog", href: "/welcome/blog" },
  { name: "Careers", href: "/welcome/careers" },
  { name: "Contact", href: "/welcome/contact" },
];

export function Navigation() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  return (
    <header className='sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60'>
      <nav
        className='mx-auto flex max-w-7xl items-center justify-between p-6 lg:px-8'
        aria-label='Global'
      >
        <div className='flex lg:flex-1'>
          <Link
            href='/welcome'
            className='-m-1.5 p-1.5 flex items-center space-x-2'
          >
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
        <div className='hidden lg:flex lg:gap-x-12'>
          {navigation.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "text-sm font-semibold leading-6 transition-colors hover:text-primary",
                pathname === item.href ? "text-primary" : "text-foreground"
              )}
            >
              {item.name}
            </Link>
          ))}
        </div>
        <div className='hidden lg:flex lg:flex-1 lg:justify-end'></div>
      </nav>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className='lg:hidden' role='dialog' aria-modal='true'>
          <div className='fixed inset-0 z-50'></div>
          <div className='fixed inset-y-0 right-0 z-50 w-full overflow-y-auto bg-background px-6 py-6 sm:max-w-sm sm:ring-1 sm:ring-border'>
            <div className='flex items-center justify-between'>
              <Link
                href='/welcome'
                className='-m-1.5 p-1.5 flex items-center space-x-2'
              >
                <Building2 className='h-8 w-8 text-primary' />
                <span className='text-xl font-bold text-foreground'>
                  NNS Enterprise
                </span>
              </Link>
              <Button
                variant='ghost'
                className='-m-2.5 rounded-md p-2.5 text-foreground'
                onClick={() => setMobileMenuOpen(false)}
              >
                <span className='sr-only'>Close menu</span>
                <X className='h-6 w-6' aria-hidden='true' />
              </Button>
            </div>
            <div className='mt-6 flow-root'>
              <div className='-my-6 divide-y divide-border'>
                <div className='space-y-2 py-6'>
                  {navigation.map((item) => (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={cn(
                        "-mx-3 block rounded-lg px-3 py-2 text-base font-semibold leading-7 transition-colors hover:bg-muted",
                        pathname === item.href
                          ? "text-primary"
                          : "text-foreground"
                      )}
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      {item.name}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
