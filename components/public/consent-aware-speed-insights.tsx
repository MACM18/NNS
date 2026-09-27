"use client";

import { useEffect, useState } from "react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import {
  COOKIE_CONSENT_EVENT,
  COOKIE_CONSENT_KEY,
  readCookieConsent,
  type CookieConsentChoice,
} from "@/lib/cookie-consent";

export function ConsentAwareSpeedInsights() {
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    setAllowed(readCookieConsent() === "performance");
    const onChoice = (event: Event) => {
      setAllowed((event as CustomEvent<CookieConsentChoice>).detail === "performance");
    };
    const onStorage = (event: StorageEvent) => {
      if (event.key === COOKIE_CONSENT_KEY) setAllowed(readCookieConsent() === "performance");
    };
    window.addEventListener(COOKIE_CONSENT_EVENT, onChoice);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(COOKIE_CONSENT_EVENT, onChoice);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  return allowed ? (
    <SpeedInsights beforeSend={(event) => readCookieConsent() === "performance" ? event : null} />
  ) : null;
}
