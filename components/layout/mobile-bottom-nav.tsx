"use client";

import { Home, FileText, ClipboardList, User, Calculator } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/auth-context";

const baseNavItems = [
  {
    href: "/dashboard",
    label: "Home",
    icon: Home,
  },
  {
    href: "/dashboard/invoices",
    label: "Invoices",
    icon: FileText,
  },
  {
    href: "/dashboard/lines",
    label: "Lines",
    icon: FileText,
  },
  {
    href: "/dashboard/tasks",
    label: "Tasks",
    icon: ClipboardList,
  },
  {
    href: "/dashboard/profile",
    label: "Profile",
    icon: User,
  },
];

const accountingNavItem = {
  href: "/dashboard/accounting",
  label: "Accounting",
  icon: Calculator,
};

export function MobileBottomNav() {
  const pathname = usePathname();
  const { role, loading } = useAuth();
  const hasAccountingAccess = !loading && ["admin", "moderator", "superadmin"].includes((role || "").toLowerCase());
  const navItems = hasAccountingAccess
    ? [baseNavItems[0], baseNavItems[1], accountingNavItem, baseNavItems[3], baseNavItems[4]]
    : baseNavItems;

  return (
    <nav className='fixed bottom-0 left-0 right-0 z-40 border-t bg-background/95 backdrop-blur safe-area-inset-bottom lg:hidden'>
      <div className='grid h-16 grid-cols-5 items-center px-1'>
        {navItems.map((item) => {
          // normalize paths by removing trailing slash (but keep root "/")
          const normalize = (p?: string) => {
            if (!p) return p;
            return p === "/" ? "/" : p.replace(/\/+$/, "");
          };

          const isActive = normalize(pathname) === normalize(item.href) ||
            (item.href !== "/dashboard" && pathname.startsWith(`${item.href}/`));
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 rounded-lg px-1 py-2 text-[11px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                isActive
                  ? "text-primary font-medium"
                  : "text-muted-foreground hover:text-foreground"
              )}
              aria-label={item.label}
              aria-current={isActive ? "page" : undefined}
            >
              <Icon className={cn("h-5 w-5", isActive && "fill-current")} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
