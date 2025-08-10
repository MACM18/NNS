"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/contexts/auth-context"
import { supabase } from "@/lib/supabase"
import { toast } from "@/hooks/use-toast"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Loader2 } from "lucide-react"

export default function ProfilePage() {
  const { user, loading: authLoading } = useAuth()
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [fullName, setFullName] = useState("")
  const [avatarUrl, setAvatarUrl] = useState("")
  const [billingAddress, setBillingAddress] = useState("")
  const [paymentMethod, setPaymentMethod] = useState("")
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (user) {
      fetchProfile()
    } else if (!authLoading) {
      setLoading(false) // If no user and auth is done loading, stop loading profile
    }
  }, [user, authLoading])

  const fetchProfile = async () => {
    setLoading(true)
    const { data, error } = await supabase.from("profiles").select("*").eq("id", user?.id).single()

    if (error) {
      console.error("Error fetching profile:", error)
      toast({
        title: "Error",
        description: "Failed to load profile data.",
        variant: "destructive",
      })
      setProfile(null)
    } else {
      setProfile(data)
      setFullName(data.full_name || "")
      setAvatarUrl(data.avatar_url || "")
      setBillingAddress(data.billing_address || "")
      setPaymentMethod(data.payment_method || "")
    }
    setLoading(false)
  }

  const handleSaveProfile = async () => {
    if (!user) return

    setIsSaving(true)
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: fullName,
        avatar_url: avatarUrl,
        billing_address: billingAddress,
        payment_method: paymentMethod,
      })
      .eq("id", user.id)

    if (error) {
      console.error("Error updating profile:", error)
      toast({
        title: "Error",
        description: "Failed to update profile.",
        variant: "destructive",
      })
    } else {
      toast({
        title: "Success",
        description: "Profile updated successfully.",
      })
      fetchProfile() // Re-fetch to ensure local state is in sync
    }
    setIsSaving(false)
  }

  if (loading || authLoading) {
    return (
      <div className="flex justify-center items-center h-full">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="p-8 text-center">
        <p>Please log in to view your profile.</p>
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">User Profile</h2>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profile Information</CardTitle>
          <CardDescription>Manage your personal and account details.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-4">
            <Avatar className="h-20 w-20">
              <AvatarImage src={avatarUrl || "/placeholder-user.jpg"} alt="User Avatar" />
              <AvatarFallback>{fullName ? fullName[0] : user.email ? user.email[0] : "U"}</AvatarFallback>
            </Avatar>
            <div className="grid gap-1">
              <Label htmlFor="avatarUrl">Avatar URL</Label>
              <Input id="avatarUrl" value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="fullName">Full Name</Label>
            <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={user.email} disabled />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="billingAddress">Billing Address</Label>
            <Input id="billingAddress" value={billingAddress} onChange={(e) => setBillingAddress(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="paymentMethod">Payment Method</Label>
            <Input id="paymentMethod" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} />
          </div>
          <Button onClick={handleSaveProfile} disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
