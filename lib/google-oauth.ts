import { google } from "googleapis";
import { supabaseServer } from "@/lib/supabase-server";

const GOOGLE_SCOPES = [
  "https://www.googleapis.com/auth/spreadsheets",
  "https://www.googleapis.com/auth/drive.readonly",
];

function getOAuth2Client() {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_OAUTH_REDIRECT_URI;
  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error(
      "Missing Google OAuth env vars (CLIENT_ID/CLIENT_SECRET/REDIRECT_URI)."
    );
  }
  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

export async function buildAuthUrl(state?: string) {
  const oauth2 = getOAuth2Client();
  return oauth2.generateAuthUrl({
    access_type: "offline",
    scope: GOOGLE_SCOPES,
    prompt: "consent",
    include_granted_scopes: true,
    state,
  });
}

type StoredTokens = {
  access_token: string;
  refresh_token: string | null;
  scope: string | null;
  expires_at: string | null;
  token_type: string | null;
};

async function fetchStoredTokens(userId: string): Promise<StoredTokens | null> {
  const { data } = await supabaseServer
    .from("google_oauth_tokens")
    .select("access_token, refresh_token, scope, expires_at, token_type")
    .eq("user_id", userId)
    .maybeSingle();
  return (data as any) || null;
}

async function persistTokens(userId: string, creds: any) {
  const expiresAt = creds.expiry_date
    ? new Date(creds.expiry_date).toISOString()
    : null;
  const payload = {
    user_id: userId,
    access_token: creds.access_token,
    refresh_token: creds.refresh_token || null,
    scope: creds.scope || null,
    token_type: creds.token_type || null,
    expires_at: expiresAt,
    updated_at: new Date().toISOString(),
  };
  const { error } = await supabaseServer
    .from("google_oauth_tokens")
    .upsert(payload, { onConflict: "user_id" });
  if (error) throw error;
}

function isExpired(token: StoredTokens | null) {
  if (!token?.expires_at) return true;
  const expMs = new Date(token.expires_at).getTime();
  return Date.now() > expMs - 60_000;
}

export async function exchangeCodeForTokens(userId: string, code: string) {
  const oauth2 = getOAuth2Client();
  const { tokens } = await oauth2.getToken(code);
  await persistTokens(userId, tokens);
  return tokens;
}

export async function getSheetsClientForUser(userId: string) {
  const oauth2 = getOAuth2Client();
  const stored = await fetchStoredTokens(userId);
  if (!stored) throw new Error("No Google Sheets authorization for this user.");
  oauth2.setCredentials({
    access_token: stored.access_token,
    refresh_token: stored.refresh_token || undefined,
    scope: stored.scope || undefined,
  });
  if (isExpired(stored) && stored.refresh_token) {
    const refreshed = await oauth2.refreshAccessToken();
    await persistTokens(userId, refreshed.credentials);
  }
  return google.sheets({ version: "v4", auth: oauth2 });
}

export async function getDriveClientForUser(userId: string) {
  const oauth2 = getOAuth2Client();
  const stored = await fetchStoredTokens(userId);
  if (!stored) throw new Error("No Google Drive authorization for this user.");
  oauth2.setCredentials({
    access_token: stored.access_token,
    refresh_token: stored.refresh_token || undefined,
    scope: stored.scope || undefined,
  });
  if (isExpired(stored) && stored.refresh_token) {
    const refreshed = await oauth2.refreshAccessToken();
    await persistTokens(userId, refreshed.credentials);
  }
  return google.drive({ version: "v3", auth: oauth2 });
}

export async function revokeUserTokens(userId: string) {
  const stored = await fetchStoredTokens(userId);
  if (!stored?.access_token) return;
  try {
    const oauth2 = getOAuth2Client();
    await oauth2.revokeToken(stored.access_token);
  } catch {}
  await supabaseServer
    .from("google_oauth_tokens")
    .delete()
    .eq("user_id", userId);
}
