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

        // POST the code to our server-side exchange endpoint which will set HttpOnly cookies
        const resp = await fetch("/api/auth/exchange", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code }),
        });
        const result = await resp.json();
        // Debug: log exchange result (includes cookie names written by server if successful)
        // eslint-disable-next-line no-console
        console.debug("[auth/callback] exchange result:", result);

        if (!resp.ok) {
          toast({
            title: "Google Sign-In failed",
            description: result?.error ?? "Unable to complete sign-in.",
            variant: "destructive",
          });
          router.replace("/login");
          return;
        }

        // Exchange succeeded server-side and cookies were set; redirect home
        router.replace("/");
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
