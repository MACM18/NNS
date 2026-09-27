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
        const response = await fetch(`http://127.0.0.1:${port}/api/cron/google-sheet-import`, {
          headers: { authorization: `Bearer ${secret}` },
          cache: "no-store",
        });
        if (!response.ok) {
          console.error("[google-sheet-cron] Import check failed:", response.status, await response.text());
        }
      } catch (error) {
        console.error("[google-sheet-cron] Import check failed:", error);
      }
    }, { noOverlap: true, timezone: "UTC" });
  }
}
