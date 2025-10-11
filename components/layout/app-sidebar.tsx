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
    url: "/lines",
    icon: Cable,
  },
  {
    title: "Invoices",
    url: "/invoices",
    icon: FileText,
  },
  {
    title: "Tasks",
    url: "/tasks",
    icon: ClipboardList,
  },
  {
    title: "Work Tracking",
    url: "/work-tracking",
    icon: CalendarDays,
    roles: ["admin", "moderator"],
  },
  {
    title: "Inventory",
    url: "/inventory",
    icon: Package,
  },
  {
    title: "Users",
    url: "/users",
    icon: Users,
    // admin only
    roles: ["admin"],
  },
  {
    title: "Content",
    url: "/content",
    icon: BookOpen,
    // admin and moderator
    roles: ["admin", "moderator"],
  },
  {
    title: "Careers",
    url: "/careers",
    icon: Briefcase,
    // admin and moderator
    roles: ["admin", "moderator"],
  },
  {
    title: "Search",
    url: "/search",
    icon: Search,
  },
];

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname();
  const { signOut, role, loading } = useAuth();

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
        <SidebarSeparator />
        <SidebarGroup>
          <SidebarGroupLabel>Settings</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === "/profile"}>
                  <Link href='/profile'>
                    <Users />
                    <span>Profile</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === "/settings"}>
                  <Link href='/settings'>
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
