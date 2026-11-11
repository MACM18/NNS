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
  try { await apiFetch("/api/mobile/auth/session", { method: "DELETE", body: JSON.stringify({}) }); } catch { /* local sign-out still succeeds */ }
  await clearSession();
}

export async function login(payload: Record<string, unknown>) {
  const origin = await getApiOrigin();
  if (!origin) throw new Error(missingApiMessage());
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);
  try {
    const response = await fetch(`${origin}/api/mobile/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    const result = await readApiJson(response, "sign-in");
    return { response, payload: result };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Sign-in took too long. Check your connection and try again.");
    }
    if (error instanceof TypeError) {
      throw new Error("Could not reach NNS Enterprise. Check your internet connection and try again.");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

async function postPairing(path: string, payload: Record<string, string>) {
  const origin = await getApiOrigin();
  if (!origin) throw new Error(missingApiMessage());
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);
  try {
    const response = await fetch(`${origin}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    const result = await readApiJson(response, "QR sign-in");
    if (!response.ok) throw new Error(typeof result?.error === "string" ? result.error : "This QR request is no longer active. Create a fresh one on the website.");
    return result;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") throw new Error("The QR request took too long. Check your connection and try again.");
    if (error instanceof TypeError) throw new Error("Could not reach NNS Enterprise. Check your internet connection and try again.");
    throw error;
  } finally { clearTimeout(timeout); }
}

export async function claimMobilePairing(requestId: string, token: string, deviceName: string) {
  return postPairing("/api/mobile/auth/pairing/claim", { requestId, token, deviceName });
}

export async function confirmMobilePairing(requestId: string, token: string): Promise<NativeSession> {
  return postPairing("/api/mobile/auth/pairing/confirm", { requestId, token });
}
