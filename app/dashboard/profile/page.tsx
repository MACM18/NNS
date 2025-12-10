"use client";

import { useState } from "react";
import { Mail, Phone, MapPin, Calendar, Edit, Save, X } from "lucide-react";
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
  const route = useRouter();

  if (!user && !loading) {
    return <AuthWrapper />;
  }

  const handleSave = async () => {
    try {
      // Here you would typically update the profile in Supabase
      // For now, we'll just show a success notification
      addNotification({
        title: "Profile Updated",
        message: "Your profile has been successfully updated.",
        type: "success",
        category: "system",
      });
      setIsEditing(false);
    } catch (error) {
      addNotification({
        title: "Update Failed",
        message: "Failed to update profile. Please try again.",
        type: "error",
        category: "system",
      });
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
    <div className='space-y-6'>
      {loading ? (
        <PageSkeleton />
      ) : (
        <div className='max-w-4xl mx-auto'>
          <div className='flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4'>
            <div>
              <h1 className='text-3xl font-bold'>Profile</h1>
              <p className='text-muted-foreground'>
                Manage your account settings and preferences
              </p>
            </div>
            {/* {!isEditing ? ( */}
            <Button onClick={() => route.push("/dashboard/settings")}>
              <Edit className='h-4 w-4 mr-2' />
              Edit Profile
            </Button>
            {/* ) : (
              <div className='flex gap-2'>
                <Button onClick={handleSave}>
                  <Save className='h-4 w-4 mr-2' />
                  Save
                </Button>
                <Button variant='outline' onClick={handleCancel}>
                  <X className='h-4 w-4 mr-2' />
                  Cancel
                </Button>
              </div>
            )} */}
          </div>

          <div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
            {/* Profile Card */}
            <Card className='lg:col-span-1'>
              <CardHeader className='text-center'>
                <div className='flex justify-center mb-4'>
                  <Avatar className='h-24 w-24'>
                    <AvatarImage src={profile?.avatar_url || ""} />
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
              <CardContent className='space-y-4'>
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
                    {new Date((user as any)?.createdAt || "").toLocaleDateString()}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Profile Details */}
            <Card className='lg:col-span-2'>
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
                <CardDescription>
                  Update your personal information and contact details
                </CardDescription>
              </CardHeader>
              <CardContent className='space-y-6'>
                <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                  <div className='space-y-2'>
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
                  </div>

                  <div className='space-y-2'>
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

                <div className='space-y-2'>
                  <Label htmlFor='address'>Address</Label>
                  {isEditing ? (
                    <Input
                      id='address'
                      value={formData.address}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          address: e.target.value,
                        })
                      }
                      placeholder='Enter your address'
                    />
                  ) : (
                    <div className='p-2 bg-muted rounded-md'>
                      {profile?.address || "Not set"}
                    </div>
                  )}
                </div>

                <div className='space-y-2'>
                  <Label htmlFor='bio'>Bio</Label>
                  {isEditing ? (
                    <Textarea
                      id='bio'
                      value={formData.bio}
                      onChange={(e) =>
                        setFormData({ ...formData, bio: e.target.value })
                      }
                      placeholder='Tell us about yourself'
                      rows={4}
                    />
                  ) : (
                    <div className='p-2 bg-muted rounded-md min-h-[100px]'>
                      {profile?.bio || "Not set"}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Account Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Account Settings</CardTitle>
              <CardDescription>
                Manage your account preferences and security settings
              </CardDescription>
            </CardHeader>
            <CardContent className='space-y-4'>
              <div className='flex items-center justify-between p-4 border rounded-lg'>
                <div>
                  <h4 className='font-medium'>Email Notifications</h4>
                  <p className='text-sm text-muted-foreground'>
                    Receive notifications about your account activity
                  </p>
                </div>
                <Button variant='outline' size='sm'>
                  Configure
                </Button>
              </div>

              <div className='flex items-center justify-between p-4 border rounded-lg'>
                <div>
                  <h4 className='font-medium'>Change Password</h4>
                  <p className='text-sm text-muted-foreground'>
                    Update your account password
                  </p>
                </div>
                <Button variant='outline' size='sm'>
                  Change
                </Button>
              </div>

              <div className='flex items-center justify-between p-4 border rounded-lg'>
                <div>
                  <h4 className='font-medium'>Two-Factor Authentication</h4>
                  <p className='text-sm text-muted-foreground'>
                    Add an extra layer of security to your account
                  </p>
                </div>
                <Button variant='outline' size='sm'>
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
