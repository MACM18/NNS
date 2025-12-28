# PWA Quick Reference

## 🚀 Quick Start

### Check PWA Status

```bash
# Open DevTools → Application → Service Workers
# Check if service worker is registered and active
```

### Force Cache Update

```javascript
// Increment version in /public/sw.js
const CACHE_NAME = "nns-telecom-cache-v3"; // v2 → v3
```

### Clear All Caches

```javascript
// Run in browser console
caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k))));
```

---

## 📦 Files Structure

```
/public/
  ├── sw.js              # Service worker (caching logic)
  ├── offline.html       # Offline fallback page
  └── manifest.webmanifest (generated from /app/manifest.ts)

/app/
  ├── manifest.ts        # PWA manifest configuration
  └── layout.tsx         # Meta tags & PWA settings

/components/pwa/
  └── pwa-initializer.tsx  # Install prompt & updates
```

---

## 🎯 Common Tasks

### Add Route to Precache

**File:** `/public/sw.js`

```javascript
const PRECACHE_URLS = [
  "/",
  "/offline.html",
  "/dashboard",
  "/dashboard/new-route", // ← Add here
];
```

### Add App Shortcut

**File:** `/app/manifest.ts`

```typescript
shortcuts: [
  {
    name: "New Feature",
    url: "/dashboard/feature",
    icons: [{ src: "/icon.png", sizes: "192x192" }],
  },
];
```

### Customize Install Prompt

**File:** `/components/pwa/pwa-initializer.tsx`

```typescript
// Modify the install card UI around line 130
<h3 className='font-semibold text-sm mb-1'>Your Custom Message</h3>
```

---

## 🔍 Debugging

### View Cached Files

```javascript
// Chrome DevTools Console
caches
  .open("nns-static-v2")
  .then((cache) =>
    cache.keys().then((keys) => console.table(keys.map((k) => k.url)))
  );
```

### Test Offline

1. DevTools → Network → Offline
2. Navigate app
3. Check what works

### Force Service Worker Update

```javascript
navigator.serviceWorker
  .getRegistrations()
  .then((regs) => regs.forEach((r) => r.unregister()))
  .then(() => location.reload());
```

---

## 📊 Caching Strategies

| Route Type     | Strategy      | Cache            |
| -------------- | ------------- | ---------------- |
| `/api/*`       | Network First | `nns-api-v2`     |
| `/dashboard/*` | Network First | `nns-dynamic-v2` |
| `*.js, *.css`  | Cache First   | `nns-static-v2`  |
| Images         | Cache First   | `nns-static-v2`  |

---

## ⚡ Performance Tips

### 1. Minimize Precache

Only precache essential routes to keep install fast.

### 2. Use Stale-While-Revalidate

For non-critical assets:

```javascript
// Return cached version immediately
// Update cache in background
```

### 3. Set Cache Limits

```javascript
// Max 50 items in dynamic cache
if (cachedKeys.length > 50) {
  cache.delete(cachedKeys[0]);
}
```

---

## 🔔 Enable Push Notifications

### 1. Request Permission

```javascript
const permission = await Notification.requestPermission();
if (permission === "granted") {
  // Subscribe to push service
}
```

### 2. Subscribe User

```javascript
const registration = await navigator.serviceWorker.ready;
const subscription = await registration.pushManager.subscribe({
  userVisibleOnly: true,
  applicationServerKey: YOUR_VAPID_KEY,
});
```

### 3. Send From Server

```javascript
// Service worker already handles push events
// Just send from your backend
```

---

## 🧪 Testing Checklist

- [ ] Install on mobile device
- [ ] Test offline mode
- [ ] Verify update notifications
- [ ] Check dashboard routes work offline
- [ ] Test API fallback responses
- [ ] Verify icons display correctly
- [ ] Test shortcuts (long-press icon)
- [ ] Run Lighthouse audit (should pass PWA)

---

## 🛠️ Troubleshooting

### Install Button Not Showing

✅ Check: HTTPS enabled
✅ Check: Manifest valid
✅ Check: Service worker registered
✅ Check: Not already installed

### Pages Not Working Offline

✅ Check: Route in precache or visited before
✅ Check: Cache version matches
✅ Check: Network request going through SW

### Old Version Showing

✅ Increment cache version
✅ Unregister old service worker
✅ Hard reload (Ctrl+Shift+R)

---

## 🔗 Quick Links

- [Full Documentation](./PWA_IMPLEMENTATION.md)
- [Service Worker Code](/public/sw.js)
- [Manifest Config](/app/manifest.ts)
- [PWA Initializer](/components/pwa/pwa-initializer.tsx)

---

## 📱 Install Instructions for Users

### Desktop

1. Click install icon in address bar (⊕)
2. Or use in-app "Install App" button

### Android

1. Menu (⋮) → "Add to Home Screen"
2. Or use in-app install prompt

### iOS

1. Share button → "Add to Home Screen"
2. Name the app → Add

---

## 🎨 Customization

### Change Theme Colors

**File:** `/app/manifest.ts`

```typescript
background_color: "#0f172a",  // App background
theme_color: "#2563eb",       // Browser theme bar
```

### Change App Name

**File:** `/app/manifest.ts`

```typescript
name: "Your App Name",
short_name: "App",
```

### Change Start URL

**File:** `/app/manifest.ts`

```typescript
start_url: "/dashboard",  // Opens here when launched
```

---

**Version:** 2.0 | **Updated:** Dec 28, 2025
