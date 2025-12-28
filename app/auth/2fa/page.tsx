"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, Key, Loader2 } from "lucide-react";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";

function TwoFactorVerificationContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [code, setCode] = useState("");
  const [backupCode, setBackupCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("authenticator");
  const inputRef = useRef<HTMLInputElement>(null);

  // Get credentials from URL params (temporarily stored)
  const email = searchParams.get("email");
  const userId = searchParams.get("uid");
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";

  useEffect(() => {
    // Focus the code input on mount
    inputRef.current?.focus();
  }, [activeTab]);

  // If no email/userId, redirect to login
  useEffect(() => {
    if (!email || !userId) {
      router.push("/login");
    }
  }, [email, userId, router]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const codeToVerify = activeTab === "authenticator" ? code : backupCode;

    if (!codeToVerify) {
      toast({
        title: "Verification code required",
        description: "Please enter a verification code",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    try {
      // Get stored password from sessionStorage
      const storedPassword = sessionStorage.getItem("2fa_temp_password");

      if (!storedPassword) {
        toast({
          title: "Session expired",
          description: "Please log in again",
          variant: "destructive",
        });
        setTimeout(() => router.push("/login"), 1000);
        return;
      }

      const result = await signIn("credentials", {
        email,
        password: storedPassword,
        twoFactorCode: codeToVerify,
        redirect: false,
      });

      // Clear stored password
      sessionStorage.removeItem("2fa_temp_password");

      if (result?.error) {
        toast({
          title: "Verification failed",
          description: result.error.includes("Invalid 2FA")
            ? "Invalid verification code. Please try again."
            : result.error,
          variant: "destructive",
        });
      } else if (result?.ok) {
        toast({
          title: "Success!",
          description: "Two-factor authentication verified",
        });
        setTimeout(() => router.push(callbackUrl), 500);
      }
    } catch (err) {
      toast({
        title: "Error",
        description: "Verification failed. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Format code input (add dash after 3 characters for TOTP)
  const handleCodeChange = (value: string) => {
    const cleaned = value.replace(/[^0-9]/g, "").slice(0, 6);
    setCode(cleaned);
  };

  // Format backup code input (XXXX-XXXX format)
  const handleBackupCodeChange = (value: string) => {
    const cleaned = value
      .replace(/[^A-Za-z0-9]/g, "")
      .toUpperCase()
      .slice(0, 8);
    if (cleaned.length > 4) {
      setBackupCode(`${cleaned.slice(0, 4)}-${cleaned.slice(4)}`);
    } else {
      setBackupCode(cleaned);
    }
  };

  if (!email || !userId) {
    return null;
  }

  return (
    <div className='min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4 animate-in fade-in duration-500'>
      <Card className='w-full max-w-md animate-in slide-in-from-bottom-4 duration-700'>
        <CardHeader className='text-center space-y-2'>
          <div className='mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center'>
            <Shield className='h-6 w-6 text-primary' />
          </div>
          <CardTitle className='text-2xl'>Two-Factor Authentication</CardTitle>
          <CardDescription>
            Enter the verification code from your authenticator app
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className='grid w-full grid-cols-2'>
              <TabsTrigger value='authenticator' className='gap-2'>
                <Shield className='h-4 w-4' />
                Authenticator
              </TabsTrigger>
              <TabsTrigger value='backup' className='gap-2'>
                <Key className='h-4 w-4' />
                Backup Code
              </TabsTrigger>
            </TabsList>

            <form onSubmit={handleVerify}>
              <TabsContent value='authenticator' className='space-y-4'>
                <div className='space-y-2'>
                  <Label htmlFor='code'>6-digit code</Label>
                  <Input
                    ref={inputRef}
                    id='code'
                    type='text'
                    inputMode='numeric'
                    pattern='[0-9]*'
                    maxLength={6}
                    placeholder='000000'
                    value={code}
                    onChange={(e) => handleCodeChange(e.target.value)}
                    className='text-center text-2xl tracking-[0.5em] font-mono'
                    autoComplete='one-time-code'
                  />
                  <p className='text-xs text-muted-foreground'>
                    Open your authenticator app (Google Authenticator, Authy,
                    etc.) and enter the 6-digit code.
                  </p>
                </div>
              </TabsContent>

              <TabsContent value='backup' className='space-y-4'>
                <div className='space-y-2'>
                  <Label htmlFor='backup-code'>Backup Code</Label>
                  <Input
                    ref={inputRef}
                    id='backup-code'
                    type='text'
                    maxLength={9}
                    placeholder='XXXX-XXXX'
                    value={backupCode}
                    onChange={(e) => handleBackupCodeChange(e.target.value)}
                    className='text-center text-xl tracking-wider font-mono uppercase'
                  />
                  <p className='text-xs text-muted-foreground'>
                    Enter one of your backup codes. Each backup code can only be
                    used once.
                  </p>
                </div>
              </TabsContent>

              <Button
                type='submit'
                className='w-full mt-4'
                disabled={
                  loading ||
                  (activeTab === "authenticator" && code.length !== 6) ||
                  (activeTab === "backup" && backupCode.length !== 9)
                }
              >
                {loading ? (
                  <>
                    <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                    Verifying...
                  </>
                ) : (
                  "Verify"
                )}
              </Button>
            </form>
          </Tabs>

          <div className='mt-6 text-center'>
            <Link
              href='/login'
              className='text-sm text-muted-foreground hover:text-primary'
            >
              ← Back to login
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function TwoFactorLoadingFallback() {
  return (
    <div className='min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4'>
      <Card className='w-full max-w-md'>
        <CardHeader className='text-center space-y-2'>
          <div className='mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center'>
            <Shield className='h-6 w-6 text-primary' />
          </div>
          <CardTitle className='text-2xl'>Two-Factor Authentication</CardTitle>
          <CardDescription>Loading...</CardDescription>
        </CardHeader>
        <CardContent className='flex justify-center py-8'>
          <Loader2 className='h-8 w-8 animate-spin text-primary' />
        </CardContent>
      </Card>
    </div>
  );
}

export default function TwoFactorVerificationPage() {
  return (
    <Suspense fallback={<TwoFactorLoadingFallback />}>
      <TwoFactorVerificationContent />
    </Suspense>
  );
}
