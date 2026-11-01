declare module "web-push" {
  type PushSubscription = {
    endpoint: string;
    expirationTime?: number | null;
    keys: { p256dh: string; auth: string };
  };

  type VapidDetails = { subject: string; publicKey: string; privateKey: string };

  const webpush: {
    setVapidDetails(subject: string, publicKey: string, privateKey: string): void;
    sendNotification(
      subscription: PushSubscription,
      payload?: string | Buffer | null,
      options?: { TTL?: number; urgency?: "very-low" | "low" | "normal" | "high" }
    ): Promise<unknown>;
    generateVAPIDKeys(): { publicKey: string; privateKey: string };
  };

  export = webpush;
}
