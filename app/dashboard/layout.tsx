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
        <main className='flex-1 w-full max-w-full p-4 md:p-6 lg:p-8 pb-20 lg:pb-6 space-y-6 overflow-x-hidden'>
          <div className='w-full max-w-7xl mx-auto space-y-6'>{children}</div>
        </main>
      </div>
      <MobileBottomNav />
    </SidebarProvider>
  );
}
