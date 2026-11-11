import * as SecureStore from "expo-secure-store";
import type { AppUser } from "./types";

// Clear the user-editable host saved by older app builds. The app now connects
// only to the deployment baked into the signed build.
const LEGACY_API_URL_KEY = "nns-mobile-api-origin-v1";
const ACCESS_KEY = "nns-mobile-access-v1";
const REFRESH_KEY = "nns-mobile-refresh-v1";
const USER_KEY = "nns-mobile-user-v1";
const DEFAULT_API_URL = process.env.EXPO_PUBLIC_NNS_API_URL || "";

export type NativeSession = { user: AppUser; accessToken: string; refreshToken: string };

let clearLegacyOrigin: Promise<void> | null = null;
export async function getApiOrigin() {
  if (!clearLegacyOrigin) clearLegacyOrigin = SecureStore.deleteItemAsync(LEGACY_API_URL_KEY).catch(() => undefined);
  await clearLegacyOrigin;
  return DEFAULT_API_URL.replace(/\/$/, "");
}

export async function readApiJson(response: Response, operation = "NNS") {
  const text = await response.text();
  if (!text.trim()) return {};
  try {
    return JSON.parse(text);
  } catch {
    if (response.status === 404 || response.status === 405) {
      throw new Error(`The ${operation} service is unavailable. Update the app or contact your administrator.`);
    }
    if (response.status >= 500) {
      throw new Error(`The ${operation} service is temporarily unavailable. Try again shortly.`);
    }
    throw new Error(`The server returned an unexpected response during ${operation}. Please try again or contact your administrator.`);
  }
}

async function fetchWithDeadline(url: string, init: RequestInit, timeoutMs: number, operation: string) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    // Android's native fetch may report AbortController timeouts as a cancelled
    // request, even while the server is still processing it. Keep the deadline
    // on the JS side so a slow request does not get cancelled by the app.
    return await Promise.race([
      fetch(url, init),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          const error = new Error(`${operation} timed out`);
          error.name = "NnsRequestTimeout";
          reject(error);
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function isNetworkFailure(error: unknown) {
  return error instanceof TypeError || (error instanceof Error && /network|fetch|cancel|abort/i.test(error.message));
}

function missingApiMessage() {
  return "App setup is incomplete. Please install the latest NNS Enterprise app or contact your administrator.";
}

export async function getSavedSession(): Promise<NativeSession | null> {
  const [accessToken, refreshToken, userRaw] = await Promise.all([
    SecureStore.getItemAsync(ACCESS_KEY), SecureStore.getItemAsync(REFRESH_KEY), SecureStore.getItemAsync(USER_KEY),
  ]);
  if (!accessToken || !refreshToken || !userRaw) return null;
  try { return { accessToken, refreshToken, user: JSON.parse(userRaw) as AppUser }; } catch { return null; }
}

export async function saveSession(value: NativeSession) {
  await Promise.all([
    SecureStore.setItemAsync(ACCESS_KEY, value.accessToken),
    SecureStore.setItemAsync(REFRESH_KEY, value.refreshToken),
    SecureStore.setItemAsync(USER_KEY, JSON.stringify(value.user)),
  ]);
}

export async function clearSession() {
  await Promise.all([ACCESS_KEY, REFRESH_KEY, USER_KEY].map((key) => SecureStore.deleteItemAsync(key)));
}

let refreshInFlight: Promise<NativeSession | null> | null = null;

async function refreshSession() {
  if (refreshInFlight) return refreshInFlight;
  refreshInFlight = (async () => {
    const [origin, session] = await Promise.all([getApiOrigin(), getSavedSession()]);
    if (!origin || !session?.refreshToken) return null;
    const response = await fetch(`${origin}/api/mobile/auth/refresh`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ refreshToken: session.refreshToken }),
    });
    if (!response.ok) { await clearSession(); return null; }
    const tokens = await readApiJson(response, "session refresh");
    const next: NativeSession = { user: tokens.user || session.user, accessToken: tokens.accessToken, refreshToken: tokens.refreshToken };
    await saveSession(next);
    return next;
  })().finally(() => { refreshInFlight = null; });
  return refreshInFlight;
}

export async function apiFetch(path: string, init: RequestInit = {}) {
  const origin = await getApiOrigin();
  if (!origin) throw new Error(missingApiMessage());
  const session = await getSavedSession();
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  if (session?.accessToken) headers.set("Authorization", `Bearer ${session.accessToken}`);
  let response = await fetch(`${origin}${path}`, { ...init, headers });
  if (response.status === 401 && session?.refreshToken && !path.includes("/auth/refresh")) {
    const next = await refreshSession();
    if (next) {
      const retryHeaders = new Headers(headers);
      retryHeaders.set("Authorization", `Bearer ${next.accessToken}`);
      response = await fetch(`${origin}${path}`, { ...init, headers: retryHeaders });
    } else {
      throw new Error("Your session expired. Sign in again to continue.");
    }
  }
  return response;
}

export async function revokeCurrentSession() {
  const [origin, session] = await Promise.all([getApiOrigin(), getSavedSession()]);
  await clearSession();
  if (origin && session?.accessToken) {
    // Do not keep the user on the account screen while waiting for a network
    // request. The captured token still lets the server revoke this device.
    void fetch(`${origin}/api/mobile/auth/session`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.accessToken}` },
      body: JSON.stringify({}),
    }).catch(() => undefined);
  }
}

export async function login(payload: Record<string, unknown>) {
  const origin = await getApiOrigin();
  if (!origin) throw new Error(missingApiMessage());
  try {
    const response = await fetchWithDeadline(`${origin}/api/mobile/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(payload),
    }, 45_000, "Sign-in");
    const result = await readApiJson(response, "sign-in");
    return { response, payload: result };
  } catch (error) {
    if (error instanceof Error && error.name === "NnsRequestTimeout") throw new Error("NNS did not reply to the sign-in request in time. Check your connection and try again.");
    if (isNetworkFailure(error)) throw new Error("The sign-in connection was interrupted before NNS replied. Check your internet connection and try again.");
    throw error;
  }
}

async function postPairing(path: string, payload: Record<string, string>) {
  const origin = await getApiOrigin();
  if (!origin) throw new Error(missingApiMessage());
  try {
    const response = await fetchWithDeadline(`${origin}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(payload),
    }, 30_000, "QR sign-in");
    const result = await readApiJson(response, "QR sign-in");
    if (!response.ok) throw new Error(typeof result?.error === "string" ? result.error : "This QR request is no longer active. Create a fresh one on the website.");
    return result;
  } catch (error) {
    if (error instanceof Error && error.name === "NnsRequestTimeout") throw new Error("NNS did not confirm the QR request in time. Create a fresh QR code on the website and scan it again.");
    if (isNetworkFailure(error)) throw new Error("The QR connection was interrupted. Create a fresh QR code on the website and scan it again; the previous scan may have reached NNS.");
    throw error;
  }
}

export async function claimMobilePairing(requestId: string, token: string, deviceName: string) {
  return postPairing("/api/mobile/auth/pairing/claim", { requestId, token, deviceName });
}

export async function confirmMobilePairing(requestId: string, token: string): Promise<NativeSession> {
  return postPairing("/api/mobile/auth/pairing/confirm", { requestId, token });
}
