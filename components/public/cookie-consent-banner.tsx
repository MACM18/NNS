"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  COOKIE_CONSENT_KEY,
  OPEN_COOKIE_SETTINGS_EVENT,
  readCookieConsent,
  saveCookieConsent,
  type CookieConsentChoice,
} from "@/lib/cookie-consent";

export function CookieConsentBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(readCookieConsent() === null);
    const open = () => setVisible(true);
    const syncFromAnotherTab = (event: StorageEvent) => {
      if (event.key === COOKIE_CONSENT_KEY) setVisible(readCookieConsent() === null);
    };
    window.addEventListener(OPEN_COOKIE_SETTINGS_EVENT, open);
    window.addEventListener("storage", syncFromAnotherTab);
    return () => {
      window.removeEventListener(OPEN_COOKIE_SETTINGS_EVENT, open);
      window.removeEventListener("storage", syncFromAnotherTab);
    };
  }, []);

  function choose(choice: CookieConsentChoice) {
    const wasMeasuring = readCookieConsent() === "performance";
    saveCookieConsent(choice);
    setVisible(false);
    // The vendor script stays in the document after React unmounts it.
    if (wasMeasuring && choice === "necessary") window.location.reload();
  }

  if (!visible) return null;

  return (
    <div className="fixed inset-x-4 bottom-4 z-[70] mx-auto max-w-3xl rounded-2xl border border-border bg-card p-5 text-card-foreground shadow-2xl sm:bottom-6 sm:p-6" role="region" aria-label="Cookie and privacy choices">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
        <div className="max-w-xl space-y-2">
          <h2 className="text-base font-semibold">Cookies & site preferences</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Necessary storage keeps sign-in, your settings, and this choice working. With your permission, we also use anonymous performance measurement. Read our{" "}
            <Link href="/welcome/cookies" className="font-medium text-primary underline-offset-4 hover:underline">Cookie Policy</Link> and{" "}
            <Link href="/welcome/privacy" className="font-medium text-primary underline-offset-4 hover:underline">Privacy Policy</Link>.
          </p>
        </div>
        <div className="flex shrink-0 flex-col gap-2 sm:min-w-[164px]">
          <Button variant="outline" className="border-primary/30 hover:bg-primary/10" onClick={() => choose("necessary")}>Necessary only</Button>
          <Button variant="outline" className="border-primary/30 hover:bg-primary/10" onClick={() => choose("performance")}>Allow performance</Button>
        </div>
      </div>
    </div>
  );
}
