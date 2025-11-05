"use client";
import { useAuth } from "@/contexts/auth-context";
import { UserManagementTabs } from "@/components/users/user-management-tabs";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

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
    <div className='space-y-6'>
      <h1 className='text-2xl sm:text-3xl font-bold'>Users Management</h1>
      <UserManagementTabs />
    </div>
  );
}
