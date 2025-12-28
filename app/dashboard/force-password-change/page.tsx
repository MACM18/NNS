"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, Loader2, ShieldAlert, Check } from "lucide-react";

export default function ForcePasswordChangePage() {
  const router = useRouter();
  const { data: session, update } = useSession();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // Password requirements
  const requirements = [
    { met: newPassword.length >= 8, text: "At least 8 characters" },
    { met: /[A-Z]/.test(newPassword), text: "At least one uppercase letter" },
    { met: /[a-z]/.test(newPassword), text: "At least one lowercase letter" },
    { met: /[0-9]/.test(newPassword), text: "At least one number" },
    {
      met: /[^A-Za-z0-9]/.test(newPassword),
      text: "At least one special character",
    },
  ];

  const allRequirementsMet = requirements.every((r) => r.met);
  const passwordsMatch =
    newPassword && confirmPassword && newPassword === confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (!allRequirementsMet) {
      setError("Please meet all password requirements");
      setLoading(false);
      return;
    }

    if (!passwordsMatch) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to change password");
      }

      setSuccess(true);

      // Update the session to clear passwordExpired flag
      await update({ passwordExpired: false });

      // Redirect to dashboard after short delay
      setTimeout(() => {
        router.push("/dashboard");
      }, 2000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className='min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4'>
        <Card className='w-full max-w-md'>
          <CardContent className='pt-6 text-center'>
            <div className='mx-auto w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center mb-4'>
              <Check className='h-6 w-6 text-green-500' />
            </div>
            <h2 className='text-xl font-semibold mb-2'>Password Updated!</h2>
            <p className='text-muted-foreground'>
              Redirecting you to the dashboard...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className='min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4'>
      <Card className='w-full max-w-md'>
        <CardHeader className='text-center space-y-2'>
          <div className='mx-auto w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center'>
            <ShieldAlert className='h-6 w-6 text-amber-500' />
          </div>
          <CardTitle className='text-2xl'>Password Expired</CardTitle>
          <CardDescription>
            Your password has expired. Please create a new password to continue.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert variant='destructive' className='mb-6'>
            <AlertTriangle className='h-4 w-4' />
            <AlertTitle>Security Notice</AlertTitle>
            <AlertDescription>
              For your security, passwords must be changed periodically. Please
              create a strong, unique password.
            </AlertDescription>
          </Alert>

          <form onSubmit={handleSubmit} className='space-y-4'>
            <div className='space-y-2'>
              <Label htmlFor='current-password'>Current Password</Label>
              <Input
                id='current-password'
                type='password'
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder='Enter your current password'
                required
              />
            </div>

            <div className='space-y-2'>
              <Label htmlFor='new-password'>New Password</Label>
              <Input
                id='new-password'
                type='password'
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder='Enter a new password'
                required
              />
            </div>

            <div className='space-y-2'>
              <Label htmlFor='confirm-password'>Confirm New Password</Label>
              <Input
                id='confirm-password'
                type='password'
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder='Confirm your new password'
                required
              />
              {newPassword && confirmPassword && !passwordsMatch && (
                <p className='text-xs text-destructive'>
                  Passwords do not match
                </p>
              )}
            </div>

            {/* Password Requirements */}
            <div className='space-y-2 rounded-md border p-3'>
              <p className='text-sm font-medium'>Password Requirements:</p>
              <ul className='space-y-1'>
                {requirements.map((req, index) => (
                  <li
                    key={index}
                    className={`text-xs flex items-center gap-2 ${
                      req.met ? "text-green-600" : "text-muted-foreground"
                    }`}
                  >
                    {req.met ? (
                      <Check className='h-3 w-3' />
                    ) : (
                      <div className='h-3 w-3 rounded-full border' />
                    )}
                    {req.text}
                  </li>
                ))}
              </ul>
            </div>

            {error && (
              <Alert variant='destructive'>
                <AlertTriangle className='h-4 w-4' />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button
              type='submit'
              className='w-full'
              disabled={loading || !allRequirementsMet || !passwordsMatch}
            >
              {loading ? (
                <>
                  <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                  Updating Password...
                </>
              ) : (
                "Update Password"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
