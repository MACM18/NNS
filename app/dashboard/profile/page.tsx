"use client";

import { useCallback, useEffect, useState } from "react";
import QRCode from "qrcode";
import { Mail, Phone, MapPin, Calendar, Edit, Save, X, Camera, Trash2, Loader2, Smartphone, QrCode, RefreshCw, ShieldCheck, Clock } from "lucide-react";
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
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type PairingStatus = "waiting" | "scanned" | "connected" | "expired" | "cancelled";
type PairingRequest = { requestId: string; pairingUrl: string; expiresAt: string; image: string };
type MobileDevice = { id: string; deviceName: string | null; createdAt: string; lastUsedAt: string; expiresAt: string };

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
  const [pairingOpen, setPairingOpen] = useState(false);
  const [pairingBusy, setPairingBusy] = useState(false);
  const [pairingRequest, setPairingRequest] = useState<PairingRequest | null>(null);
  const [pairingStatus, setPairingStatus] = useState<PairingStatus | null>(null);
  const [pairingError, setPairingError] = useState("");
  const [mobileDevices, setMobileDevices] = useState<MobileDevice[]>([]);
  const [devicesLoading, setDevicesLoading] = useState(false);
  const [revokeTarget, setRevokeTarget] = useState<MobileDevice | null>(null);
  const [revoking, setRevoking] = useState(false);
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

  const loadMobileDevices = useCallback(async () => {
    if (!user?.id) return;
    setDevicesLoading(true);
    try {
      const response = await fetch("/api/profile/mobile-sessions", { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not load connected devices.");
      setMobileDevices(Array.isArray(result.sessions) ? result.sessions : []);
    } catch (error) {
      addNotification({ title: "Devices unavailable", message: error instanceof Error ? error.message : "Could not load connected devices.", type: "error", category: "system" });
    } finally { setDevicesLoading(false); }
  }, [user?.id, addNotification]);

  useEffect(() => { void loadMobileDevices(); }, [loadMobileDevices]);

  const createPairing = async () => {
    setPairingBusy(true);
    setPairingError("");
    setPairingRequest(null);
    setPairingStatus(null);
    try {
      const response = await fetch("/api/profile/mobile-pairing", { method: "POST", cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not create a sign-in QR code.");
      const image = await QRCode.toDataURL(result.pairingUrl, { width: 300, margin: 2, errorCorrectionLevel: "M" });
      setPairingRequest({ requestId: result.requestId, pairingUrl: result.pairingUrl, expiresAt: result.expiresAt, image });
      setPairingStatus("waiting");
    } catch (error) {
      setPairingError(error instanceof Error ? error.message : "Could not create a sign-in QR code.");
    } finally { setPairingBusy(false); }
  };

  const closePairing = (open: boolean) => {
    if (open) { setPairingOpen(true); return; }
    setPairingOpen(false);
    if (pairingRequest && pairingStatus !== "connected") {
      void fetch(`/api/profile/mobile-pairing/${pairingRequest.requestId}`, { method: "DELETE", keepalive: true }).catch(() => undefined);
    }
    setPairingRequest(null);
    setPairingStatus(null);
    setPairingError("");
  };

  useEffect(() => {
    if (!pairingOpen || !pairingRequest || pairingStatus === "connected" || pairingStatus === "expired" || pairingStatus === "cancelled") return;
    let stopped = false;
    const poll = async () => {
      try {
        const response = await fetch(`/api/profile/mobile-pairing/${pairingRequest.requestId}`, { cache: "no-store" });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Unable to check the QR status.");
        if (!stopped) setPairingStatus(result.status as PairingStatus);
        if (!stopped && result.status === "connected") void loadMobileDevices();
      } catch (error) {
        if (!stopped) setPairingError(error instanceof Error ? error.message : "Unable to check the QR status.");
      }
    };
    void poll();
    const timer = window.setInterval(() => void poll(), 1500);
    return () => { stopped = true; window.clearInterval(timer); };
  }, [pairingOpen, pairingRequest?.requestId, pairingStatus, loadMobileDevices]);

  const revokeMobileDevice = async () => {
    if (!revokeTarget) return;
    setRevoking(true);
    try {
      const response = await fetch("/api/profile/mobile-sessions", {
        method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sessionId: revokeTarget.id }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not revoke this device.");
      setMobileDevices((devices) => devices.filter((device) => device.id !== revokeTarget.id));
      setRevokeTarget(null);
      addNotification({ title: "Device disconnected", message: "Its mobile session has been revoked.", type: "success", category: "system" });
    } catch (error) {
      addNotification({ title: "Could not disconnect device", message: error instanceof Error ? error.message : "Please try again.", type: "error", category: "system" });
    } finally { setRevoking(false); }
  };

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
        <div className='mx-auto flex flex-col gap-6'>
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

          <Card>
            <CardHeader className="space-y-1.5 p-4 sm:p-5">
              <CardTitle className="flex items-center gap-2"><Smartphone className="h-5 w-5 text-primary" />Mobile app access</CardTitle>
              <CardDescription>Connect the NNS Android app by scanning a short-lived QR code. You approve the connection on the phone.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 px-4 pb-4 sm:px-5 sm:pb-5">
              <div className="flex flex-col justify-between gap-3 rounded-xl border bg-muted/30 p-4 sm:flex-row sm:items-center">
                <div className="flex items-start gap-3">
                  <div className="rounded-lg bg-primary/10 p-2 text-primary"><QrCode className="h-5 w-5" /></div>
                  <div>
                    <h3 className="font-medium">Connect a mobile device</h3>
                    <p className="text-sm text-muted-foreground">QR codes expire after two minutes and can be used once.</p>
                  </div>
                </div>
                <Button onClick={() => { setPairingOpen(true); void createPairing(); }}><QrCode className="mr-2 h-4 w-4" />Connect mobile app</Button>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <h3 className="font-medium">Connected devices</h3>
                  <Button variant="ghost" size="sm" onClick={() => void loadMobileDevices()} disabled={devicesLoading} aria-label="Refresh mobile devices">
                    {devicesLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}<span className="ml-2">Refresh</span>
                  </Button>
                </div>
                {devicesLoading && mobileDevices.length === 0 ? (
                  <div className="flex items-center gap-2 rounded-lg border p-4 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Loading devices…</div>
                ) : mobileDevices.length === 0 ? (
                  <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">No active mobile devices are connected to your account.</div>
                ) : (
                  <div className="space-y-2">
                    {mobileDevices.map((device) => (
                      <div key={device.id} className="flex flex-col justify-between gap-3 rounded-lg border p-3 sm:flex-row sm:items-center">
                        <div className="flex min-w-0 items-start gap-3">
                          <div className="rounded-lg bg-muted p-2"><Smartphone className="h-4 w-4" /></div>
                          <div className="min-w-0">
                            <p className="truncate font-medium">{device.deviceName || "NNS mobile device"}</p>
                            <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                              <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" />Last active {new Date(device.lastUsedAt).toLocaleString()}</span>
                              <span>Connected {new Date(device.createdAt).toLocaleDateString()}</span>
                            </p>
                          </div>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => setRevokeTarget(device)}><Trash2 className="mr-2 h-4 w-4" />Disconnect</Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Dialog open={pairingOpen} onOpenChange={closePairing}>
            <DialogContent className="w-[calc(100vw-2rem)] max-w-md p-5 sm:p-6">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2"><QrCode className="h-5 w-5 text-primary" />Connect mobile app</DialogTitle>
                <DialogDescription>Open NNS Enterprise on your phone, choose “Scan a website QR code”, then approve the account shown on your phone.</DialogDescription>
              </DialogHeader>
              <div className="flex flex-col items-center gap-4">
                {pairingRequest && pairingStatus !== "expired" && pairingStatus !== "cancelled" ? (
                  <div className="relative rounded-2xl border bg-white p-3 shadow-sm">
                    <img src={pairingRequest.image} alt="One-time NNS mobile sign-in QR code" className={`h-64 w-64 max-w-[70vw] object-contain ${pairingStatus === "connected" ? "opacity-30" : ""}`} />
                    {pairingStatus === "connected" && <div className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl bg-white/85 text-center"><ShieldCheck className="h-10 w-10 text-emerald-600" /><span className="mt-2 font-semibold text-emerald-700">Phone connected</span></div>}
                  </div>
                ) : pairingBusy ? (
                  <div className="flex h-64 w-64 flex-col items-center justify-center gap-3 rounded-2xl border bg-muted/30 text-sm text-muted-foreground"><Loader2 className="h-7 w-7 animate-spin" />Preparing your secure code…</div>
                ) : (
                  <div className="flex h-64 w-64 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed bg-muted/30 p-6 text-center">
                    {pairingStatus === "expired" ? <Clock className="h-8 w-8 text-amber-600" /> : <QrCode className="h-8 w-8 text-muted-foreground" />}
                    <p className="text-sm text-muted-foreground">{pairingError || (pairingStatus === "expired" ? "This QR code expired." : pairingStatus === "cancelled" ? "This connection request was cancelled." : "Create a QR code to connect this phone.")}</p>
                  </div>
                )}
                <div className="w-full rounded-lg bg-muted/40 px-4 py-3 text-center">
                  <p className="font-medium">
                    {pairingStatus === "waiting" ? "Waiting for phone to scan" : pairingStatus === "scanned" ? "Scanned · approve on your phone" : pairingStatus === "connected" ? "Mobile app connected" : pairingStatus === "expired" ? "QR code expired" : pairingStatus === "cancelled" ? "Connection cancelled" : "Secure mobile sign-in"}
                  </p>
                  {pairingRequest && pairingStatus !== "connected" && <p className="mt-1 text-xs text-muted-foreground">Expires {new Date(pairingRequest.expiresAt).toLocaleTimeString()}</p>}
                </div>
                {(pairingStatus === "expired" || pairingStatus === "cancelled" || !pairingRequest) && !pairingBusy && (
                  <Button className="w-full" onClick={() => void createPairing()}><RefreshCw className="mr-2 h-4 w-4" />Create a new QR code</Button>
                )}
                {pairingStatus === "connected" && <Button variant="outline" className="w-full" onClick={() => closePairing(false)}>Done</Button>}
              </div>
            </DialogContent>
          </Dialog>

          <AlertDialog open={!!revokeTarget} onOpenChange={(open) => { if (!open && !revoking) setRevokeTarget(null); }}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Disconnect this mobile device?</AlertDialogTitle>
                <AlertDialogDescription>{revokeTarget?.deviceName || "This device"} will be signed out and cannot access your account again unless you connect it again.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={revoking}>Keep connected</AlertDialogCancel>
                <AlertDialogAction disabled={revoking} onClick={(event) => { event.preventDefault(); void revokeMobileDevice(); }}>
                  {revoking && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Disconnect device
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}
    </div>
  );
}
