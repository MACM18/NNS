"use client";

import type React from "react";

import { useState } from "react";
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
import { Icons } from "@/components/icons";
import { FcGoogle } from "react-icons/fc";
import { getSupabaseClient } from "@/lib/supabase";
import { toast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";

interface LoginFormProps {
  onSwitchToRegister?: () => void;
}

export function LoginForm({ onSwitchToRegister }: LoginFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);
  const supabase = getSupabaseClient();
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Logged in successfully",
        variant: "default",
        duration: 3000,
      });
      // Redirect or perform any additional actions after successful login
      router.push("/");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
        duration: 4000,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setOauthLoading(true);
    try {
      const redirectTo =
        typeof window !== "undefined"
          ? `${window.location.origin}/auth/callback`
          : undefined;

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: redirectTo ? { redirectTo } : undefined,
      });

      if (error) throw error;
    } catch (error: any) {
      toast({
        title: "Google Sign-In failed",
        description: error.message ?? "Please try again.",
        variant: "destructive",
        duration: 4000,
      });
    } finally {
      setOauthLoading(false);
    }
  };

  return (
    <div className='min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900'>
      <Card className='w-full max-w-md'>
        <CardHeader className='text-center'>
          <CardTitle className='text-2xl font-bold'>NNS Enterprise</CardTitle>
          <CardDescription>Sign in to your telecom dashboard</CardDescription>
        </CardHeader>
        <CardContent>
          <div className='space-y-4'>
            <Button
              type='button'
              variant='outline'
              className='w-full flex items-center justify-center gap-2'
              onClick={handleGoogleSignIn}
              disabled={loading || oauthLoading}
            >
              {oauthLoading ? (
                <>
                  <Icons.spinner className='h-4 w-4 animate-spin' />
                  <span>Redirecting...</span>
                </>
              ) : (
                <>
                  {(() => {
                    const GoogleIcon =
                      Icons.google as unknown as React.ComponentType<{
                        className?: string;
                      }>;
                    return <GoogleIcon className='h-4 w-4' />;
                  })()}
                  <span>Continue with Google</span>
                </>
              )}
            </Button>
            <div className='text-center text-sm text-muted-foreground'>
              or sign in with your email
            </div>
          </div>

          <form onSubmit={handleLogin} className='space-y-4 mt-6'>
            <div>
              <Label htmlFor='email'>Email</Label>
              <Input
                id='email'
                type='email'
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor='password'>Password</Label>
              <Input
                id='password'
                type='password'
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <div className='mt-2 text-right'>
                <Button asChild variant='link' className='px-0 text-sm'>
                  <a href='/auth/forgot-password'>Forgot password?</a>
                </Button>
              </div>
            </div>
            <Button
              type='submit'
              className='w-full'
              disabled={loading || oauthLoading}
            >
              {loading ? "Signing in..." : "Sign In"}
            </Button>

            {onSwitchToRegister && (
              <div className='text-center'>
                <Button
                  variant='link'
                  onClick={onSwitchToRegister}
                  className='text-sm'
                >
                  Don&apos;t have an account? Sign up
                </Button>
              </div>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
