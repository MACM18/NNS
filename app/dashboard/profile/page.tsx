"use client";

import { useEffect, useState } from "react";
import { Mail, Phone, MapPin, Calendar, Edit, Save, X, Camera, Trash2, Loader2 } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/auth-context";
import { useNotification } from "@/contexts/notification-context";
import { AuthWrapper } from "@/components/auth/auth-wrapper";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useRouter } from "next/navigation";
import { PageSkeleton } from "@/components/skeletons/page-skeleton";

export default function ProfilePage() {
  const { user, profile, loading } = useAuth();
  const { addNotification } = useNotification();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    full_name: profile?.full_name || "",
    phone: profile?.phone || "",
    address: profile?.address || "",
    bio: profile?.bio || "",
  });
  const [isSaving, setIsSaving] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || "");
  const [avatarBusy, setAvatarBusy] = useState(false);
  const route = useRouter();

  useEffect(() => {
    setFormData({
      full_name: profile?.full_name || "",
      phone: profile?.phone || "",
      address: profile?.address || "",
      bio: profile?.bio || "",
    });
  }, [profile]);

  useEffect(() => setAvatarUrl(profile?.avatar_url || ""), [profile?.avatar_url]);

  const handleAvatarUpload = async (file?: File) => {
    if (!file) return;
    setAvatarBusy(true);
    try {
      const body = new FormData();
      body.set("file", file);
      const response = await fetch("/api/profile/avatar", { method: "POST", body });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to upload profile photo.");
      setAvatarUrl(result.avatarUrl);
      addNotification({ title: "Photo updated", message: "Your profile photo is saved.", type: "success", category: "system" });
    } catch (error) {
      addNotification({ title: "Photo upload failed", message: error instanceof Error ? error.message : "Unable to upload profile photo.", type: "error", category: "system" });
    } finally { setAvatarBusy(false); }
  };

  const handleAvatarRemove = async () => {
    setAvatarBusy(true);
    try {
      const response = await fetch("/api/profile/avatar", { method: "DELETE" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to remove profile photo.");
      setAvatarUrl("");
      addNotification({ title: "Photo removed", message: "Your profile photo was removed.", type: "success", category: "system" });
    } catch (error) {
      addNotification({ title: "Unable to remove photo", message: error instanceof Error ? error.message : "Please try again.", type: "error", category: "system" });
    } finally { setAvatarBusy(false); }
  };

  if (!user && !loading) {
    return <AuthWrapper />;
  }

  const handleSave = async () => {
    if (!user?.id) return;
    setIsSaving(true);
    try {
      const payload = {
        fullName: formData.full_name,
        phone: formData.phone || null,
        address: formData.address || null,
        bio: formData.bio || null,
      };

      const response = await fetch(`/api/profile/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || "Failed to update profile");
      }

      const result = await response.json();
      const p = result.profile || {};

      // Update local profile in auth context by reloading (simple approach)
      // fetchProfile is internal to AuthProvider; easiest is to trigger a refresh by updating session
      // But we can also update via POST to /api or directly set profile via a fetch to /api/profile

      addNotification({
        title: "Profile Updated",
        message: "Your profile has been successfully updated.",
        type: "success",
        category: "system",
      });

      // Update UI state to normalized shape
      setFormData({
        full_name: p.fullName ?? p.full_name ?? "",
        phone: p.phone ?? "",
        address: p.address ?? "",
        bio: p.bio ?? "",
      });

      setIsEditing(false);
    } catch (error: any) {
      addNotification({
        title: "Update Failed",
        message: String(error?.message ?? "Failed to update profile"),
        type: "error",
        category: "system",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      full_name: profile?.full_name || "",
      phone: profile?.phone || "",
      address: profile?.address || "",
      bio: profile?.bio || "",
    });
    setIsEditing(false);
  };

  return (
    <div className='min-w-0 space-y-3'>
      {loading ? (
        <PageSkeleton />
      ) : (
        <div className='mx-auto'>
          <div className='flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3'>
            <div>
              <h1 className='text-3xl font-bold'>Profile</h1>
              <p className='text-muted-foreground'>
                Manage your account settings and preferences
              </p>
            </div>
            {!isEditing ? (
              <Button onClick={() => setIsEditing(true)}>
                <Edit className='h-4 w-4 mr-2' />
                Edit Profile
              </Button>
            ) : (
              <div className='flex gap-2'>
                <Button onClick={handleSave} disabled={isSaving}>
                  <Save className='h-4 w-4 mr-2' />
                  {isSaving ? "Saving…" : "Save"}
                </Button>
                <Button variant='outline' onClick={handleCancel} disabled={isSaving}>
                  <X className='h-4 w-4 mr-2' />
                  Cancel
                </Button>
              </div>
            )}
          </div>

          <div className='grid grid-cols-1 items-start gap-4 lg:grid-cols-3'>
            {/* Profile Card */}
            <Card className='lg:col-span-1'>
              <CardHeader className='space-y-1.5 p-4 text-center sm:p-5'>
                <div className='mb-2 flex justify-center'>
                  <Avatar className='h-20 w-20'>
                  <AvatarImage src={avatarUrl} />
                    <AvatarFallback className='text-lg'>
                      {profile?.full_name?.charAt(0) ||
                        user?.email?.charAt(0) ||
                        "U"}
                    </AvatarFallback>
                  </Avatar>
                </div>
                <CardTitle>{profile?.full_name || "User"}</CardTitle>
                <CardDescription>{user?.email}</CardDescription>
              </CardHeader>
              <CardContent className='space-y-3 px-4 pb-4 sm:px-5 sm:pb-5'>
                <div className="flex justify-center gap-2">
                  <label className="inline-flex cursor-pointer items-center rounded-md border px-3 py-2 text-sm hover:bg-accent">
                    {avatarBusy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Camera className="mr-2 h-4 w-4" />}
                    Change photo
                    <input className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" disabled={avatarBusy} onChange={(event) => { void handleAvatarUpload(event.target.files?.[0]); event.currentTarget.value = ""; }} />
                  </label>
                  {avatarUrl && <Button variant="ghost" size="sm" onClick={handleAvatarRemove} disabled={avatarBusy}><Trash2 className="mr-2 h-4 w-4" />Remove</Button>}
                </div>
                <p className="text-center text-xs text-muted-foreground">JPG, PNG, or WebP · up to 4 MB</p>
                <div className='flex items-center gap-2 text-sm'>
                  <Mail className='h-4 w-4 text-muted-foreground' />
                  <span>{user?.email}</span>
                </div>
                {profile?.phone && (
                  <div className='flex items-center gap-2 text-sm'>
                    <Phone className='h-4 w-4 text-muted-foreground' />
                    <span>{profile.phone}</span>
                  </div>
                )}
                {profile?.address && (
                  <div className='flex items-center gap-2 text-sm'>
                    <MapPin className='h-4 w-4 text-muted-foreground' />
                    <span>{profile.address}</span>
                  </div>
                )}
                <div className='flex items-center gap-2 text-sm'>
                  <Calendar className='h-4 w-4 text-muted-foreground' />
                  <span>
                    Joined{" "}
                    {new Date(
                      (user as any)?.createdAt ||
                        (user as any)?.created_at ||
                        ""
                    ).toLocaleDateString()}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Profile Details */}
            <Card className='lg:col-span-2'>
              <CardHeader className='space-y-1.5 p-4 sm:p-5'>
                <CardTitle>Profile Information</CardTitle>
                <CardDescription>
                  Update your personal information and contact details
                </CardDescription>
              </CardHeader>
              <CardContent className='space-y-3 px-4 pb-4 sm:px-5 sm:pb-5'>
                <div className='grid grid-cols-1 gap-3 md:grid-cols-2'>
                  <div className='space-y-1.5'>
                    <Label htmlFor='full_name'>Full Name</Label>
                    {isEditing ? (
                      <Input
                        id='full_name'
                        value={formData.full_name}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            full_name: e.target.value,
                          })
                        }
                        placeholder='Enter your full name'
                      />
                    ) : (
                      <div className='p-2 bg-muted rounded-md'>
                        {profile?.full_name || "Not set"}
                      </div>
                    )}
                    {isEditing && (
                      <div className='mt-1 text-[11px] text-muted-foreground'>
                        This changes your profile name only.
                      </div>
                    )}
                  </div>

                  <div className='space-y-1.5'>
                    <Label htmlFor='phone'>Phone Number</Label>
                    {isEditing ? (
                      <Input
                        id='phone'
                        value={formData.phone}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            phone: e.target.value,
                          })
                        }
                        placeholder='Enter your phone number'
                      />
                    ) : (
                      <div className='p-2 bg-muted rounded-md'>
                        {profile?.phone || "Not set"}
                      </div>
                    )}
                  </div>
                </div>

                <div className='grid grid-cols-1 gap-3 md:grid-cols-2'>
                  <div className='space-y-1.5'>
                    <Label htmlFor='address'>Address</Label>
                    {isEditing ? (
                      <Input id='address' value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} placeholder='Enter your address' />
                    ) : (
                      <div className='min-h-10 rounded-md bg-muted p-2 text-sm'>{profile?.address || "Not set"}</div>
                    )}
                  </div>
                  <div className='space-y-1.5'>
                    <Label htmlFor='bio'>Bio</Label>
                    {isEditing ? (
                      <Textarea id='bio' value={formData.bio} onChange={(e) => setFormData({ ...formData, bio: e.target.value })} placeholder='Tell us about yourself' rows={2} />
                    ) : (
                      <div className='min-h-10 rounded-md bg-muted p-2 text-sm'>{profile?.bio || "Not set"}</div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Account Settings */}
          <Card>
            <CardHeader className='space-y-1.5 p-4 sm:p-5'>
              <CardTitle>Account Settings</CardTitle>
              <CardDescription>
                Manage your account preferences and security settings
              </CardDescription>
            </CardHeader>
            <CardContent className='space-y-2.5 px-4 pb-4 sm:px-5 sm:pb-5'>
              <div className='flex items-center justify-between gap-3 rounded-lg border p-3'>
                <div>
                  <h4 className='font-medium'>Email Notifications</h4>
                  <p className='text-sm text-muted-foreground'>
                    Receive notifications about your account activity
                  </p>
                </div>
                <Button variant='outline' size='sm' onClick={() => route.push("/dashboard/settings?tab=notifications")}>
                  Configure
                </Button>
              </div>

              <div className='flex items-center justify-between gap-3 rounded-lg border p-3'>
                <div>
                  <h4 className='font-medium'>Change Password</h4>
                  <p className='text-sm text-muted-foreground'>
                    Update your account password
                  </p>
                </div>
                <Button variant='outline' size='sm' onClick={() => route.push("/dashboard/settings?tab=security")}>
                  Change
                </Button>
              </div>

              <div className='flex items-center justify-between gap-3 rounded-lg border p-3'>
                <div>
                  <h4 className='font-medium'>Two-Factor Authentication</h4>
                  <p className='text-sm text-muted-foreground'>
                    Add an extra layer of security to your account
                  </p>
                </div>
                <Button variant='outline' size='sm' onClick={() => route.push("/dashboard/settings?tab=security")}>
                  Enable
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
