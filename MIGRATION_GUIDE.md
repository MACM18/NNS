# Migration Guide: Supabase to Self-Hosted PostgreSQL + NextAuth.js

This guide documents the migration from Supabase to a self-hosted PostgreSQL database with NextAuth.js for authentication.

## Overview

### Before (Supabase Stack)
- **Database**: Supabase PostgreSQL (managed)
- **Authentication**: Supabase Auth
- **Client**: `@supabase/supabase-js`
- **RLS**: Row Level Security policies in Supabase

### After (Self-Hosted Stack)
- **Database**: Self-hosted PostgreSQL (Docker)
- **ORM**: Prisma
- **Authentication**: NextAuth.js v5
- **Client**: `@prisma/client`

## Migration Checklist

### ✅ Completed Steps

1. **Installed Dependencies**
   - `prisma` - Prisma ORM
   - `@prisma/client` - Prisma client
   - `next-auth@beta` - NextAuth.js v5
   - `@auth/prisma-adapter` - Prisma adapter for NextAuth
   - `bcryptjs` - Password hashing

2. **Created Prisma Schema** (`prisma/schema.prisma`)
   - All 23+ tables from Supabase
   - User/Account/Session models for NextAuth
   - Proper relationships and indexes

3. **Created Auth Configuration** (`lib/auth.ts`)
   - Credentials provider (email/password)
   - Google OAuth provider
   - JWT session strategy
   - Profile auto-creation on sign-in

4. **Created Database Service Layer** (`lib/db.ts`)
   - Unified API for all database operations
   - Similar interface to Supabase client
   - Helper functions for computed fields

5. **Created New Auth Context** (`contexts/auth-context-new.tsx`)
   - Uses NextAuth's `useSession` hook
   - Compatible with existing `useAuth()` hook API

6. **Created API Routes**
   - `/api/auth/[...nextauth]/route.ts` - NextAuth handlers
   - `/api/auth/register/route.ts` - User registration
   - `/api/profile/[id]/route.ts` - Profile CRUD

7. **Created Middleware** (`middleware.ts`)
   - Route protection
   - Redirect logic for auth pages

### 🔄 Steps To Complete

## Step 1: Configure Environment Variables

Update your `.env` file with your PostgreSQL connection:

```env
# PostgreSQL Database Connection
DATABASE_URL="postgresql://postgres:yourpassword@localhost:5432/nns?schema=public"

# NextAuth.js Configuration
# Generate with: openssl rand -base64 32
NEXTAUTH_SECRET="your-generated-secret-here"
NEXTAUTH_URL="http://localhost:3000"

# Google OAuth (if using)
GOOGLE_OAUTH_CLIENT_ID="your-google-client-id"
GOOGLE_OAUTH_CLIENT_SECRET="your-google-client-secret"
```

## Step 2: Generate Prisma Client

```bash
# Generate Prisma client
pnpm exec prisma generate

# Create database and apply schema
pnpm exec prisma db push

# Or use migrations for production
pnpm exec prisma migrate dev --name init
```

## Step 3: Update Root Layout

Replace the Supabase AuthProvider with NextAuth SessionProvider in `app/layout.tsx`:

```tsx
import { AuthSessionProvider } from "@/components/auth/session-provider";
import { AuthProvider } from "@/contexts/auth-context-new"; // Use new context

export default function RootLayout({ children }) {
  return (
    <html lang='en' suppressHydrationWarning>
      <body>
        <ThemeProvider>
          <AuthSessionProvider>
            <AuthProvider>
              {/* ... rest of providers */}
            </AuthProvider>
          </AuthSessionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
```

## Step 4: Update Login Form

Update `components/auth/login-form.tsx` to use NextAuth:

```tsx
"use client";

import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const result = await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirect: false,
    });

    if (result?.error) {
      // Handle error
    } else {
      router.push(callbackUrl);
    }
  };

  const handleGoogleSignIn = () => {
    signIn("google", { callbackUrl });
  };

  // ... rest of component
}
```

## Step 5: Update Register Form

Update `components/auth/register-form.tsx` to use the new API:

```tsx
const handleSubmit = async (data: FormValues) => {
  const response = await fetch("/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: data.email,
      password: data.password,
      fullName: data.fullName,
    }),
  });

  if (response.ok) {
    // Sign in after registration
    await signIn("credentials", {
      email: data.email,
      password: data.password,
      callbackUrl: "/dashboard",
    });
  }
};
```

## Step 6: Update Database Queries

Replace Supabase client calls with Prisma/db service:

### Before (Supabase):
```tsx
import { supabase } from "@/lib/supabase";

const { data, error } = await supabase
  .from("line_details")
  .select("*")
  .eq("status", "completed");
```

### After (Prisma):
```tsx
import db from "@/lib/db";
// or
import { lineDetails } from "@/lib/db";

const data = await db.lineDetails.findMany({
  where: { status: "completed" },
});
```

### Common Query Patterns

