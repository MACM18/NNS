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

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // NextAuth-managed accounts do not support email resets here.
    // Direct users to contact an admin or use account settings.
    setLoading(true);
    setTimeout(() => setLoading(false), 600);
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
            <div className='text-sm p-3 rounded border bg-muted/30'>
              Password reset by email isn’t available. Please contact your
              administrator to reset your password.
            </div>
            <Button type='submit' className='w-full' disabled>
              Disabled
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
