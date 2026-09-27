"use client";

import type { ReactNode } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { Header } from "@/components/layout/header";
import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav";
import { PWAInitializer } from "@/components/pwa/pwa-initializer";

export default function DashboardSegmentLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <div className='flex min-w-0 flex-1 flex-col min-h-screen'>
        <Header />
        <main className='dashboard-viewport min-w-0 flex-1 w-full overflow-x-hidden p-4 pb-20 sm:p-6 lg:p-5 xl:p-6 2xl:p-8 lg:pb-6'>
          <div className='mx-auto w-full min-w-0 max-w-7xl'>{children}</div>
        </main>
      </div>
      <MobileBottomNav />
      <PWAInitializer />
    </SidebarProvider>
  );
}
