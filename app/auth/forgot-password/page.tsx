"use client";

import { useState } from "react";
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

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch("/api/auth/password-reset", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to request a reset link.");
      setMessage(result.message || "If an eligible account exists, a reset link will arrive shortly.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to request a reset link.");
    } finally { setLoading(false); }
  };

  return (
    <div className='min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4'>
      <Card className='w-full max-w-md'>
        <CardHeader className='text-center'>
          <CardTitle className='text-2xl font-bold'>Forgot Password</CardTitle>
          <CardDescription>
            We will email you a link to reset your password.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className='space-y-4'>
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
            <p className='text-sm text-muted-foreground'>For security, we’ll show the same confirmation whether or not an eligible account exists.</p>
            {message && <div className='text-sm p-3 rounded border bg-muted/30' role='status'>{message}</div>}
            <Button type='submit' className='w-full' disabled={loading}>
              {loading ? "Sending…" : "Send reset link"}
            </Button>
            <div className='text-center'>
              <Button asChild variant='link' className='text-sm'>
                <Link href='/login'>Back to login</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
