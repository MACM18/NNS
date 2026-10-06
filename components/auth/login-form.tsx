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
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface LoginFormProps {
  onSwitchToRegister?: () => void;
}

export function LoginForm({ onSwitchToRegister }: LoginFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);
  const [twoFactorRequired, setTwoFactorRequired] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        ...(twoFactorRequired ? { twoFactorCode } : {}),
        redirect: false,
      });

      if (result?.error) {
        if (result.code === "two_factor_required") {
          setTwoFactorRequired(true);
          setTwoFactorCode("");
          toast.info("Enter your authenticator or backup code to finish signing in.");
          return;
        }
        if (result.code === "invalid_two_factor_code") {
          setTwoFactorCode("");
          toast.error("That verification code is not valid. Try again or use a backup code.");
          return;
        }
        if (result.error === "CredentialsSignin") {
          throw new Error("Invalid email or password");
        }
        throw new Error("Unable to sign in. Please try again.");
      }

      toast.success("Logged in successfully");
      router.push("/dashboard");
      router.refresh();
    } catch (error: any) {
      toast.error(error.message || "Login failed");
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
      toast.error(error.message ?? "Google Sign-In failed. Please try again.");
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
          <CardTitle className='text-3xl font-bold bg-clip-text text-transparent bg-linear-to-r from-primary to-accent'>
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
              disabled={loading || oauthLoading || twoFactorRequired}
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
            {!twoFactorRequired ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor='email'>Email</Label>
                  <Input
                    id='email'
                    type='email'
                    className="h-11 bg-background/50 focus:bg-background transition-colors"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="username"
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
                    autoComplete="current-password"
                    placeholder="••••••••"
                  />
                </div>
              </>
            ) : (
              <div className="space-y-3">
                <div className="rounded-xl border bg-muted/30 p-3 text-sm">
                  <p className="font-medium">Two-factor verification required</p>
                  <p className="mt-1 text-muted-foreground">Enter the 6-digit authenticator code or an 8-character backup code for {email}.</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-two-factor-code">Authenticator or backup code</Label>
                  <Input
                    id="login-two-factor-code"
                    type="text"
                    inputMode="text"
                    autoComplete="one-time-code"
                    autoFocus
                    className="h-11 bg-background/50 text-center font-mono text-lg tracking-[0.2em] focus:bg-background"
                    value={twoFactorCode}
                    onChange={(event) => setTwoFactorCode(event.target.value.replace(/[^a-zA-Z0-9-]/g, "").slice(0, 9).toUpperCase())}
                    required
                    placeholder="000000 or XXXX-XXXX"
                  />
                </div>
                <Button
                  type="button"
                  variant="link"
                  className="h-auto px-0 text-xs"
                  onClick={() => { setTwoFactorRequired(false); setTwoFactorCode(""); }}
                >
                  Back to email and password
                </Button>
              </div>
            )}

            <Button
              type='submit'
              className='w-full h-11 text-base shadow-lg hover:shadow-primary/25 transition-all'
              disabled={loading || oauthLoading || (twoFactorRequired && !twoFactorCode.trim())}
            >
              {loading ? (twoFactorRequired ? "Verifying..." : "Signing in...") : (twoFactorRequired ? "Verify and Sign In" : "Sign In")}
            </Button>

            {onSwitchToRegister && !twoFactorRequired && (
              <div className='text-center pt-2'>
                <p className="text-sm text-muted-foreground">
                  Don&apos;t have an account?{" "}
                  <Button
                    type="button"
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
