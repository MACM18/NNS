# NNS Telecom Management System

Next.js 15 (App Router) + Prisma + NextAuth (v5) application for managing fiber line installations, inventory, and operational workflows.

## Stack
- Next.js 15, React 19, TypeScript
- Prisma 7 + PostgreSQL (`@prisma/adapter-pg`)
- NextAuth v5 (Credentials + Google)
- Tailwind CSS, shadcn/ui, Radix

## Quick Start

1. Environment
```env
DATABASE_URL=postgresql://user:pass@host:5432/nns?schema=public
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=<random-32-bytes>
GOOGLE_OAUTH_CLIENT_ID=<client-id>
GOOGLE_OAUTH_CLIENT_SECRET=<client-secret>
GOOGLE_SERVICE_ACCOUNT_EMAIL=<service-account-email>
GOOGLE_SERVICE_ACCOUNT_KEY=<json-or-pem>
```

2. Install, generate, migrate, run
```bash
pnpm install
pnpm prisma generate
pnpm prisma migrate dev --name init # or: pnpm prisma migrate deploy
pnpm dev
```

3. Seed admin (optional)
```bash
pnpm tsx scripts/create-admin.ts
```

## API Endpoints (selection)
- `/api/auth/[...nextauth]` — NextAuth handlers
- `/api/auth/register` — Register user
- `/api/users` — Admin user management
- `/api/lines` and `/api/lines/[id]`
- `/api/lines/create-with-usage`, `/api/lines/[id]/usage`, `/api/lines/[id]/update-with-usage`
- `/api/tasks` and `/api/tasks/[id]`; `/api/tasks/available`
- `/api/inventory` and nested invoice routes
- `/api/drums` and `/api/drums/[id]`
- `/api/invoices`, `/api/invoices/stats`
- `/api/integrations/google-sheets/*`

All routes enforce server-side auth with NextAuth; admin-only routes check `session.user.role`.

## Deployment (Coolify)

Build command:
```bash
pnpm install --frozen-lockfile && pnpm prisma generate && pnpm build
```

Start command:
```bash
pnpm start
```

Required envs:
- `DATABASE_URL`, `NEXTAUTH_URL`, `NEXTAUTH_SECRET`
- `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`
- `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_SERVICE_ACCOUNT_KEY`

Notes:
- Coolify sets `PORT`; Next.js reads it for `next start`.
- Point a health check to `/` or `/auth`.

## Notes
- Supabase has been removed. See `MIGRATION_GUIDE.md` for details.
