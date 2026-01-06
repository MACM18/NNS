"use client";

import type * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Cable,
  FileText,
  Users,
  Settings,
  Briefcase,
  BookOpen,
  Package,
  ClipboardList,
  Search,
  LogOut,
  Building2,
  CalendarDays,
  Zap,
  Calculator,
  Wallet,
  BookOpenCheck,
  CreditCard,
  BarChart3,
  Cog,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { useAuth } from "@/contexts/auth-context";

// Menu items.
const navItems = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: Home,
  },
  {
    title: "Lines",
    url: "/dashboard/lines",
    icon: Cable,
  },
  {
    title: "Invoices",
    url: "/dashboard/invoices",
    icon: FileText,
  },
  {
    title: "Tasks",
    url: "/dashboard/tasks",
    icon: ClipboardList,
  },
  {
    title: "Work Tracking",
    url: "/dashboard/work-tracking",
    icon: CalendarDays,
    roles: ["admin", "moderator"],
  },
  {
    title: "Inventory",
    url: "/dashboard/inventory",
    icon: Package,
  },
  {
    title: "Users",
    url: "/dashboard/users",
    icon: Users,
    // admin only
    roles: ["admin"],
  },
  {
    title: "Content",
    url: "/dashboard/content",
    icon: BookOpen,
    // admin and moderator
    roles: ["admin", "moderator"],
  },
  {
    title: "Integrations",
    url: "/dashboard/integrations",
    icon: Zap,
    // admin and moderator
    roles: ["admin", "moderator"],
  },
  {
    title: "Careers",
    url: "/dashboard/careers",
    icon: Briefcase,
    // admin and moderator
    roles: ["admin", "moderator"],
  },
  {
    title: "Search",
    url: "/dashboard/search",
    icon: Search,
  },
];

// Accounting menu items - moderator and admin only
const accountingItems = [
  {
    title: "Overview",
    url: "/dashboard/accounting",
    icon: Calculator,
  },
  {
    title: "Chart of Accounts",
    url: "/dashboard/accounting/accounts",
    icon: Wallet,
  },
  {
    title: "Journal Entries",
    url: "/dashboard/accounting/journal",
    icon: BookOpenCheck,
  },
  {
    title: "Payments",
    url: "/dashboard/accounting/payments",
    icon: CreditCard,
  },
  {
    title: "Reports",
    url: "/dashboard/accounting/reports",
    icon: BarChart3,
  },
  {
    title: "Settings",
    url: "/dashboard/accounting/settings",
    icon: Cog,
  },
];

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname();
  const { signOut, role, loading } = useAuth();

  // Check if user has accounting access (moderator, admin)
  const hasAccountingAccess = !loading && role && ["admin", "moderator"].includes(role);

  return (
    <Sidebar {...props}>
      <SidebarHeader>
        <Link href='/' className='flex items-center space-x-2 p-2'>
          <Building2 className='h-6 w-6 text-primary' />
          <span className='text-lg font-bold text-foreground'>
            NNS Enterprise
          </span>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Main Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems
                .filter((item) => {
                  // if item has no roles specified, it's visible to all authenticated users
                  if (!item.roles || item.roles.length === 0) return true;
                  // if still loading, hide role-restricted items until we know the role
                  if (loading) return false;
                  const r = (role || "").toLowerCase();
                  return item.roles.map((x) => x.toLowerCase()).includes(r);
                })
                .map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={pathname === item.url}>
                      <Link href={item.url}>
                        <item.icon />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        
        {/* Accounting Section - Only visible to moderators and admins */}
        {hasAccountingAccess && (
          <>
            <SidebarSeparator />
            <SidebarGroup>
              <SidebarGroupLabel>Accounting</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {accountingItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton 
                        asChild 
                        isActive={pathname === item.url || (item.url !== "/dashboard/accounting" && pathname.startsWith(item.url))}
                      >
                        <Link href={item.url}>
                          <item.icon />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </>
        )}
        
        <SidebarSeparator />
        <SidebarGroup>
          <SidebarGroupLabel>Settings</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={pathname === "/dashboard/profile"}
                >
                  <Link href='/dashboard/profile'>
                    <Users />
                    <span>Profile</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={pathname === "/dashboard/settings"}
                >
                  <Link href='/dashboard/settings'>
                    <Settings />
                    <span>Settings</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={signOut}>
              <LogOut />
              <span>Sign Out</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
