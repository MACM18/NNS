"use client";

import type { ReactNode } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { Header } from "@/components/layout/header";
import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav";

export default function DashboardSegmentLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <div className='flex-1 flex flex-col min-h-screen w-full'>
        <Header />
        <main className='flex-1 w-full p-4 sm:p-6 lg:p-8 pb-20 lg:pb-8 overflow-x-hidden'>
          <div className='w-full max-w-7xl mx-auto'>{children}</div>
        </main>
      </div>
      <MobileBottomNav />
    </SidebarProvider>
  );
}
