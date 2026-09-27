export const COOKIE_CONSENT_KEY = "nns-cookie-consent-v1";
export const COOKIE_CONSENT_EVENT = "nns-cookie-consent-changed";
export const OPEN_COOKIE_SETTINGS_EVENT = "nns-open-cookie-settings";

export type CookieConsentChoice = "necessary" | "performance";

export function readCookieConsent(): CookieConsentChoice | null {
  try {
    const value = window.localStorage.getItem(COOKIE_CONSENT_KEY);
    return value === "necessary" || value === "performance" ? value : null;
  } catch {
    return null;
  }
}

export function saveCookieConsent(choice: CookieConsentChoice): void {
  try {
    window.localStorage.setItem(COOKIE_CONSENT_KEY, choice);
  } catch {
    // The current-page choice still applies when browser storage is unavailable.
  }
  window.dispatchEvent(new CustomEvent(COOKIE_CONSENT_EVENT, { detail: choice }));
}
