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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getSupabaseClient } from "@/lib/supabase";
import { useNotification } from "@/contexts/notification-context";
import { toast } from "@/hooks/use-toast";
import { Eye, EyeOff } from "lucide-react";

interface RegisterFormProps {
  onSwitchToLogin?: () => void;
}

export function RegisterForm({ onSwitchToLogin }: RegisterFormProps) {
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "",
  });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const supabase = getSupabaseClient();
  const { addNotification } = useNotification();

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const validateForm = () => {
    if (!formData.fullName.trim()) {
      toast({
        title: "Validation Error",
        description: "Full name is required",
        variant: "destructive",
        duration: 3000,
      });
      return false;
    }

    if (!formData.email.trim()) {
      toast({
        title: "Validation Error",
        description: "Email is required",
        variant: "destructive",
        duration: 3000,
      });
      return false;
    }

    if (formData.password.length < 6) {
      toast({
        title: "Validation Error",
        description: "Password must be at least 6 characters long",
        variant: "destructive",
        duration: 3000,
      });
      return false;
    }

    if (formData.password !== formData.confirmPassword) {
      toast({
        title: "Validation Error",
        description: "Passwords do not match",
        variant: "destructive",
        duration: 3000,
      });
      return false;
    }

    return true;
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setLoading(true);

    try {
      // Check if email is already registered (in profiles)
      const { data: existingProfile } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", formData.email)
        .single();
      if (existingProfile) {
        toast({
          title: "Email Already Registered",
          description:
            "This email is already registered and approved. Please sign in or use a different email.",
          variant: "destructive",
          duration: 4000,
        });
        setLoading(false);
        return;
      }
      // Check if email is pending approval (in auth, but not in profiles)
      const { data: authUsers } = await supabase.auth.admin.listUsers();
      const pendingUser = (authUsers?.users || []).find(
        (u) => u.email === formData.email && u.email_confirmed_at
      );
      if (pendingUser) {
        toast({
          title: "Pending Approval",
          description:
            "This email is registered and pending admin approval. Please wait for approval or contact support.",
          variant: "destructive",
          duration: 4000,
        });
        setLoading(false);
        return;
      }

      // Create user with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.fullName,
            role: "user",
          },
        },
      });

      if (authError) throw authError;

      if (authData.user) {
        // Do not create profile here. Profile will be created after admin approval.
        toast({
          title: "Registration Successful",
          description: "Please check your email to verify your account",
          variant: "default",
          duration: 4000,
        });

        // Reset form
        setFormData({
          fullName: "",
          email: "",
          password: "",
          confirmPassword: "",
          role: "",
        });

        // Switch to login after a delay
        setTimeout(() => {
          if (onSwitchToLogin) {
            onSwitchToLogin();
          }
        }, 2000);
      }
    } catch (error: any) {
      toast({
        title: "Registration Failed",
        description: error.message || "An error occurred during registration",
        variant: "destructive",
        duration: 4000,
      });
    } finally {
      setLoading(false);
    }
  };

  const getPasswordStrength = (password: string) => {
    if (password.length === 0) return { strength: 0, text: "" };
    if (password.length < 6) return { strength: 1, text: "Weak" };
    if (password.length < 8) return { strength: 2, text: "Fair" };
    if (
      password.length >= 8 &&
      /(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)
    ) {
      return { strength: 4, text: "Strong" };
    }
    return { strength: 3, text: "Good" };
  };

  const passwordStrength = getPasswordStrength(formData.password);

  return (
    <div className='min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900'>
      <Card className='w-full max-w-md'>
        <CardHeader className='text-center'>
          <CardTitle className='text-2xl font-bold'>NNS Enterprise</CardTitle>
          <CardDescription>
            Create your telecom dashboard account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleRegister} className='space-y-4'>
            <div>
              <Label htmlFor='fullName'>Full Name</Label>
              <Input
                id='fullName'
                type='text'
                value={formData.fullName}
                onChange={(e) => handleInputChange("fullName", e.target.value)}
                required
                placeholder='Enter your full name'
              />
            </div>

            <div>
              <Label htmlFor='email'>Email</Label>
              <Input
                id='email'
                type='email'
                value={formData.email}
                onChange={(e) => handleInputChange("email", e.target.value)}
                required
                placeholder='Enter your email address'
              />
            </div>

            <div>
              <Label htmlFor='password'>Password</Label>
              <div className='relative'>
                <Input
                  id='password'
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={(e) =>
                    handleInputChange("password", e.target.value)
                  }
                  required
                  placeholder='Enter your password'
                />
                <Button
                  type='button'
                  variant='ghost'
                  size='sm'
                  className='absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent'
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className='h-4 w-4' />
                  ) : (
                    <Eye className='h-4 w-4' />
                  )}
                </Button>
              </div>
              {formData.password && (
                <div className='mt-2'>
                  <div className='flex space-x-1'>
                    {[1, 2, 3, 4].map((level) => (
                      <div
                        key={level}
                        className={`h-1 w-full rounded ${
                          level <= passwordStrength.strength
                            ? passwordStrength.strength === 1
                              ? "bg-red-500"
                              : passwordStrength.strength === 2
                              ? "bg-yellow-500"
                              : passwordStrength.strength === 3
                              ? "bg-blue-500"
                              : "bg-green-500"
                            : "bg-gray-200"
                        }`}
                      />
                    ))}
                  </div>
                  <p className='text-xs text-muted-foreground mt-1'>
                    {passwordStrength.text}
                  </p>
                </div>
              )}
            </div>

            <div>
              <Label htmlFor='confirmPassword'>Confirm Password</Label>
              <div className='relative'>
                <Input
                  id='confirmPassword'
                  type={showConfirmPassword ? "text" : "password"}
                  value={formData.confirmPassword}
                  onChange={(e) =>
                    handleInputChange("confirmPassword", e.target.value)
                  }
                  required
                  placeholder='Confirm your password'
                />
                <Button
                  type='button'
                  variant='ghost'
                  size='sm'
                  className='absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent'
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? (
                    <EyeOff className='h-4 w-4' />
                  ) : (
                    <Eye className='h-4 w-4' />
                  )}
                </Button>
              </div>
              {formData.confirmPassword &&
                formData.password !== formData.confirmPassword && (
                  <p className='text-xs text-red-500 mt-1'>
                    Passwords do not match
                  </p>
                )}
            </div>

            <Button type='submit' className='w-full' disabled={loading}>
              {loading ? "Creating Account..." : "Create Account"}
            </Button>

            {onSwitchToLogin && (
              <div className='text-center'>
                <Button
                  variant='link'
                  onClick={onSwitchToLogin}
                  className='text-sm'
                >
                  Already have an account? Sign in
                </Button>
              </div>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
