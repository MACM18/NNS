"use client";

import { useEffect, useState } from "react";
import { BellRing, BellOff, LoaderCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type PushConfig = { available: boolean; publicKey: string | null; activeDevices: number };

function decodeApplicationKey(value: string) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(padded + "=".repeat((4 - padded.length % 4) % 4));
  return Uint8Array.from(raw, (character) => character.charCodeAt(0));
}

export function BrowserPushSettings() {
  const [config, setConfig] = useState<PushConfig>({ available: false, publicKey: null, activeDevices: 0 });
  const [supported, setSupported] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("default");
  const [busy, setBusy] = useState(true);

  const refresh = async () => {
    const browserSupported = typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
    setSupported(browserSupported);
    if (!browserSupported) { setPermission("unsupported"); setBusy(false); return; }
    setPermission(Notification.permission);
    try {
      const response = await fetch("/api/push-subscriptions", { cache: "no-store" });
      if (!response.ok) throw new Error("Could not load browser notification settings.");
      const status = await response.json() as PushConfig;
      setConfig(status);
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      setEnabled(Boolean(subscription));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not load browser notification settings.");
    } finally { setBusy(false); }
  };

  useEffect(() => { void refresh(); }, []);

  const enable = async () => {
    setBusy(true);
    try {
      if (!config.available || !config.publicKey) throw new Error("Browser notifications are not configured by the administrator yet.");
      const result = await Notification.requestPermission();
      setPermission(result);
      if (result !== "granted") throw new Error(result === "denied" ? "Notifications are blocked in your browser settings." : "Notification permission was not granted.");
      const registration = await navigator.serviceWorker.ready;
      let subscription = await registration.pushManager.getSubscription();
      if (!subscription) subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: decodeApplicationKey(config.publicKey) });
      const response = await fetch("/api/push-subscriptions", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(subscription.toJSON()),
      });
      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        await subscription.unsubscribe();
        throw new Error(result.error || "Could not save this device's notification subscription.");
      }
      setEnabled(true);
      toast.success("Browser notifications are enabled on this device.");
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not enable browser notifications.");
    } finally { setBusy(false); }
  };

  const disable = async () => {
    setBusy(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        const response = await fetch("/api/push-subscriptions", {
          method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ endpoint: subscription.endpoint }),
        });
        if (!response.ok) throw new Error("Could not remove this device from notifications.");
        await subscription.unsubscribe();
      }
      setEnabled(false);
      toast.success("Browser notifications are disabled on this device.");
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not disable browser notifications.");
    } finally { setBusy(false); }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2"><BellRing className="h-4 w-4 text-primary" /> Browser push notifications</CardTitle>
        <CardDescription>Receive a private alert on this device when NNS has an update. Details stay inside your signed-in notification inbox.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm text-muted-foreground">
          {!supported ? "This browser does not support push notifications. On iPhone or iPad, install NNS to the Home Screen first." :
            !config.available ? "An administrator needs to add the VAPID push keys to the server settings." :
              enabled ? `Enabled on this device · ${config.activeDevices} device${config.activeDevices === 1 ? "" : "s"} connected` :
                permission === "denied" ? "Blocked by browser permissions. Allow notifications in browser settings, then try again." :
                  "This device is not subscribed yet. You can turn this on or off at any time."}
        </div>
        <Button type="button" variant={enabled ? "outline" : "default"} disabled={busy || !supported || !config.available} onClick={() => void (enabled ? disable() : enable())} className="shrink-0">
          {busy ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : enabled ? <BellOff className="mr-2 h-4 w-4" /> : <BellRing className="mr-2 h-4 w-4" />}
          {busy ? "Checking…" : enabled ? "Turn off on this device" : "Enable on this device"}
        </Button>
      </CardContent>
    </Card>
  );
}
