# NNS Telecom Management System - Copilot Instructions

## Project Overview

NNS is a Next.js-based telecom management platform for fiber optic line installations, inventory, and operational workflows. It manages the full lifecycle from planning and task assignment to completion, with AI-powered validation and suggestions.

## Architecture & File Structure

- **app/**: Next.js App Router pages (auth, inventory, invoices, tasks, reports, profile, welcome, etc.)
- **components/**: Reusable UI (layout, modals, tables, shadcn/ui)
- **contexts/**: React Context providers (auth, theme, notifications)
- **lib/**: Utilities (Supabase client, AI suggestions, report services)
- **hooks/**: Custom React hooks
- **styles/**: Tailwind CSS config and global styles

## Technology Stack

- Next.js 15 (App Router), React 19, TypeScript
- Tailwind CSS, Radix UI, shadcn/ui
- Supabase (PostgreSQL, RLS, real-time)
- React Context API for state
- React Hook Form + Zod for forms
- Lucide React for icons

## Key Domain Concepts

- **Distribution Points (DPs)**: Format `XX-XXXX-XXXX-XXX-0X`, regex-enforced, unique per line
- **Cable Measurements**: F1 (start-middle), G1 (middle-end), total = F1+G1, wastage ≤ 20% of total
- **Power Readings**: DP/inbox, ≥20 triggers warnings
- **Inventory**: Drums, rosettes, hardware, cable lengths

## Component & Data Patterns

- Use `PublicLayout` for landing/marketing pages, `DashboardLayout` for authenticated app
- Modals in `components/modals/`, tables in `components/tables/`, forms use React Hook Form + Zod
- Supabase client: `import { getSupabaseClient } from "@/lib/supabase"`
- AI suggestions: `import { AIService } from "@/lib/ai-suggestions"`

## Database Integration

- Use singleton Supabase client
- Key tables: `line_details`, `tasks`, `inventory_items`, `drum_tracking`, `invoices`, `profiles`
- Enforced rules: DP regex, wastage ≤ 20%, drum quantity checks, power warnings, serial validation

## Authentication

- Email/password flows use Supabase; see `LoginForm` for client handling and `AuthProvider` for session management
- Google OAuth is available via Supabase: enable the Google provider in the Supabase dashboard and add `https://<your-domain>/auth/callback` (plus local `http://localhost:3000/auth/callback`) to the redirect URLs
- The `/auth/callback` page exchanges the Supabase OAuth code for a session and redirects to the dashboard once complete

## Google Sheets Import (Admin/Moderator)

- User OAuth-based integration (no service account). Each connection uses the owner’s Google account permissions.
- API surface (app): dashboard Google Sheets pages provide connect/disconnect, Drive picker, and sync.
- Validations:
  - Sheet header must match required columns (case-insensitive); DP regex/wastage rules enforced server-side.
  - For the given month, matching phone numbers are merged/upserted.
- Mappings: Columns map to `line_details` fields (`Pole-5.6` -> `pole`, `Pole-6.7` -> `pole_67`, `Total` -> `total_cable`, etc.).
- Status defaults to `completed` on import.
- Auth: UI gated by role; server actions validate user token and role (admin/moderator).
- Drive picker lists spreadsheets owned/shared with the user’s Google account.
- Env vars (OAuth):
  - `GOOGLE_OAUTH_CLIENT_ID`
  - `GOOGLE_OAUTH_CLIENT_SECRET`
  - `GOOGLE_OAUTH_REDIRECT_URI` (e.g., `https://<your-domain>/api/google/oauth/callback`)
- Database:
  - `google_oauth_tokens(user_id PK, access_token, refresh_token, scope, token_type, expires_at, created_at, updated_at)`
  - `google_sheet_connections(..., oauth_user_id references profiles(id))`
  - Optional RLS on tokens to restrict to owner.

## Workflows & Conventions

- Add new features by following modal/form/table patterns
- All forms require loading/error states and validation
- Inventory and drum updates must be consistent with line installations
- Use AI validation for DPs, wastage, power, and error detection
- Use TypeScript strict mode and Next.js conventions

## Development & Debugging

- Use `npm install --legacy-peer-deps` for React 19 compatibility
- Run dev server: `npm run dev`
- Test forms, calculations, and AI logic for new features
- For layout issues, ensure correct usage of layout components and file structure

## Best Practices

- Use semantic HTML, ARIA labels, and error boundaries
- Validate all inputs, use Supabase RLS, sanitize user data
- Optimize queries and use loading states
- Document new domain rules and patterns in this file

---

If updating, merge with existing content and preserve any project-specific rules not covered above.
