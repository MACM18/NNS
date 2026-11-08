# NNS Enterprise Android

The native app is a separate Expo app in this repository. It currently focuses on the Daily Book and talks to the same NNS Enterprise deployment as the web app.

## Local setup

1. Copy `.env.example` to `.env.local` and set `EXPO_PUBLIC_NNS_API_URL` to the production or test NNS origin. Set the Google Android and web client IDs if Google sign-in is enabled for your users.
2. Run `npm install` in this directory.
3. Run `npx expo prebuild --platform android`, then `npm run android` on a machine with Android Studio/SDK installed. SQLCipher is required; Expo Go is not suitable for testing the encrypted offline database.

The Android app uses the existing credential accounts, TOTP/backup-code verification, and Google accounts. Native sessions use short-lived access tokens plus rotating refresh tokens. Server `.env` needs no new session secret; it reuses `AUTH_SECRET`. For Google sign-in, also set `GOOGLE_OAUTH_ANDROID_CLIENT_ID` to the Android OAuth client ID whose package and signing certificate match the APK. `GOOGLE_OAUTH_CLIENT_ID` remains the web client ID. The existing customer-data encryption key is used for server-side records.

## Signed internal APK

From `apps/mobile`, install the app dependencies and link this project to the organization’s Expo account:

```sh
npm install
npx eas-cli@latest login
npx eas-cli@latest init
```

Set `EXPO_PUBLIC_NNS_API_URL` to the production NNS origin in the EAS build environment. If Google sign-in is enabled, also set the Android and web OAuth client IDs from `.env.example`. These are build-time app settings; do not add server secrets or customer-data encryption keys to the mobile build.

Then create the installable internal APK:

```sh
npm run build:apk
```

The first EAS build may ask to create an Android signing key. Keep EAS credentials private; do not commit signing keys or `.env.local`. The build output includes a download link for the APK.

The offline database is SQLCipher-encrypted with a random key kept in Android Keystore through Expo SecureStore. If app data is restored without the device key, the app will require a fresh sign-in and will not attempt to read the cache as plaintext.
