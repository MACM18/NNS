"use client";
import { useAuth } from "@/contexts/auth-context";
import { UserManagementTabs } from "@/components/users/user-management-tabs";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";

export default function UsersPage() {
  const { user, role, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && role !== "admin") {
      router.replace("/");
    }
  }, [role, loading, router]);

  if (loading || role !== "admin") {
    return null;
  }

  return (
    <DashboardLayout>
      <div className='w-full max-w-6xl mx-auto py-6 sm:py-12 px-4 sm:px-6'>
        <h1 className='text-2xl sm:text-3xl font-bold mb-4 sm:mb-6'>Users Management</h1>
        <UserManagementTabs />
      </div>
    </DashboardLayout>
  );
}
