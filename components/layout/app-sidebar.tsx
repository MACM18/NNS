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
  Banknote,
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

type NavItem = {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: string[];
};

const MANAGEMENT_ROLES = ["admin", "moderator", "superadmin"];
const ADMINISTRATION_ROLES = ["admin", "superadmin"];

const operationsItems: NavItem[] = [
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
    roles: MANAGEMENT_ROLES,
  },
  {
    title: "Inventory",
    url: "/dashboard/inventory",
    icon: Package,
  },
  {
    title: "Search",
    url: "/dashboard/search",
    icon: Search,
  },
];

const accountingItems: NavItem[] = [
  {
    title: "Overview",
    url: "/dashboard/accounting",
    icon: Calculator,
  },
  {
    title: "Financial Years",
    url: "/dashboard/accounting/financial-years",
    icon: CalendarDays,
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
    title: "Transactions",
    url: "/dashboard/accounting/transactions",
    icon: ClipboardList,
  },
  {
    title: "Partners",
    url: "/dashboard/accounting/partners",
    icon: Users,
  },
  {
    title: "Receivables",
    url: "/dashboard/accounting/receivables",
    icon: BarChart3,
  },
  {
    title: "Reports",
    url: "/dashboard/accounting/reports",
    icon: BarChart3,
  },
  {
    title: "Payroll",
    url: "/dashboard/payroll",
    icon: Banknote,
  },
  {
    title: "Settings",
    url: "/dashboard/accounting/settings",
    icon: Cog,
  },
];

const administrationItems: NavItem[] = [
  { title: "Users", url: "/dashboard/users", icon: Users, roles: ADMINISTRATION_ROLES },
  { title: "Content", url: "/dashboard/content", icon: BookOpen, roles: MANAGEMENT_ROLES },
  { title: "Integrations", url: "/dashboard/integrations", icon: Zap, roles: MANAGEMENT_ROLES },
  { title: "Careers", url: "/dashboard/careers", icon: Briefcase, roles: MANAGEMENT_ROLES },
];

function SidebarNavGroup({
  title,
  items,
  pathname,
  role,
  loading,
}: {
  title: string;
  items: NavItem[];
  pathname: string;
  role: string | null;
  loading: boolean;
}) {
  const visibleItems = items.filter((item) => {
    if (!item.roles?.length) return true;
    if (loading) return false;
    return item.roles.includes((role || "").toLowerCase());
  });

  if (visibleItems.length === 0) return null;

  return (
    <SidebarGroup>
      <SidebarGroupLabel>{title}</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {visibleItems.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton
                asChild
                isActive={
                  pathname === item.url ||
                  (item.url !== "/dashboard" && pathname.startsWith(item.url))
                }
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
  );
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname();
  const { signOut, role, loading } = useAuth();
  const normalizedRole = (role || "").toLowerCase();

  const hasAccountingAccess = !loading && MANAGEMENT_ROLES.includes(normalizedRole);
  const hasAdministrationAccess = !loading && administrationItems.some((item) => item.roles?.includes(normalizedRole));

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
        <SidebarNavGroup title='Operations' items={operationsItems} pathname={pathname} role={role} loading={loading} />

        {hasAccountingAccess && (
          <>
            <SidebarSeparator />
            <SidebarNavGroup title='Accounting' items={accountingItems} pathname={pathname} role={role} loading={loading} />
          </>
        )}

        {hasAdministrationAccess && (
          <>
            <SidebarSeparator />
            <SidebarNavGroup title='Administration' items={administrationItems} pathname={pathname} role={role} loading={loading} />
          </>
        )}

        <SidebarSeparator />
        <SidebarGroup>
          <SidebarGroupLabel>Account</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === "/dashboard/profile"}>
                  <Link href='/dashboard/profile'><Users /><span>Profile</span></Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === "/dashboard/settings"}>
                  <Link href='/dashboard/settings'><Settings /><span>Settings</span></Link>
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
