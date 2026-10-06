import "server-only";
import { google } from "googleapis";

export async function getGoogleSheetsClient() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const keyRaw = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (!email || !keyRaw) {
    throw new Error("Google service account credentials are not configured.");
  }

  let key: string;
  try {
    const credentials = JSON.parse(keyRaw);
    if (!credentials.private_key) throw new Error("Missing private_key");
    key = credentials.private_key;
  } catch {
    key = keyRaw.replace(/\\n/g, "\n");
    if (!key.includes("-----BEGIN PRIVATE KEY-----") && !key.includes("-----BEGIN RSA PRIVATE KEY-----")) {
      throw new Error("Invalid Google service account private key format.");
    }
  }

  try {
    const authClient = new google.auth.JWT({
      email,
      key,
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });
    await authClient.authorize();
    return google.sheets({ version: "v4", auth: authClient });
  } catch (error) {
    throw new Error(`Google Sheets API authentication failed: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}
