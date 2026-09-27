# Google Sheets automatic import on Dokploy

The production Next.js server starts a `node-cron` worker. It checks the saved schedule every minute and imports the newest selected sheet for the current month once per Sri Lanka calendar day. A database uniqueness constraint prevents duplicate daily runs across multiple app processes.

Set a long random `CRON_SECRET` in the Dokploy application's environment variables and redeploy. The Dockerfile applies the database migration before starting Next.js. The Google service account environment variables used by manual sync are also required.

In **Integrations → Automatic Google Sheets import**, choose the daily time in Sri Lanka time and save. The current month's newest connection is selected automatically. When the month changes, older connections are unchecked; a new current-month connection is selected when it exists. You can turn off automatic import globally or uncheck the selected connection.

The protected `GET /api/cron/google-sheet-import` endpoint remains available for an external scheduler if needed. It requires `Authorization: Bearer <CRON_SECRET>`. Do not configure a second scheduler unless you intend to have one as a fallback; the database still limits imports to once per day.
