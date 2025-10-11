"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { useAuth } from "@/contexts/auth-context";
import { cn } from "@/lib/utils";

const tabs = [
  { label: "Calendar", href: "/work-tracking" },
  { label: "Summary", href: "/work-tracking/summary" },
  { label: "Analytics", href: "/work-tracking/analytics" },
];

type WorkTrackingLayoutProps = {
  children: ReactNode;
};

export default function WorkTrackingLayout({
  children,
}: WorkTrackingLayoutProps) {
  const { role, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading) {
      const normalizedRole = (role || "").toLowerCase();
      if (!normalizedRole || !["admin", "moderator"].includes(normalizedRole)) {
        router.replace("/");
      }
    }
  }, [role, loading, router]);

  if (loading) {
    return null;
  }

  const normalizedRole = (role || "").toLowerCase();
  if (!normalizedRole || !["admin", "moderator"].includes(normalizedRole)) {
    return null;
  }

  return (
    <DashboardLayout>
      <div className='p-6 space-y-6'>
        <div>
          <h1 className='text-3xl font-bold'>Work Tracking</h1>
          <p className='text-muted-foreground'>
            Monitor which technicians worked on each line and keep historical
            records for payroll.
          </p>
        </div>
        <div className='flex gap-4 border-b border-border'>
          {tabs.map((tab) => {
            const isActive = pathname === tab.href;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={cn(
                  "py-2 px-1 text-sm font-medium border-b-2",
                  isActive
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                {tab.label}
              </Link>
            );
          })}
        </div>
        <div>{children}</div>
      </div>
    </DashboardLayout>
  );
}
