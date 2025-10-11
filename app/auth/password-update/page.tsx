"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { getSupabaseClient } from "@/lib/supabase";
import Link from "next/link";

export default function PasswordUpdatePage() {
  const router = useRouter();
  const [codeParam, setCodeParam] = useState<string | null>(null);
  const supabase = getSupabaseClient();
  const [loading, setLoading] = useState(true);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [updating, setUpdating] = useState(false);
  const [visible, setVisible] = useState(false);
  const [strength, setStrength] = useState(0);

  const calculateStrength = (p: string) => {
    let score = 0;
    if (p.length >= 8) score++;
    if (/[A-Z]/.test(p)) score++;
    if (/[0-9]/.test(p)) score++;
    if (/[^A-Za-z0-9]/.test(p)) score++;
    return score; // 0-4
  };

  // update strength when password changes
  useEffect(() => {
    setStrength(calculateStrength(password));
  }, [password]);

  useEffect(() => {
    // On visiting via the magic link, Supabase will set session automatically.
    // We can verify the type is recovery and enable the form.
    const handle = async () => {
        const { data } = await supabase.auth.getSession();
        if (!data.session) {
          // Try to exchange code if present. Read code from client-only state.
          const code = codeParam || (typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("code") : null);
          if (code) {
            const { data: setData, error: setErr } =
              await supabase.auth.exchangeCodeForSession(code);
            if (setErr) {
              toast({
                title: "Invalid or expired link",
                description: setErr.message,
                variant: "destructive",
              });
            }
          }
        }
      setLoading(false);
    };
    // populate code param on client side to avoid useSearchParams CSR bailout
    if (typeof window !== "undefined") {
      setCodeParam(new URLSearchParams(window.location.search).get("code"));
    }
    handle();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (strength < 3) {
      toast({
        title: "Weak password",
        description:
          "Choose a stronger password (include uppercase, numbers, or symbols).",
        variant: "destructive",
      });
      return;
    }
    if (password !== confirm) {
      toast({ title: "Passwords do not match", variant: "destructive" });
      return;
    }
    setUpdating(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast({
        title: "Password updated",
        description: "You can now sign in with your new password.",
      });
      router.push("/login");
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className='min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4'>
      <Card className='w-full max-w-md'>
        <CardHeader className='text-center'>
          <CardTitle className='text-2xl font-bold'>Update Password</CardTitle>
          <CardDescription>
            Enter a new password for your account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className='text-center text-muted-foreground'>
              Validating reset link…
            </div>
          ) : (
            <form onSubmit={onSubmit} className='space-y-4'>
              <div>
                <Label htmlFor='password'>New Password</Label>
                <div className='relative'>
                  <Input
                    id='password'
                    type={visible ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type='button'
                    onClick={() => setVisible((v) => !v)}
                    className='absolute right-2 top-2 text-sm text-muted-foreground'
                  >
                    {visible ? "Hide" : "Show"}
                  </button>
                </div>

                <div className='mt-2'>
                  <div className='h-2 w-full bg-muted rounded overflow-hidden'>
                    <div
                      className={`h-full bg-gradient-to-r from-red-400 via-yellow-400 to-green-400 transition-width`}
                      style={{ width: `${(strength / 4) * 100}%` }}
                    />
                  </div>
                  <div className='text-xs text-muted-foreground mt-1'>
                    Strength: {strength}/4{" "}
                    {strength < 3 && (
                      <span className='text-destructive'>
                        &middot; choose a stronger password
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div>
                <Label htmlFor='confirm'>Confirm Password</Label>
                <Input
                  id='confirm'
                  type='password'
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                />
              </div>
              <Button type='submit' className='w-full' disabled={updating}>
                {updating ? "Updating…" : "Update Password"}
              </Button>
              <div className='text-center'>
                <Button asChild variant='link' className='text-sm'>
                  <Link href='/login'>Back to login</Link>
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
