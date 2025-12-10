"use client";

import { useState, useEffect } from "react";
import { AuthWrapper } from "@/components/auth/auth-wrapper";
import { useAuth } from "@/contexts/auth-context";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  User,
  Building,
  Bell,
  Shield,
  Database,
  Palette,
  Download,
  Upload,
  Trash2,
  Save,
  Eye,
  EyeOff,
  Plus,
  CreditCard,
  Mail,
  Calendar,
  SettingsIcon,
} from "lucide-react";
import { useNotification } from "@/contexts/notification-context";
import { useTheme } from "next-themes";
import { PageSkeleton } from "@/components/skeletons/page-skeleton";

export default function SettingsPage() {
  const { user, profile, loading } = useAuth();
  const { addNotification } = useNotification();
  const { theme, setTheme } = useTheme();
  const [activeTab, setActiveTab] = useState("profile");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Profile form data
  const [profileData, setProfileData] = useState({
    full_name: "",
    phone: "",
    address: "",
    bio: "",
    avatar_url: "",
  });

  // Company settings data
  const [companyData, setCompanyData] = useState({
    company_name: "NNS Enterprise",
    address: "",
    contact_numbers: [""],
    website: "",
    registered_number: "",
    pricing_tiers: [
      { min_length: 0, max_length: 100, rate: 6000 },
      { min_length: 101, max_length: 200, rate: 6500 },
      { min_length: 201, max_length: 300, rate: 7200 },
      { min_length: 301, max_length: 400, rate: 7800 },
      { min_length: 401, max_length: 500, rate: 8200 },
      { min_length: 501, max_length: 999999, rate: 8400 },
    ],
    bank_details: {
      bank_name: "",
      account_title: "",
      account_number: "",
      branch_code: "",
      iban: "",
    },
  });

  // Notification preferences
  const [notificationSettings, setNotificationSettings] = useState({
    email_notifications: true,
    push_notifications: true,
    task_reminders: true,
    invoice_alerts: true,
    system_updates: false,
    marketing_emails: false,
  });

  // Security settings
  const [securitySettings, setSecuritySettings] = useState({
    two_factor_enabled: false,
    session_timeout: "30",
    login_alerts: true,
    password_expiry: "90",
  });

  useEffect(() => {
    if (profile) {
      setProfileData({
        full_name: profile.full_name || "",
        phone: profile.phone || "",
        address: profile.address || "",
        bio: profile.bio || "",
        avatar_url: profile.avatar_url || "",
      });
    }
  }, [profile]);

  useEffect(() => {
    fetchCompanySettings();
    fetchNotificationSettings();
    fetchSecuritySettings();
  }, []);

  const fetchCompanySettings = async () => {
    try {
      const response = await fetch("/api/settings/company");
      if (response.ok) {
        const result = await response.json();
        const data = result.data;
        if (data) {
          setCompanyData({
            company_name:
              typeof data.company_name === "string" &&
              data.company_name.trim() !== ""
                ? data.company_name
                : "NNS Enterprise",
            address: typeof data.address === "string" ? data.address : "",
            contact_numbers: Array.isArray(data.contact_numbers)
              ? (data.contact_numbers as string[])
              : [""],
            website: typeof data.website === "string" ? data.website : "",
            registered_number:
              typeof data.registered_number === "string"
                ? data.registered_number
                : "",
            pricing_tiers: Array.isArray(data.pricing_tiers)
              ? data.pricing_tiers
              : companyData.pricing_tiers,
            bank_details:
              data.bank_details &&
              typeof data.bank_details === "object" &&
              "bank_name" in data.bank_details &&
              "account_title" in data.bank_details &&
              "account_number" in data.bank_details &&
              "branch_code" in data.bank_details &&
              "iban" in data.bank_details
                ? {
                    bank_name: String(
                      (data.bank_details as any).bank_name ?? ""
                    ),
                    account_title: String(
                      (data.bank_details as any).account_title ?? ""
                    ),
                    account_number: String(
                      (data.bank_details as any).account_number ?? ""
                    ),
                    branch_code: String(
                      (data.bank_details as any).branch_code ?? ""
                    ),
                    iban: String((data.bank_details as any).iban ?? ""),
                  }
                : companyData.bank_details,
          });
        }
      }
    } catch (error) {
      console.error("Error fetching company settings:", error);
    }
  };

  const fetchNotificationSettings = async () => {
    // In a real app, you'd fetch from user preferences table
    // For now, using localStorage as fallback
    const saved = localStorage.getItem("notification_settings");
    if (saved) {
      setNotificationSettings(JSON.parse(saved));
    }
  };

  const fetchSecuritySettings = async () => {
    // In a real app, you'd fetch from user security settings table
    const saved = localStorage.getItem("security_settings");
    if (saved) {
      setSecuritySettings(JSON.parse(saved));
    }
  };

  const handleProfileUpdate = async () => {
    setIsLoading(true);
    try {
      if (!user?.id) {
        throw new Error("User ID is not available.");
      }
      const response = await fetch(`/api/profiles/${user.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: profileData.full_name,
          phone: profileData.phone,
          address: profileData.address,
          bio: profileData.bio,
          avatar_url: profileData.avatar_url,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update profile");
      }

      addNotification({
        title: "Profile Updated",
        message: "Your profile has been successfully updated.",
        type: "success",
        category: "system",
      });
    } catch (error: any) {
      addNotification({
        title: "Update Failed",
        message: error.message,
        type: "error",
        category: "system",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCompanyUpdate = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/settings/company", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(companyData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update company settings");
      }

      addNotification({
        title: "Company Settings Updated",
        message: "Company settings have been successfully updated.",
        type: "success",
        category: "system",
      });
    } catch (error: any) {
      addNotification({
        title: "Update Failed",
        message: error.message,
        type: "error",
        category: "system",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleNotificationUpdate = () => {
    localStorage.setItem(
      "notification_settings",
      JSON.stringify(notificationSettings)
    );
    addNotification({
      title: "Preferences Updated",
      message: "Notification preferences have been saved.",
      type: "success",
      category: "system",
    });
  };

  const handleSecurityUpdate = () => {
    localStorage.setItem("security_settings", JSON.stringify(securitySettings));
    addNotification({
      title: "Security Settings Updated",
      message: "Security settings have been saved.",
      type: "success",
      category: "system",
    });
  };

  const addContactNumber = () => {
    setCompanyData((prev) => ({
      ...prev,
      contact_numbers: [...prev.contact_numbers, ""],
    }));
  };

  const removeContactNumber = (index: number) => {
    if (companyData.contact_numbers.length > 1) {
      setCompanyData((prev) => ({
        ...prev,
        contact_numbers: prev.contact_numbers.filter((_, i) => i !== index),
      }));
    }
  };

  const updateContactNumber = (index: number, value: string) => {
    setCompanyData((prev) => ({
      ...prev,
      contact_numbers: prev.contact_numbers.map((num, i) =>
        i === index ? value : num
      ),
    }));
  };

  const handlePricingTierChange = (
    index: number,
    field: string,
    value: number
  ) => {
    setCompanyData((prev) => ({
      ...prev,
      pricing_tiers: prev.pricing_tiers.map((tier, i) =>
        i === index ? { ...tier, [field]: value } : tier
      ),
    }));
  };

  const handleBankDetailsChange = (field: string, value: string) => {
    setCompanyData((prev) => ({
      ...prev,
      bank_details: { ...prev.bank_details, [field]: value },
    }));
  };

  if (!user && !loading) {
    return <AuthWrapper />;
  }

  return (
    <div className='space-y-6'>
      {loading ? (
        <PageSkeleton />
      ) : (
        <div className='space-y-6'>
          <div className='flex flex-col sm:flex-row items-start sm:items-center gap-4'>
            <SettingsIcon className='h-8 w-8' />
            <div>
              <h1 className='text-3xl font-bold'>Settings</h1>
              <p className='text-muted-foreground'>
                Manage your account and application preferences
              </p>
            </div>
          </div>

          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className='space-y-6'
          >
            <TabsList className='grid w-full grid-cols-6'>
              <TabsTrigger value='profile' className='flex items-center gap-2'>
                <User className='h-4 w-4' />
                Profile
              </TabsTrigger>
              <TabsTrigger value='company' className='flex items-center gap-2'>
                <Building className='h-4 w-4' />
                Company
              </TabsTrigger>
              <TabsTrigger
                value='notifications'
                className='flex items-center gap-2'
              >
                <Bell className='h-4 w-4' />
                Notifications
              </TabsTrigger>
              <TabsTrigger value='security' className='flex items-center gap-2'>
                <Shield className='h-4 w-4' />
                Security
              </TabsTrigger>
              <TabsTrigger
                value='appearance'
                className='flex items-center gap-2'
              >
                <Palette className='h-4 w-4' />
                Appearance
              </TabsTrigger>
              <TabsTrigger value='data' className='flex items-center gap-2'>
                <Database className='h-4 w-4' />
                Data
              </TabsTrigger>
            </TabsList>

            {/* Profile Settings */}
            <TabsContent value='profile' className='space-y-6'>
              <Card>
                <CardHeader>
                  <CardTitle>Profile Information</CardTitle>
                  <CardDescription>
                    Update your personal information and contact details
                  </CardDescription>
                </CardHeader>
                <CardContent className='space-y-6'>
                  {/* <div className='flex items-center gap-6'>
                    <Avatar className='h-24 w-24'>
                      <AvatarImage
                        src={profileData.avatar_url || "/placeholder.svg"}
                      />
                      <AvatarFallback className='text-lg'>
                        {profileData.full_name?.charAt(0) ||
                          user?.email?.charAt(0) ||
                          "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div className='space-y-2'>
                      <Button variant='outline' size='sm'>
                        <Upload className='h-4 w-4 mr-2' />
                        Upload Photo
                      </Button>
                      <p className='text-sm text-muted-foreground'>
                        JPG, PNG or GIF. Max size 2MB.
                      </p>
                    </div>
                  </div> */}

                  <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                    <div className='space-y-2'>
                      <Label htmlFor='full_name'>Full Name</Label>
                      <Input
                        id='full_name'
                        value={profileData.full_name}
                        onChange={(e) =>
                          setProfileData({
                            ...profileData,
                            full_name: e.target.value,
                          })
                        }
                        placeholder='Enter your full name'
                      />
                    </div>

                    <div className='space-y-2'>
                      <Label htmlFor='email'>Email Address</Label>
                      <Input
                        id='email'
                        value={user?.email || ""}
                        disabled
                        className='bg-muted'
                      />
                    </div>

                    <div className='space-y-2'>
                      <Label htmlFor='phone'>Phone Number</Label>
                      <Input
                        id='phone'
                        value={profileData.phone}
                        onChange={(e) =>
                          setProfileData({
                            ...profileData,
                            phone: e.target.value,
                          })
                        }
                        placeholder='Enter your phone number'
                      />
                    </div>

                    <div className='space-y-2'>
                      <Label htmlFor='address'>Address</Label>
                      <Input
                        id='address'
                        value={profileData.address}
                        onChange={(e) =>
                          setProfileData({
                            ...profileData,
                            address: e.target.value,
                          })
                        }
                        placeholder='Enter your address'
                      />
                    </div>
                  </div>

                  <div className='space-y-2'>
                    <Label htmlFor='bio'>Bio</Label>
                    <Textarea
                      id='bio'
                      value={profileData.bio}
                      onChange={(e) =>
                        setProfileData({
                          ...profileData,
                          bio: e.target.value,
                        })
                      }
                      placeholder='Tell us about yourself'
                      rows={4}
                    />
                  </div>

                  <div className='flex justify-end'>
                    <Button onClick={handleProfileUpdate} disabled={isLoading}>
                      <Save className='h-4 w-4 mr-2' />
                      {isLoading ? "Saving..." : "Save Changes"}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Account Information</CardTitle>
                  <CardDescription>
                    View your account details and status
                  </CardDescription>
                </CardHeader>
                <CardContent className='space-y-4'>
                  <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                    <div className='flex items-center gap-2'>
                      <Mail className='h-4 w-4 text-muted-foreground' />
                      <span className='text-sm'>{user?.email}</span>
                      <Badge variant='secondary'>Verified</Badge>
                    </div>
                    <div className='flex items-center gap-2'>
                      <Calendar className='h-4 w-4 text-muted-foreground' />
                      <span className='text-sm'>
                        Joined{" "}
                        {new Date(
                          (user as any)?.createdAt || ""
                        ).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Company Settings */}
            <TabsContent value='company' className='space-y-6'>
              <Card>
                <CardHeader>
                  <CardTitle className='flex items-center gap-2'>
                    <Building className='h-5 w-5' />
                    Company Information
                  </CardTitle>
                  <CardDescription>
                    Configure company details for invoices and documents
                  </CardDescription>
                </CardHeader>
                <CardContent className='space-y-4'>
                  <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                    <div>
                      <Label htmlFor='company_name'>Company Name</Label>
                      <Input
                        id='company_name'
                        value={companyData.company_name}
                        onChange={(e) =>
                          setCompanyData({
                            ...companyData,
                            company_name: e.target.value,
                          })
                        }
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor='registered_number'>
                        Registered Number
                      </Label>
                      <Input
                        id='registered_number'
                        value={companyData.registered_number}
                        onChange={(e) =>
                          setCompanyData({
                            ...companyData,
                            registered_number: e.target.value,
                          })
                        }
                        placeholder='Company registration number'
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor='company_address'>Address</Label>
                    <Textarea
                      id='company_address'
                      value={companyData.address}
                      onChange={(e) =>
                        setCompanyData({
                          ...companyData,
                          address: e.target.value,
                        })
                      }
                      placeholder='Complete company address'
                      rows={3}
                    />
                  </div>

                  <div>
                    <Label htmlFor='website'>Website</Label>
                    <Input
                      id='website'
                      value={companyData.website}
                      onChange={(e) =>
                        setCompanyData({
                          ...companyData,
                          website: e.target.value,
                        })
                      }
                      placeholder='https://www.company.com'
                    />
                  </div>

                  <div>
                    <div className='flex items-center justify-between'>
                      <Label>Contact Numbers</Label>
                      <Button
                        type='button'
                        onClick={addContactNumber}
                        size='sm'
                        variant='outline'
                        className='gap-2'
                      >
                        <Plus className='h-4 w-4' />
                        Add Number
                      </Button>
                    </div>
                    <div className='space-y-2 mt-2'>
                      {companyData.contact_numbers.map((number, index) => (
                        <div key={index} className='flex gap-2'>
                          <Input
                            value={number}
                            onChange={(e) =>
                              updateContactNumber(index, e.target.value)
                            }
                            placeholder='Contact number'
                          />
                          <Button
                            type='button'
                            onClick={() => removeContactNumber(index)}
                            size='sm'
                            variant='outline'
                            disabled={companyData.contact_numbers.length === 1}
                          >
                            <Trash2 className='h-4 w-4' />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className='flex justify-end'>
                    <Button onClick={handleCompanyUpdate} disabled={isLoading}>
                      <Save className='h-4 w-4 mr-2' />
                      {isLoading ? "Saving..." : "Save Company Info"}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Pricing Tiers</CardTitle>
                  <CardDescription>
                    Configure pricing based on cable length
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className='space-y-4'>
                    {companyData.pricing_tiers.map((tier, index) => (
                      <div
                        key={index}
                        className='grid grid-cols-4 gap-4 items-end'
                      >
                        <div>
                          <Label>Min Length (m)</Label>
                          <Input
                            type='number'
                            value={tier.min_length}
                            onChange={(e) =>
                              handlePricingTierChange(
                                index,
                                "min_length",
                                Number.parseInt(e.target.value) || 0
                              )
                            }
                          />
                        </div>
                        <div>
                          <Label>Max Length (m)</Label>
                          <Input
                            type='number'
                            value={
                              tier.max_length === 999999 ? "" : tier.max_length
                            }
                            onChange={(e) =>
                              handlePricingTierChange(
                                index,
                                "max_length",
                                e.target.value
                                  ? Number.parseInt(e.target.value)
                                  : 999999
                              )
                            }
                            placeholder='500+ (leave empty)'
                          />
                        </div>
                        <div>
                          <Label>Rate (LKR)</Label>
                          <Input
                            type='number'
                            value={tier.rate}
                            onChange={(e) =>
                              handlePricingTierChange(
                                index,
                                "rate",
                                Number.parseInt(e.target.value) || 0
                              )
                            }
                          />
                        </div>
                        <div className='text-sm text-muted-foreground'>
                          {tier.min_length}–
                          {tier.max_length === 999999
                            ? "500+"
                            : tier.max_length}
                          m: LKR {tier.rate}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className='flex items-center gap-2'>
                    <CreditCard className='h-5 w-5' />
                    Bank Details
                  </CardTitle>
                  <CardDescription>
                    Configure bank information for invoices
                  </CardDescription>
                </CardHeader>
                <CardContent className='space-y-4'>
                  <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                    <div>
                      <Label htmlFor='bank_name'>Bank Name</Label>
                      <Input
                        id='bank_name'
                        value={companyData.bank_details.bank_name}
                        onChange={(e) =>
                          handleBankDetailsChange("bank_name", e.target.value)
                        }
                        placeholder='e.g., Sampath Bank PLC'
                      />
                    </div>
                    <div>
                      <Label htmlFor='account_title'>Account Title</Label>
                      <Input
                        id='account_title'
                        value={companyData.bank_details.account_title}
                        onChange={(e) =>
                          handleBankDetailsChange(
                            "account_title",
                            e.target.value
                          )
                        }
                        placeholder='Account holder name'
                      />
                    </div>
                    <div>
                      <Label htmlFor='account_number'>Account Number</Label>
                      <Input
                        id='account_number'
                        value={companyData.bank_details.account_number}
                        onChange={(e) =>
                          handleBankDetailsChange(
                            "account_number",
                            e.target.value
                          )
                        }
                        placeholder='Bank account number'
                      />
                    </div>
                    <div>
                      <Label htmlFor='branch_code'>Branch Code</Label>
                      <Input
                        id='branch_code'
                        value={companyData.bank_details.branch_code}
                        onChange={(e) =>
                          handleBankDetailsChange("branch_code", e.target.value)
                        }
                        placeholder='Branch code'
                      />
                    </div>
                    <div className='md:col-span-2'>
                      <Label htmlFor='iban'>IBAN</Label>
                      <Input
                        id='iban'
                        value={companyData.bank_details.iban}
                        onChange={(e) =>
                          handleBankDetailsChange("iban", e.target.value)
                        }
                        placeholder='PK36SCBL0000001123456702'
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Notification Settings */}
            <TabsContent value='notifications' className='space-y-6'>
              <Card>
                <CardHeader>
                  <CardTitle>Notification Preferences</CardTitle>
                  <CardDescription>
                    Choose how you want to be notified about updates and
                    activities
                  </CardDescription>
                </CardHeader>
                <CardContent className='space-y-6'>
                  <div className='space-y-4'>
                    <div className='flex items-center justify-between'>
                      <div className='space-y-0.5'>
                        <Label>Email Notifications</Label>
                        <p className='text-sm text-muted-foreground'>
                          Receive notifications via email
                        </p>
                      </div>
                      <Switch
                        checked={notificationSettings.email_notifications}
                        onCheckedChange={(checked) =>
                          setNotificationSettings({
                            ...notificationSettings,
                            email_notifications: checked,
                          })
                        }
                      />
                    </div>

                    <div className='flex items-center justify-between'>
                      <div className='space-y-0.5'>
                        <Label>Push Notifications</Label>
                        <p className='text-sm text-muted-foreground'>
                          Receive push notifications in browser
                        </p>
                      </div>
                      <Switch
                        checked={notificationSettings.push_notifications}
                        onCheckedChange={(checked) =>
                          setNotificationSettings({
                            ...notificationSettings,
                            push_notifications: checked,
                          })
                        }
                      />
                    </div>

                    <div className='flex items-center justify-between'>
                      <div className='space-y-0.5'>
                        <Label>Task Reminders</Label>
                        <p className='text-sm text-muted-foreground'>
                          Get reminded about pending tasks
                        </p>
                      </div>
                      <Switch
                        checked={notificationSettings.task_reminders}
                        onCheckedChange={(checked) =>
                          setNotificationSettings({
                            ...notificationSettings,
                            task_reminders: checked,
                          })
                        }
                      />
                    </div>

                    <div className='flex items-center justify-between'>
                      <div className='space-y-0.5'>
                        <Label>Invoice Alerts</Label>
                        <p className='text-sm text-muted-foreground'>
                          Notifications about invoice generation and payments
                        </p>
                      </div>
                      <Switch
                        checked={notificationSettings.invoice_alerts}
                        onCheckedChange={(checked) =>
                          setNotificationSettings({
                            ...notificationSettings,
                            invoice_alerts: checked,
                          })
                        }
                      />
                    </div>

                    <div className='flex items-center justify-between'>
                      <div className='space-y-0.5'>
                        <Label>System Updates</Label>
                        <p className='text-sm text-muted-foreground'>
                          Notifications about system maintenance and updates
                        </p>
                      </div>
                      <Switch
                        checked={notificationSettings.system_updates}
                        onCheckedChange={(checked) =>
                          setNotificationSettings({
                            ...notificationSettings,
                            system_updates: checked,
                          })
                        }
                      />
                    </div>

                    <div className='flex items-center justify-between'>
                      <div className='space-y-0.5'>
                        <Label>Marketing Emails</Label>
                        <p className='text-sm text-muted-foreground'>
                          Receive promotional emails and newsletters
                        </p>
                      </div>
                      <Switch
                        checked={notificationSettings.marketing_emails}
                        onCheckedChange={(checked) =>
                          setNotificationSettings({
                            ...notificationSettings,
                            marketing_emails: checked,
                          })
                        }
                      />
                    </div>
                  </div>

                  <div className='flex justify-end'>
                    <Button onClick={handleNotificationUpdate}>
                      <Save className='h-4 w-4 mr-2' />
                      Save Preferences
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Security Settings */}
            <TabsContent value='security' className='space-y-6'>
              <Card>
                <CardHeader>
                  <CardTitle>Password & Authentication</CardTitle>
                  <CardDescription>
                    Manage your password and authentication settings
                  </CardDescription>
                </CardHeader>
                <CardContent className='space-y-4'>
                  <div className='space-y-4'>
                    <div>
                      <Label htmlFor='current_password'>Current Password</Label>
                      <div className='relative'>
                        <Input
                          id='current_password'
                          type={showPassword ? "text" : "password"}
                          placeholder='Enter current password'
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
                    </div>

                    <div>
                      <Label htmlFor='new_password'>New Password</Label>
                      <Input
                        id='new_password'
                        type='password'
                        placeholder='Enter new password'
                      />
                    </div>

                    <div>
                      <Label htmlFor='confirm_password'>
                        Confirm New Password
                      </Label>
                      <Input
                        id='confirm_password'
                        type='password'
                        placeholder='Confirm new password'
                      />
                    </div>

                    <Button>Update Password</Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Security Preferences</CardTitle>
                  <CardDescription>
                    Configure additional security settings
                  </CardDescription>
                </CardHeader>
                <CardContent className='space-y-6'>
                  <div className='flex items-center justify-between'>
                    <div className='space-y-0.5'>
                      <Label>Two-Factor Authentication</Label>
                      <p className='text-sm text-muted-foreground'>
                        Add an extra layer of security to your account
                      </p>
                    </div>
                    <Switch
                      checked={securitySettings.two_factor_enabled}
                      onCheckedChange={(checked) =>
                        setSecuritySettings({
                          ...securitySettings,
                          two_factor_enabled: checked,
                        })
                      }
                    />
                  </div>

                  <div className='flex items-center justify-between'>
                    <div className='space-y-0.5'>
                      <Label>Login Alerts</Label>
                      <p className='text-sm text-muted-foreground'>
                        Get notified when someone logs into your account
                      </p>
                    </div>
                    <Switch
                      checked={securitySettings.login_alerts}
                      onCheckedChange={(checked) =>
                        setSecuritySettings({
                          ...securitySettings,
                          login_alerts: checked,
                        })
                      }
                    />
                  </div>

                  <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                    <div>
                      <Label htmlFor='session_timeout'>
                        Session Timeout (minutes)
                      </Label>
                      <Select
                        value={securitySettings.session_timeout}
                        onValueChange={(value) =>
                          setSecuritySettings({
                            ...securitySettings,
                            session_timeout: value,
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value='15'>15 minutes</SelectItem>
                          <SelectItem value='30'>30 minutes</SelectItem>
                          <SelectItem value='60'>1 hour</SelectItem>
                          <SelectItem value='120'>2 hours</SelectItem>
                          <SelectItem value='480'>8 hours</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor='password_expiry'>
                        Password Expiry (days)
                      </Label>
                      <Select
                        value={securitySettings.password_expiry}
                        onValueChange={(value) =>
                          setSecuritySettings({
                            ...securitySettings,
                            password_expiry: value,
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value='30'>30 days</SelectItem>
                          <SelectItem value='60'>60 days</SelectItem>
                          <SelectItem value='90'>90 days</SelectItem>
                          <SelectItem value='180'>180 days</SelectItem>
                          <SelectItem value='365'>1 year</SelectItem>
                          <SelectItem value='0'>Never</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className='flex justify-end'>
                    <Button onClick={handleSecurityUpdate}>
                      <Save className='h-4 w-4 mr-2' />
                      Save Security Settings
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Appearance Settings */}
            <TabsContent value='appearance' className='space-y-6'>
              <Card>
                <CardHeader>
                  <CardTitle>Theme Preferences</CardTitle>
                  <CardDescription>
                    Customize the appearance of your dashboard
                  </CardDescription>
                </CardHeader>
                <CardContent className='space-y-4'>
                  <div>
                    <Label htmlFor='theme'>Theme</Label>
                    <Select value={theme} onValueChange={setTheme}>
                      <SelectTrigger className='w-full'>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value='light'>Light</SelectItem>
                        <SelectItem value='dark'>Dark</SelectItem>
                        <SelectItem value='system'>System</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Language</Label>
                    <Select defaultValue='en'>
                      <SelectTrigger className='w-full'>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value='en'>English</SelectItem>
                        <SelectItem value='si'>Sinhala</SelectItem>
                        <SelectItem value='ta'>Tamil</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Date Format</Label>
                    <Select defaultValue='dd/mm/yyyy'>
                      <SelectTrigger className='w-full'>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value='dd/mm/yyyy'>DD/MM/YYYY</SelectItem>
                        <SelectItem value='mm/dd/yyyy'>MM/DD/YYYY</SelectItem>
                        <SelectItem value='yyyy-mm-dd'>YYYY-MM-DD</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Currency</Label>
                    <Select defaultValue='lkr'>
                      <SelectTrigger className='w-full'>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value='lkr'>
                          Sri Lankan Rupee (LKR)
                        </SelectItem>
                        <SelectItem value='usd'>US Dollar (USD)</SelectItem>
                        <SelectItem value='eur'>Euro (EUR)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Data Management */}
            <TabsContent value='data' className='space-y-6'>
              <Card>
                <CardHeader>
                  <CardTitle>Data Export & Import</CardTitle>
                  <CardDescription>
                    Manage your data exports and imports
                  </CardDescription>
                </CardHeader>
                <CardContent className='space-y-4'>
                  <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                    <Button variant='outline' className='h-20 flex-col gap-2'>
                      <Download className='h-6 w-6' />
                      Export All Data
                    </Button>
                    <Button variant='outline' className='h-20 flex-col gap-2'>
                      <Upload className='h-6 w-6' />
                      Import Data
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Data Cleanup</CardTitle>
                  <CardDescription>
                    Manage and cleanup your data
                  </CardDescription>
                </CardHeader>
                <CardContent className='space-y-4'>
                  <div className='space-y-4'>
                    <div className='flex items-center justify-between p-4 border rounded-lg'>
                      <div>
                        <h4 className='font-medium'>Clear Cache</h4>
                        <p className='text-sm text-muted-foreground'>
                          Clear application cache and temporary files
                        </p>
                      </div>
                      <Button variant='outline' size='sm'>
                        Clear Cache
                      </Button>
                    </div>

                    <div className='flex items-center justify-between p-4 border rounded-lg'>
                      <div>
                        <h4 className='font-medium'>Archive Old Data</h4>
                        <p className='text-sm text-muted-foreground'>
                          Archive data older than 2 years
                        </p>
                      </div>
                      <Button variant='outline' size='sm'>
                        Archive Data
                      </Button>
                    </div>

                    <div className='flex items-center justify-between p-4 border rounded-lg border-destructive'>
                      <div>
                        <h4 className='font-medium text-destructive'>
                          Delete All Data
                        </h4>
                        <p className='text-sm text-muted-foreground'>
                          Permanently delete all your data. This action cannot
                          be undone.
                        </p>
                      </div>
                      <Button variant='destructive' size='sm'>
                        <Trash2 className='h-4 w-4 mr-2' />
                        Delete All
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  );
}
