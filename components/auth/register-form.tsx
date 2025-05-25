"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { getSupabaseClient } from "@/lib/supabase"
import { useNotification } from "@/contexts/notification-context"
import { Eye, EyeOff } from "lucide-react"

interface RegisterFormProps {
  onSwitchToLogin?: () => void
}

export function RegisterForm({ onSwitchToLogin }: RegisterFormProps) {
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "",
  })
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const supabase = getSupabaseClient()
  const { addNotification } = useNotification()

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const validateForm = () => {
    if (!formData.fullName.trim()) {
      addNotification({
        title: "Validation Error",
        message: "Full name is required",
        type: "error",
      })
      return false
    }

    if (!formData.email.trim()) {
      addNotification({
        title: "Validation Error",
        message: "Email is required",
        type: "error",
      })
      return false
    }

    if (formData.password.length < 6) {
      addNotification({
        title: "Validation Error",
        message: "Password must be at least 6 characters long",
        type: "error",
      })
      return false
    }

    if (formData.password !== formData.confirmPassword) {
      addNotification({
        title: "Validation Error",
        message: "Passwords do not match",
        type: "error",
      })
      return false
    }

    if (!formData.role) {
      addNotification({
        title: "Validation Error",
        message: "Please select a role",
        type: "error",
      })
      return false
    }

    return true
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) return

    setLoading(true)

    try {
      // Create user with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.fullName,
            role: formData.role,
          },
        },
      })

      if (authError) throw authError

      if (authData.user) {
        // Create profile record
        const { error: profileError } = await supabase.from("profiles").insert([
          {
            id: authData.user.id,
            email: formData.email,
            full_name: formData.fullName,
            role: formData.role,
          },
        ])

        if (profileError) {
          console.error("Profile creation error:", profileError)
          // Don't throw here as the user is already created
        }

        addNotification({
          title: "Registration Successful",
          message: "Please check your email to verify your account",
          type: "success",
        })

        // Reset form
        setFormData({
          fullName: "",
          email: "",
          password: "",
          confirmPassword: "",
          role: "",
        })

        // Switch to login after a delay
        setTimeout(() => {
          if (onSwitchToLogin) {
            onSwitchToLogin()
          }
        }, 2000)
      }
    } catch (error: any) {
      addNotification({
        title: "Registration Failed",
        message: error.message || "An error occurred during registration",
        type: "error",
      })
    } finally {
      setLoading(false)
    }
  }

  const getPasswordStrength = (password: string) => {
    if (password.length === 0) return { strength: 0, text: "" }
    if (password.length < 6) return { strength: 1, text: "Weak" }
    if (password.length < 8) return { strength: 2, text: "Fair" }
    if (password.length >= 8 && /(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
      return { strength: 4, text: "Strong" }
    }
    return { strength: 3, text: "Good" }
  }

  const passwordStrength = getPasswordStrength(formData.password)

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-bold">NNS Enterprise</CardTitle>
        <CardDescription>Create your telecom dashboard account</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <Label htmlFor="fullName">Full Name</Label>
            <Input
              id="fullName"
              type="text"
              value={formData.fullName}
              onChange={(e) => handleInputChange("fullName", e.target.value)}
              required
              placeholder="Enter your full name"
            />
          </div>

          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange("email", e.target.value)}
              required
              placeholder="Enter your email address"
            />
          </div>

          <div>
            <Label htmlFor="role">Role</Label>
            <Select value={formData.role} onValueChange={(value) => handleInputChange("role", value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select your role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="technician">
                  <div className="flex flex-col">
                    <span>Technician</span>
                    <span className="text-xs text-muted-foreground">Field installation and maintenance</span>
                  </div>
                </SelectItem>
                <SelectItem value="field_engineer">
                  <div className="flex flex-col">
                    <span>Field Engineer</span>
                    <span className="text-xs text-muted-foreground">Technical planning and oversight</span>
                  </div>
                </SelectItem>
                <SelectItem value="supervisor">
                  <div className="flex flex-col">
                    <span>Supervisor</span>
                    <span className="text-xs text-muted-foreground">Team management and coordination</span>
                  </div>
                </SelectItem>
                <SelectItem value="inventory_manager">
                  <div className="flex flex-col">
                    <span>Inventory Manager</span>
                    <span className="text-xs text-muted-foreground">Stock and material management</span>
                  </div>
                </SelectItem>
                <SelectItem value="manager">
                  <div className="flex flex-col">
                    <span>Manager</span>
                    <span className="text-xs text-muted-foreground">Operations and project management</span>
                  </div>
                </SelectItem>
                <SelectItem value="admin">
                  <div className="flex flex-col">
                    <span>Administrator</span>
                    <span className="text-xs text-muted-foreground">System administration and full access</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                value={formData.password}
                onChange={(e) => handleInputChange("password", e.target.value)}
                required
                placeholder="Enter your password"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
            {formData.password && (
              <div className="mt-2">
                <div className="flex space-x-1">
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
                <p className="text-xs text-muted-foreground mt-1">{passwordStrength.text}</p>
              </div>
            )}
          </div>

          <div>
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                value={formData.confirmPassword}
                onChange={(e) => handleInputChange("confirmPassword", e.target.value)}
                required
                placeholder="Confirm your password"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
            {formData.confirmPassword && formData.password !== formData.confirmPassword && (
              <p className="text-xs text-red-500 mt-1">Passwords do not match</p>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Creating Account..." : "Create Account"}
          </Button>

          {onSwitchToLogin && (
            <div className="text-center">
              <Button variant="link" onClick={onSwitchToLogin} className="text-sm">
                Already have an account? Sign in
              </Button>
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  )
}
