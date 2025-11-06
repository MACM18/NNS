"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileSpreadsheet, Plus } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/contexts/auth-context";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function IntegrationsPage() {
  const { role, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Only admin and moderator can access integrations
    if (
      !loading &&
      role &&
      !["admin", "moderator"].includes(role.toLowerCase())
    ) {
      router.push("/dashboard");
    }
  }, [role, loading, router]);

  if (loading) {
    return (
      <div className='container mx-auto p-4 md:p-6'>
        <div className='animate-pulse'>
          <div className='h-8 bg-gray-200 rounded w-3/4 sm:w-1/4 mb-4'></div>
          <div className='h-4 bg-gray-200 rounded w-full sm:w-1/2 mb-8'></div>
          <div className='grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3'>
            <div className='h-48 bg-gray-200 rounded'></div>
          </div>
        </div>
      </div>
    );
  }

  if (!role || !["admin", "moderator"].includes(role.toLowerCase())) {
    return null;
  }

  return (
    <div className='space-y-6'>
      <div>
        <h1 className='text-2xl sm:text-3xl font-bold tracking-tight'>
          Integrations
        </h1>
        <p className='text-muted-foreground mt-2'>
          Connect and manage external services to sync data with your NNS system
        </p>
      </div>

      <div className='grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3'>
        {/* Google Sheets Integration Card */}
        <Card className='hover:shadow-lg transition-shadow cursor-pointer group'>
          <CardHeader>
            <div className='flex items-center justify-between gap-2'>
              <div className='p-2 bg-green-100 dark:bg-green-900 rounded-lg w-fit flex-shrink-0'>
                <FileSpreadsheet className='h-6 w-6 md:h-8 md:w-8 text-green-600 dark:text-green-400' />
              </div>
              <Link href='/dashboard/integrations/google-sheets'>
                <Button variant='outline' size='sm' className='gap-2'>
                  <Plus className='h-4 w-4' />
                  <span className='hidden sm:inline'>Configure</span>
                </Button>
              </Link>
            </div>
            <CardTitle className='mt-4 text-lg md:text-xl'>
              Google Sheets
            </CardTitle>
            <CardDescription className='text-sm'>
              Sync line installation data with Google Sheets for month-by-month
              tracking and two-way reference
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href='/dashboard/integrations/google-sheets'>
              <Button variant='ghost' className='w-full group-hover:bg-accent'>
                Manage Connections →
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Placeholder for future integrations */}
        <Card className='border-dashed opacity-60'>
          <CardHeader>
            <div className='flex items-center justify-center h-full min-h-[200px]'>
              <div className='text-center'>
                <Plus className='h-10 w-10 md:h-12 md:w-12 mx-auto text-muted-foreground mb-2' />
                <CardTitle className='text-muted-foreground text-base md:text-lg'>
                  More Integrations
                </CardTitle>
                <CardDescription className='mt-2 text-sm'>
                  Additional integrations coming soon
                </CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>
      </div>
    </div>
  );
}
