"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { Icons } from "@/components/icons";
import { toast } from "@/hooks/use-toast";

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

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

        // If the redirect included an authorization code, POST it to our server-side exchange endpoint
        // If the redirect returned fragment tokens (access_token/refresh_token) we parse them below and POST them instead.
        const url = new URL(window.location.href);
        const queryCode = url.searchParams.get("code");

        // Parse fragment tokens (if present)
        const hash = window.location.hash.substring(1);
        const hashParams = new URLSearchParams(hash);
        const fragAccess = hashParams.get("access_token");
        const fragRefresh = hashParams.get("refresh_token");

        let resp: Response;
        if (queryCode) {
          resp = await fetch("/api/auth/exchange", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ code: queryCode }),
          });
        } else if (fragAccess && fragRefresh) {
          // POST tokens parsed from URL fragment to server to set HttpOnly cookies
          resp = await fetch("/api/auth/exchange", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              access_token: fragAccess,
              refresh_token: fragRefresh,
            }),
          });
        } else {
          // No code or tokens — nothing to exchange
          toast({
            title: "Google Sign-In failed",
            description:
              "No auth code or tokens were present in the callback URL.",
            variant: "destructive",
          });
          router.replace("/login");
          return;
        }

        const result = await resp.json();
        // Debug: log exchange result (includes cookie names written by server if successful)

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
  }, [router, searchParams]);

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
