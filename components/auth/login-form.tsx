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
import { signIn } from "next-auth/react";
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
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        throw new Error(
          result.error === "CredentialsSignin"
            ? "Invalid email or password"
            : result.error
        );
      }

      toast({
        title: "Success",
        description: "Logged in successfully",
        variant: "default",
        duration: 3000,
      });
      // Redirect or perform any additional actions after successful login
      router.push("/dashboard");
      router.refresh();
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
      await signIn("google", {
        callbackUrl: "/dashboard",
      });
    } catch (error: any) {
      toast({
        title: "Google Sign-In failed",
        description: error.message ?? "Please try again.",
        variant: "destructive",
        duration: 4000,
      });
      setOauthLoading(false);
    }
  };

  return (
    <div className='flex items-center justify-center p-4 animate-fade-in-up'>
      <Card className='w-full max-w-md glass-card border-none'>
        <CardHeader className='text-center space-y-2'>
          <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-2">
            <Icons.logo className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className='text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent'>
            Welcome Back
          </CardTitle>
          <CardDescription className="text-base">
            Sign in to your NNS Enterprise dashboard
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className='space-y-4'>
            <Button
              type='button'
              variant='outline'
              className='w-full h-11 flex items-center justify-center gap-2 hover:bg-background/50 transition-colors'
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

            <div className='relative'>
              <div className='absolute inset-0 flex items-center'>
                <span className='w-full border-t' />
              </div>
              <div className='relative flex justify-center text-xs uppercase'>
                <span className='bg-background px-2 text-muted-foreground'>
                  Or continue with
                </span>
              </div>
            </div>
          </div>

          <form onSubmit={handleLogin} className='space-y-4 mt-4'>
            <div className="space-y-2">
              <Label htmlFor='email'>Email</Label>
              <Input
                id='email'
                type='email'
                className="h-11 bg-background/50 focus:bg-background transition-colors"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="name@example.com"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor='password'>Password</Label>
                <Button asChild variant='link' className='px-0 text-xs font-normal h-auto'>
                  <a href='/auth/forgot-password'>Forgot password?</a>
                </Button>
              </div>
              <Input
                id='password'
                type='password'
                className="h-11 bg-background/50 focus:bg-background transition-colors"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
              />
            </div>

            <Button
              type='submit'
              className='w-full h-11 text-base shadow-lg hover:shadow-primary/25 transition-all'
              disabled={loading || oauthLoading}
            >
              {loading ? "Signing in..." : "Sign In"}
            </Button>

            {onSwitchToRegister && (
              <div className='text-center pt-2'>
                <p className="text-sm text-muted-foreground">
                  Don&apos;t have an account?{" "}
                  <Button
                    variant='link'
                    onClick={onSwitchToRegister}
                    className='p-0 h-auto font-semibold text-primary hover:text-primary/80'
                  >
                    Sign up
                  </Button>
                </p>
              </div>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
