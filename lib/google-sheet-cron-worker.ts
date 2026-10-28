import cron from "node-cron";

declare global {
  // Prevent duplicate schedules when Next.js initializes the same process again.
  // eslint-disable-next-line no-var
  var googleSheetCronStarted: boolean | undefined;
}

if (!globalThis.googleSheetCronStarted) {
  const secret = process.env.CRON_SECRET || process.env.VERCEL_CRON_SECRET;
  if (!secret) {
    console.warn("[google-sheet-cron] CRON_SECRET is missing; automatic imports are disabled.");
  } else {
    globalThis.googleSheetCronStarted = true;
    cron.schedule("* * * * *", async () => {
      try {
        const port = Number(process.env.PORT || 3000);
        const headers = { authorization: `Bearer ${secret}` };
        const monthly = await fetch(`http://127.0.0.1:${port}/api/cron/google-sheet-monthly`, { headers, cache: "no-store" });
        if (!monthly.ok) console.error("[google-sheet-cron] Monthly setup check failed:", monthly.status, await monthly.text());
        const response = await fetch(`http://127.0.0.1:${port}/api/cron/google-sheet-import`, { headers, cache: "no-store" });
        if (!response.ok) console.error("[google-sheet-cron] Import check failed:", response.status, await response.text());
      } catch (error) {
        console.error("[google-sheet-cron] Import check failed:", error);
      }
    }, { noOverlap: true, timezone: "UTC" });

    cron.schedule("25 0 * * 0", async () => {
      try {
        const port = Number(process.env.PORT || 3000);
        const response = await fetch(`http://127.0.0.1:${port}/api/cron/delete-old-notifications`, {
          headers: { authorization: `Bearer ${secret}` },
          cache: "no-store",
        });
        if (!response.ok) {
          console.error("[notification-cleanup] Scheduled cleanup failed:", response.status, await response.text());
        } else {
          const result = await response.json();
          console.info("[notification-cleanup] Weekly cleanup completed:", result);
        }
      } catch (error) {
        console.error("[notification-cleanup] Scheduled cleanup failed:", error);
      }
    }, { noOverlap: true, timezone: "UTC" });
  }
}
