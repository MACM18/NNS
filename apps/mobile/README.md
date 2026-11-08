# NNS Enterprise Mobile

## Build configuration

The Android build reads these public values while bundling the app:

- `EXPO_PUBLIC_NNS_API_URL` — the production NNS site origin, for example `https://nns.example.com`.
- `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` — the Google OAuth **Web application** client ID.

Add both in Expo project settings for the **preview** environment. Use **Sensitive** or **Plain text** visibility, not **Secret**: `EXPO_PUBLIC_` values must be readable by the app bundler and are included in the installed app. The Android OAuth client ID is configured in Google Cloud Console using the package name `lk.nns.enterprise.mobile` and the SHA-1 certificate for the APK signing key; the native sign-in library does not read that ID from JavaScript.

The backend must have `GOOGLE_OAUTH_CLIENT_ID` set to the same Web application client ID. After changing either public value or native sign-in code, build a new APK:

```sh
npx eas-cli@latest build --platform android --profile preview
```

## Test the APK from a Mac without Android Studio

`adb` can install and control an APK, but it does not emulate Android. To use a physical Android phone, install only the platform tools:

```sh
brew install --cask android-platform-tools
adb version
```

Enable Developer options and USB debugging on the phone, connect it to the Mac, accept the debugging prompt, then install the downloaded APK:

```sh
adb devices
adb install -r ~/Downloads/nns-enterprise-mobile.apk
```

To run the app in a window on macOS, an Android emulator and Android system image are still required. These can be installed from Google's command-line SDK tools without installing Android Studio, but they are a separate, multi-gigabyte setup. Once an emulator is running, `adb devices` will list it and `adb install -r <apk-path>` installs the app there.
