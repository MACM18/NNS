"use client";

import type { ReactNode } from "react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { useAuth } from "@/contexts/auth-context";

type IntegrationsLayoutProps = {
  children: ReactNode;
};

export default function IntegrationsLayout({
  children,
}: IntegrationsLayoutProps) {
  const { role, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      const normalized = (role || "").toLowerCase();
      if (!normalized || !["admin", "moderator"].includes(normalized)) {
        router.replace("/");
      }
    }
  }, [role, loading, router]);

  if (loading) return null;

  const normalized = (role || "").toLowerCase();
  if (!normalized || !["admin", "moderator"].includes(normalized)) return null;

  return (
    <DashboardLayout>
      <div className='p-6'>{children}</div>
    </DashboardLayout>
  );
}
