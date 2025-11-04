"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { Icons } from "@/components/icons";
import { toast } from "@/hooks/use-toast";
import { getSupabaseClient } from "@/lib/supabase";

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = getSupabaseClient();

  useEffect(() => {
    const exchangeCode = async () => {
      try {
        const errorDescription = searchParams.get("error_description");
        if (errorDescription) {
          toast({
            title: "Google Sign-In failed",
            description: errorDescription,
            variant: "destructive",
          });
          router.replace("/login");
          return;
        }

        const code = searchParams.get("code");
        if (!code) {
          router.replace("/login");
          return;
        }

        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          toast({
            title: "Google Sign-In failed",
            description: error.message ?? "Unable to complete sign-in.",
            variant: "destructive",
          });
          router.replace("/login");
          return;
        }

        router.replace("/dashboard");
      } catch (error: any) {
        toast({
          title: "Google Sign-In failed",
          description: error?.message ?? "Unexpected error during sign-in.",
          variant: "destructive",
        });
        router.replace("/login");
      }
    };

    void exchangeCode();
  }, [router, searchParams, supabase]);

  return <LoadingState />;
}

function LoadingState() {
  return (
    <div className='flex min-h-screen items-center justify-center'>
      <div className='flex flex-col items-center gap-4'>
        <Icons.spinner className='h-8 w-8 animate-spin text-muted-foreground' />
        <p className='text-sm text-muted-foreground'>
          Completing Google sign-in…
        </p>
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <AuthCallbackContent />
    </Suspense>
  );
}
