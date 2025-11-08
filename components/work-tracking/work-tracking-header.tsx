"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const tabs = [
  { label: "Calendar", href: "/dashboard/work-tracking" },
  { label: "Summary", href: "/dashboard/work-tracking/summary" },
  { label: "Analytics", href: "/dashboard/work-tracking/analytics" },
];

export function WorkTrackingHeader() {
  const pathname = usePathname();

  return (
    <div className='space-y-6'>
      {/* Page Header */}
      <div>
        <h1 className='text-3xl font-bold'>Work Tracking</h1>
        <p className='text-muted-foreground'>
          Monitor which technicians worked on each line and keep historical
          records for payroll.
        </p>
      </div>

      {/* Tabs Navigation */}
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
    </div>
  );
}
