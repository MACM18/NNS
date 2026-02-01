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
import { useNotification } from "@/contexts/notification-context";
import { toast } from "sonner";
import { Eye, EyeOff } from "lucide-react";
import { Icons } from "@/components/icons";

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
  const { addNotification } = useNotification();

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const validateForm = () => {
    if (!formData.fullName.trim()) {
      toast.error("Validation Error", {
        description: "Full name is required",
        duration: 3000,
      });
      return false;
    }

    if (!formData.email.trim()) {
      toast.error("Validation Error", {
        description: "Email is required",
        duration: 3000,
      });
      return false;
    }

    if (formData.password.length < 6) {
      toast.error("Validation Error", {
        description: "Password must be at least 6 characters long",
        duration: 3000,
      });
      return false;
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error("Validation Error", {
        description: "Passwords do not match",
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
      // Call the registration API endpoint
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          name: formData.fullName,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Registration failed");
      }

      toast.success("Registration Successful", {
        description: "Your account has been created. You can now sign in.",
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
    } catch (error: any) {
      toast.error("Registration Failed", {
        description: error.message || "An error occurred during registration",
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
    <div className='flex items-center justify-center p-4 animate-fade-in-up'>
      <Card className='w-full max-w-md glass-card border-none'>
        <CardHeader className='text-center space-y-2'>
          <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-2">
            <Icons.logo className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className='text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent'>
            Create Account
          </CardTitle>
          <CardDescription className="text-base">
            Join NNS Enterprise today
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleRegister} className='space-y-4'>
            <div className="space-y-2">
              <Label htmlFor='fullName'>Full Name</Label>
              <Input
                id='fullName'
                type='text'
                className="h-11 bg-background/50 focus:bg-background transition-colors"
                value={formData.fullName}
                onChange={(e) => handleInputChange("fullName", e.target.value)}
                required
                placeholder='John Doe'
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor='email'>Email</Label>
              <Input
                id='email'
                type='email'
                className="h-11 bg-background/50 focus:bg-background transition-colors"
                value={formData.email}
                onChange={(e) => handleInputChange("email", e.target.value)}
                required
                placeholder='name@example.com'
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor='password'>Password</Label>
              <div className='relative'>
                <Input
                  id='password'
                  type={showPassword ? "text" : "password"}
                  className="h-11 bg-background/50 focus:bg-background transition-colors pr-10"
                  value={formData.password}
                  onChange={(e) =>
                    handleInputChange("password", e.target.value)
                  }
                  required
                  placeholder='••••••••'
                />
                <Button
                  type='button'
                  variant='ghost'
                  size='sm'
                  className='absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent text-muted-foreground'
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
                <div className='mt-2 animate-in fade-in slide-in-from-top-1'>
                  <div className='flex space-x-1 h-1'>
                    {[1, 2, 3, 4].map((level) => (
                      <div
                        key={level}
                        className={`w-full rounded-full transition-colors duration-300 ${level <= passwordStrength.strength
                          ? passwordStrength.strength === 1
                            ? "bg-red-500"
                            : passwordStrength.strength === 2
                              ? "bg-yellow-500"
                              : passwordStrength.strength === 3
                                ? "bg-blue-500"
                                : "bg-green-500"
                          : "bg-muted"
                          }`}
                      />
                    ))}
                  </div>
                  <p className='text-xs text-muted-foreground mt-1 text-right font-medium'>
                    {passwordStrength.text}
                  </p>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor='confirmPassword'>Confirm Password</Label>
              <div className='relative'>
                <Input
                  id='confirmPassword'
                  type={showConfirmPassword ? "text" : "password"}
                  className="h-11 bg-background/50 focus:bg-background transition-colors pr-10"
                  value={formData.confirmPassword}
                  onChange={(e) =>
                    handleInputChange("confirmPassword", e.target.value)
                  }
                  required
                  placeholder='••••••••'
                />
                <Button
                  type='button'
                  variant='ghost'
                  size='sm'
                  className='absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent text-muted-foreground'
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
                  <p className='text-xs text-red-500 mt-1 animate-in fade-in slide-in-from-top-1'>
                    Passwords do not match
                  </p>
                )}
            </div>

            <Button type='submit' className='w-full h-11 text-base shadow-lg hover:shadow-primary/25 transition-all mt-2' disabled={loading}>
              {loading ? "Creating Account..." : "Create Account"}
            </Button>

            {onSwitchToLogin && (
              <div className='text-center pt-2'>
                <p className="text-sm text-muted-foreground">
                  Already have an account?{" "}
                  <Button
                    variant='link'
                    onClick={onSwitchToLogin}
                    className='p-0 h-auto font-semibold text-primary hover:text-primary/80'
                  >
                    Sign in
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
