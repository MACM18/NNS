# Google Sheets automatic import on Dokploy

The production Next.js server starts a `node-cron` worker. It checks the saved schedule every minute and imports the newest selected sheet for the current month once per Sri Lanka calendar day. A database uniqueness constraint prevents duplicate daily runs across multiple app processes.

Set a long random `CRON_SECRET` in the Dokploy application's environment variables and redeploy. The Dockerfile applies the database migration before starting Next.js. The Google service account environment variables used by manual sync are also required.

In **Integrations → Automatic Google Sheets import**, choose the daily time in Sri Lanka time and save. The current month's newest connection is selected automatically. When the month changes, older connections are unchecked; a new current-month connection is selected when it exists. You can turn off automatic import globally or uncheck the selected connection.

The protected `GET /api/cron/google-sheet-import` endpoint remains available for an external scheduler if needed. It requires `Authorization: Bearer <CRON_SECRET>`. Do not configure a second scheduler unless you intend to have one as a fallback; the database still limits imports to once per day.


## Monthly Google Sheet provisioning

The Dokploy Node cron worker checks monthly provisioning once per minute and runs it at 00:05 on day one in `Asia/Colombo`, before the existing 02:00 import. Configure the monthly template, destination folder, reset ranges, month cell, balance mappings, and editor list under Integrations → Google Sheets.

Connect the admin Drive account using the Drive file picker. Set `GOOGLE_SHEETS_DRIVE_REDIRECT_URI` to `https://<your-app-host>/api/integrations/google-sheets/monthly/oauth/callback`, and register that exact URL in the Google OAuth client. The picker also needs `GOOGLE_PICKER_API_KEY` and `GOOGLE_CLOUD_PROJECT_NUMBER`. The OAuth client needs the Google Drive API and Picker API enabled. Refresh tokens are encrypted using `ENCRYPTION_KEY` or `AUTH_SECRET`.

The new sheet is shared with the configured editor accounts and with `GOOGLE_SERVICE_ACCOUNT_EMAIL` so the existing importer can read it. Confirm the service account has no broader Drive access than required. Set `CRON_SECRET` in the Dokploy app environment and redeploy; the worker calls both monthly provisioning and daily import endpoints.