| Supabase | Prisma |
|----------|--------|
| `.select("*")` | `findMany()` |
| `.select("id, name")` | `findMany({ select: { id: true, name: true } })` |
| `.eq("field", value)` | `findMany({ where: { field: value } })` |
| `.in("field", [values])` | `findMany({ where: { field: { in: [values] } } })` |
| `.order("field", { ascending: false })` | `findMany({ orderBy: { field: 'desc' } })` |
| `.limit(10)` | `findMany({ take: 10 })` |
| `.single()` | `findUnique()` or `findFirst()` |
| `.insert({})` | `create({ data: {} })` |
| `.update({})` | `update({ where: {}, data: {} })` |
| `.upsert({})` | `upsert({ where: {}, create: {}, update: {} })` |
| `.delete()` | `delete({ where: {} })` |

## Step 7: Update Server Actions

For server actions in `app/dashboard/integrations/google-sheets/actions.ts`:

### Before:
```tsx
import { supabaseServer } from "@/lib/supabase-server";

const { data, error } = await supabaseServer
  .from("profiles")
  .select("role")
  .eq("id", userId)
  .single();
```

### After:
```tsx
import db from "@/lib/db";

const profile = await db.profiles.findById(userId);
const role = profile?.role;
```

## Step 8: Handle Auth in Server Components

### Before (Supabase):
```tsx
import { supabaseServer } from "@/lib/supabase-server";

export default async function Page() {
  const { data: { user } } = await supabaseServer.auth.getUser();
}
```

### After (NextAuth):
```tsx
import { auth } from "@/lib/auth";

export default async function Page() {
  const session = await auth();
  const user = session?.user;
}
```

## Step 9: Migrate Existing Data

If you have existing data in Supabase, export it and import to PostgreSQL:

```bash
# Export from Supabase (use Supabase CLI or dashboard)
# Then import to local PostgreSQL

# Using psql
psql -h localhost -U postgres -d nns -f backup.sql
```

## Step 10: Remove Supabase Dependencies

Once migration is complete and tested:

```bash
# Remove Supabase packages
pnpm remove @supabase/supabase-js @supabase/ssr

# Delete old files
rm lib/supabase.ts
rm lib/supabase-server.ts
rm contexts/auth-context.tsx  # Keep the new one

# Rename new auth context
mv contexts/auth-context-new.tsx contexts/auth-context.tsx
```

## Files to Update

Here's a list of files that import Supabase and need updates:

### High Priority (Auth-related):
- `components/auth/login-form.tsx`
- `components/auth/register-form.tsx`
- `components/modals/create-user-modal.tsx`
- `components/users/user-management-tabs.tsx`

### Medium Priority (Dashboard pages):
- `app/dashboard/page.tsx`
- `app/dashboard/lines/page.tsx`
- `app/dashboard/integrations/google-sheets/actions.ts`
- `app/dashboard/integrations/google-sheets/page.tsx`
- `app/dashboard/work-tracking/page.tsx`
- `app/dashboard/careers/page.tsx`

### Lower Priority (Utilities):
- `lib/ai-suggestions.ts`
- `lib/enhanced-report-service.ts`
- `lib/export-utils.ts`
- `lib/notification-service.ts`

### Components with Supabase:
- `components/integrations/SyncSheetButton.tsx`
- `components/tables/line-details-table.tsx`
- `components/tables/task-management-table.tsx`
- `components/modals/add-inventory-invoice-modal.tsx`
- `components/modals/edit-telephone-line-modal.tsx`
- `components/modals/add-post-modal.tsx`
- `components/modals/manage-workers-modal.tsx`

## Security Considerations

1. **RLS Replacement**: Supabase RLS policies are replaced with:
   - NextAuth middleware for route protection
   - Server-side auth checks in API routes
   - Role-based access control in auth context

2. **API Routes**: All API routes should verify session:
   ```tsx
   import { auth } from "@/lib/auth";
   
   export async function GET() {
     const session = await auth();
     if (!session) {
       return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
     }
     // ... handle request
   }
   ```

3. **Admin Functions**: Replace Supabase admin API:
   - User creation: Use `/api/auth/register` or direct Prisma
   - User listing: Query users table directly (admin only)

## Testing Checklist

- [ ] User registration works
- [ ] Email/password login works
- [ ] Google OAuth login works
- [ ] Session persists across page reloads
- [ ] Protected routes redirect to login
- [ ] User profile is created on first login
- [ ] Role-based access works
- [ ] Password reset flow works
- [ ] Sign out works correctly
- [ ] Database queries return expected data

## Troubleshooting

### "Module not found" errors
Run `pnpm exec prisma generate` to generate the Prisma client.

### Database connection errors
Check your `DATABASE_URL` in `.env` and ensure PostgreSQL is running.

### Auth errors
Ensure `NEXTAUTH_SECRET` is set and `NEXTAUTH_URL` matches your development URL.

### TypeScript errors
Some errors will resolve after generating Prisma client. For persistent issues, check that all imports point to the correct new files.
