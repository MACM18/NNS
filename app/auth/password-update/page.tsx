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
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";

export default function PasswordUpdatePage() {
  const router = useRouter();
  const { toast } = useToast();
  const [codeParam, setCodeParam] = useState<string | null>(null);
  const [message, setMessage] = useState("");
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
    const token = new URLSearchParams(window.location.search).get("token");
    setCodeParam(token);
    // Keep the one-time bearer token out of browser history and later navigation.
    window.history.replaceState(null, "", window.location.pathname);
    setLoading(false);
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
    setMessage("");
    try {
      const response = await fetch("/api/auth/password-reset", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token: codeParam, password }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to update the password.");
      setMessage(result.message || "Password updated. You can sign in now.");
      setTimeout(() => router.replace("/login"), 1800);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to update the password.");
    } finally { setUpdating(false); }
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
              {!codeParam && <div className='text-sm p-3 rounded border bg-muted/30' role='alert'>This reset link is missing or invalid. Request a new link.</div>}
              {message && <div className='text-sm p-3 rounded border bg-muted/30' role='status'>{message}</div>}
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
                      className={`h-full bg-linear-to-r from-red-400 via-yellow-400 to-green-400 transition-all`}
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
              <Button type='submit' className='w-full' disabled={updating || !codeParam || strength < 3 || password !== confirm}>
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
