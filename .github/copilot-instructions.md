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
