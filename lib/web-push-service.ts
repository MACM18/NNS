import "server-only";
import { customerDataExactLookup } from "@/lib/customer-data-encryption";
import { prisma } from "@/lib/prisma";
import webpush from "web-push";

type PushMessage = { title?: string; message?: string; actionUrl?: string | null };

function vapidConfiguration() {
  const publicKey = process.env.VAPID_PUBLIC_KEY?.trim();
  const privateKey = process.env.VAPID_PRIVATE_KEY?.trim();
  const subject = process.env.VAPID_SUBJECT?.trim();
  if (!publicKey || !privateKey || !subject || !/^(mailto:|https:\/\/)/i.test(subject)) return null;
  return { publicKey, privateKey, subject };
}

export function publicPushConfiguration() {
  const config = vapidConfiguration();
  return { available: Boolean(config), publicKey: config?.publicKey || null };
}

export async function deliverWebPush(userId: string, message: PushMessage) {
  const config = vapidConfiguration();
  if (!config) return { sent: 0, removed: 0, disabled: true };

  const subscriptions = await prisma.webPushSubscription.findMany({ where: { userId } });
  if (!subscriptions.length) return { sent: 0, removed: 0, disabled: false };

  webpush.setVapidDetails(config.subject, config.publicKey, config.privateKey);
  // Keep customer and operational details out of lock-screen notifications.
  const payload = JSON.stringify({
    body: "You have a new update. Open NNS to view the details.",
    url: message.actionUrl && message.actionUrl.startsWith("/") && !message.actionUrl.startsWith("//")
      ? message.actionUrl
      : "/dashboard/notifications",
  });

  let sent = 0;
  let removed = 0;
  await Promise.all(subscriptions.map(async (subscription) => {
    try {
      await webpush.sendNotification({
        endpoint: subscription.endpoint,
        keys: { p256dh: subscription.p256dh, auth: subscription.auth },
        expirationTime: subscription.expirationTime?.getTime() ?? null,
      }, payload, { TTL: 3600 });
      sent += 1;
    } catch (error) {
      const statusCode = Number((error as { statusCode?: number })?.statusCode);
      if (statusCode === 404 || statusCode === 410) {
        await prisma.webPushSubscription.deleteMany({ where: { id: subscription.id, userId } });
        removed += 1;
        return;
      }
      // Do not log the endpoint, keys, or notification content.
      console.warn("[web-push] Delivery failed", { statusCode: statusCode || "unknown" });
    }
  }));

  return { sent, removed, disabled: false };
}

export async function saveWebPushSubscription(userId: string, input: unknown) {
  if (!input || typeof input !== "object") throw new Error("Invalid push subscription.");
  const subscription = input as { endpoint?: unknown; expirationTime?: unknown; keys?: { p256dh?: unknown; auth?: unknown } };
  if (typeof subscription.endpoint !== "string" || subscription.endpoint.length > 4096) throw new Error("Invalid push endpoint.");
  let endpointUrl: URL;
  try { endpointUrl = new URL(subscription.endpoint); } catch { throw new Error("Invalid push endpoint."); }
  if (endpointUrl.protocol !== "https:" || !isSupportedPushHost(endpointUrl.hostname)) throw new Error("This browser's push service is not supported.");
  if (typeof subscription.keys?.p256dh !== "string" || typeof subscription.keys?.auth !== "string" || subscription.keys.p256dh.length > 256 || subscription.keys.auth.length > 256) {
    throw new Error("Invalid push encryption keys.");
  }
  const publicKeyBytes = Buffer.from(subscription.keys.p256dh, "base64url");
  const authSecretBytes = Buffer.from(subscription.keys.auth, "base64url");
  if (publicKeyBytes.length !== 65 || authSecretBytes.length < 16 || authSecretBytes.length > 32) {
    throw new Error("Invalid push encryption keys.");
  }
  const expirationTime = typeof subscription.expirationTime === "number" && Number.isFinite(subscription.expirationTime)
    ? new Date(subscription.expirationTime)
    : null;
  if (expirationTime && !Number.isFinite(expirationTime.getTime())) throw new Error("Invalid push subscription expiry.");
  return prisma.webPushSubscription.upsert({
    where: { endpointHash: customerDataExactLookup(subscription.endpoint) },
    create: {
      userId,
      endpoint: subscription.endpoint,
      endpointHash: customerDataExactLookup(subscription.endpoint),
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
      expirationTime,
    },
    update: { userId, endpoint: subscription.endpoint, p256dh: subscription.keys.p256dh, auth: subscription.keys.auth, expirationTime },
    select: { id: true },
  });
}

function isSupportedPushHost(hostname: string) {
  const host = hostname.toLowerCase();
  return host === "fcm.googleapis.com" || host.endsWith(".push.services.mozilla.com") ||
    host === "push.services.mozilla.com" || host === "web.push.apple.com" ||
    host.endsWith(".notify.windows.com");
}

export async function removeWebPushSubscription(userId: string, endpoint: string) {
  if (typeof endpoint !== "string" || endpoint.length > 4096) return;
  await prisma.webPushSubscription.deleteMany({
    where: { userId, endpointHash: customerDataExactLookup(endpoint) },
  });
}
