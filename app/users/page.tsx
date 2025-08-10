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
      <div className='max-w-3xl mx-auto py-12'>
        <h1 className='text-3xl font-bold mb-6'>Users Management</h1>
        <UserManagementTabs />
      </div>
    </DashboardLayout>
  );
}
