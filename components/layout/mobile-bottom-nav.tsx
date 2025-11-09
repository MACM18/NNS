"use client";

import { Home, Package, FileText, ClipboardList, User } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const navItems = [
  {
    href: "/dashboard",
    label: "Home",
    icon: Home,
  },
  {
    href: "/dashboard/inventory",
    label: "Inventory",
    icon: Package,
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

export function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav className='fixed bottom-0 left-0 right-0 z-50 border-t bg-background lg:hidden'>
      <div className='flex h-16 items-center justify-around px-2 safe-area-inset-bottom'>
        {navItems.map((item) => {
          // normalize paths by removing trailing slash (but keep root "/")
          const normalize = (p?: string) => {
            if (!p) return p;
            return p === "/" ? "/" : p.replace(/\/+$/, "");
          };

          const isActive = normalize(pathname) === normalize(item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-1 px-3 py-2 text-xs transition-colors",
                isActive
                  ? "text-primary font-medium"
                  : "text-muted-foreground hover:text-foreground"
              )}
              aria-label={item.label}
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
