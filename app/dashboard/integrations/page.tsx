"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileSpreadsheet, Plus, ArrowUpRight } from "lucide-react";
import GoogleSheetAutoSyncSettings from "@/components/integrations/GoogleSheetAutoSyncSettings";
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
      !["admin", "moderator", "superadmin"].includes(role.toLowerCase())
    ) {
      router.push("/dashboard");
    }
  }, [role, loading, router]);

  if (loading) {
    return (
      <div className='container mx-auto min-w-0 p-0 2xl:p-6'>
        <div className='animate-pulse'>
          <div className='h-8 bg-muted rounded w-3/4 sm:w-1/4 mb-4'></div>
          <div className='h-4 bg-muted rounded w-full sm:w-1/2 mb-8'></div>
          <div className='grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3'>
            <div className='h-48 bg-muted rounded'></div>
          </div>
        </div>
      </div>
    );
  }

  if (!role || !["admin", "moderator", "superadmin"].includes(role.toLowerCase())) {
    return null;
  }

  return (
    <div className='min-w-0 space-y-4 2xl:space-y-8'>
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
        <Card className='group border-border/80 shadow-xs transition-colors hover:border-primary/40 hover:bg-primary/3 hover:shadow-md'>
          <CardHeader>
            <div className='flex items-center justify-between gap-2'>
              <div className='p-2.5 bg-primary/10 rounded-lg w-fit shrink-0 transition-colors group-hover:bg-primary/15'>
                <FileSpreadsheet className='h-6 w-6 md:h-8 md:w-8 text-primary' />
              </div>
              <Link href='/dashboard/integrations/google-sheets'>
                <Button variant='outline' size='sm' className='gap-2 hover:border-primary/40 hover:bg-primary/10 hover:text-primary'>
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
              <Button variant='ghost' className='w-full justify-between text-primary hover:bg-primary/10 hover:text-primary'>
                Manage Connections <ArrowUpRight className='h-4 w-4' />
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Placeholder for future integrations */}
        <Card className='border-dashed border-border bg-muted/20'>
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
      <GoogleSheetAutoSyncSettings canManageMonthly={["admin", "superadmin"].includes(role.toLowerCase())} />
    </div>
  );
}
