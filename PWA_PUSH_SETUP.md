# Browser push notifications

NNS already provides the installable app shell. Browser push needs a VAPID key pair and HTTPS (localhost is allowed for development).

1. Generate one key pair with `npx web-push generate-vapid-keys --json`.
2. Set `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, and `VAPID_SUBJECT` in the production app environment. Use a support email or the app's HTTPS URL for `VAPID_SUBJECT`.
3. Keep the same key pair across deployments. The public key is served to signed-in browsers; the private key must remain server-only.
4. Deploy the app. The normal startup migration creates the push-subscription table.
5. Each user enables notifications per device in **Settings → Notifications**. Browser permission must be granted. On iPhone and iPad, install NNS to the Home Screen before enabling push.

Subscriptions are tied to the signed-in account, encrypted in the database with `CUSTOMER_DATA_ENCRYPTION_KEY`, and can be removed from that device in Settings. Expired browser subscriptions are deleted automatically. Push text is generic so customer details do not appear on lock screens. Clicking an alert opens the relevant in-app page.

The service worker caches only same-origin static assets and a generic offline page. It never caches signed-in pages or API responses, which may contain customer or operational data.
