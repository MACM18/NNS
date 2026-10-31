# Customer and line data encryption

The application encrypts customer identifiers and contact details in line records and tasks with AES-256-GCM before Prisma writes them. Invoice line snapshots, editable invoice content, Daily Book revision values, monthly report snapshots, and archived report PDF bytes are encrypted as well. Reads decrypt these values inside the server-side Prisma client layer. Partial search uses keyed HMAC n-gram indexes; exact phone matching uses a keyed HMAC lookup column. Indexes do not contain the source text.

## Required secret

Set `CUSTOMER_DATA_ENCRYPTION_KEY` in the server environment (Dokploy) before deploying the encryption release. Generate it once with `openssl rand -base64 48`. Keep it stable across all app instances, do not expose it to `NEXT_PUBLIC_*`, and keep a secure backup. Losing or changing the key makes encrypted customer data unreadable. This key is separate from `ENCRYPTION_KEY` and `AUTH_SECRET` so email credentials and authentication secrets are unaffected.

## Existing database rollout

1. Take a verified database backup.
2. Set the same `CUSTOMER_DATA_ENCRYPTION_KEY` on the deployment environment.
3. Deploy the release and apply `20261031030000_encrypt_customer_line_data`.
4. Run `npm run db:encrypt-customer-data` once against the production database with the same key. The script is idempotent and reports only record counts. It encrypts existing line/task fields, revisions, invoice snapshots, report snapshots, and report PDFs, and populates keyed lookup indexes.
5. Confirm the script completes, then verify line search, imports, invoice previews, report previews, and public shared-report PDFs.

The app can read legacy plaintext rows during the rollout, but the one-time backfill is required before the database is fully encrypted. Do not delete or rotate the key. Keep the backup until encrypted records have been verified.
