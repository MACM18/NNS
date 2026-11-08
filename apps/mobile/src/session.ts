import * as SecureStore from "expo-secure-store";
import type { AppUser } from "./types";

const API_URL_KEY = "nns-mobile-api-origin-v1";
const ACCESS_KEY = "nns-mobile-access-v1";
const REFRESH_KEY = "nns-mobile-refresh-v1";
const USER_KEY = "nns-mobile-user-v1";
const DEFAULT_API_URL = process.env.EXPO_PUBLIC_NNS_API_URL || "";

export type NativeSession = { user: AppUser; accessToken: string; refreshToken: string };

export async function getApiOrigin() {
  return (await SecureStore.getItemAsync(API_URL_KEY)) || DEFAULT_API_URL.replace(/\/$/, "");
}

export async function saveApiOrigin(value: string) {
  const trimmed = value.trim().replace(/\/$/, "");
  if (!/^https:\/\//i.test(trimmed) && !/^http:\/\/(localhost|10\.0\.2\.2)(:\d+)?$/i.test(trimmed)) throw new Error("Use the HTTPS address of your NNS Enterprise server.");
  await SecureStore.setItemAsync(API_URL_KEY, trimmed);
  return trimmed;
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
    const tokens = await response.json();
    const next: NativeSession = { user: tokens.user || session.user, accessToken: tokens.accessToken, refreshToken: tokens.refreshToken };
    await saveSession(next);
    return next;
  })().finally(() => { refreshInFlight = null; });
  return refreshInFlight;
}

export async function apiFetch(path: string, init: RequestInit = {}) {
  const origin = await getApiOrigin();
  if (!origin) throw new Error("Set your NNS Enterprise server address before signing in.");
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
  if (!origin) throw new Error("Enter your NNS Enterprise server address.");
  return fetch(`${origin}/api/mobile/auth/login`, { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify(payload) });
}
