# TypeScript 'any' Type Fixes - Summary

## Overview

Fixed TypeScript `any` type usage across the NNS Telecom Management System codebase, replacing them with proper type definitions for improved type safety and better code quality.

## Changes Made

### 1. Created New Type Definitions (`types/common.ts`)

Added comprehensive type definitions to replace `any` types:

```typescript
// Database Where Clauses
export type WhereClause = Record<string, unknown>;
export type LineDetailsWhereInput = Prisma.LineDetailsWhereInput;
export type TaskWhereInput = Prisma.TaskWhereInput;
// ... and more Prisma types

// Update Data Types
export type UpdateData = Record<string, unknown>;
export type LineDetailsUpdateInput = Prisma.LineDetailsUpdateInput;
// ... and more update types

// Pricing Tiers
export interface PricingTier {
  min_length: number;
  max_length: number;
  rate: number;
}

// Company Settings
export interface CompanySettings { ... }
export interface BankDetails { ... }

// Security & Notifications
export interface SecuritySettings { ... }
export interface NotificationSettings { ... }

// Line Details & Assignments
export interface LineAssignee { ... }
export interface LineDetailsWithAssignees { ... }

// Work Assignments
export interface DayAssignment { ... }
export interface WorkerOption { ... }

// Inventory
export interface InventoryItemWithRelations { ... }
export interface InventoryInvoiceItem { ... }

// Search Results
export interface SearchResult { ... }

// Page Props (Next.js 15 compatible)
export interface PageProps {
  params: Promise<{ [key: string]: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}
```

### 2. Added Error Handling Utilities (`lib/db.ts`)

```typescript
export function isError(error: unknown): error is Error {
  return error instanceof Error;
}

export function getErrorMessage(error: unknown): string {
  if (isError(error)) return error.message;
  if (typeof error === "string") return error;
  return "An unknown error occurred";
}
```

### 3. Fixed API Routes

#### Updated Data (Record<string, unknown>)

✅ `/app/api/settings/security/route.ts` - Security settings
✅ `/app/api/settings/notifications/route.ts` - Notification settings
✅ `/app/api/inventory/[id]/route.ts` - Inventory updates
✅ `/app/api/inventory/waste/[id]/route.ts` - Waste tracking updates
✅ `/app/api/lines/[id]/route.ts` - Line detail updates
✅ `/app/api/workers/route.ts` - Worker updates
✅ `/app/api/drums/[id]/route.ts` - Drum updates
✅ `/app/api/tasks/[id]/route.ts` - Task updates
✅ `/app/api/posts/[id]/route.ts` - Post updates
✅ `/app/api/blogs/[id]/route.ts` - Blog updates
✅ `/app/api/job-vacancies/[id]/route.ts` - Job vacancy updates

#### Where Clauses (Record<string, unknown>)

✅ `/app/api/inventory/route.ts` - Removed eslint disable comment
✅ `/app/api/inventory/invoice-items/route.ts`
✅ `/app/api/cron/delete-old-notifications/route.ts`
✅ `/app/api/lines/route.ts` - Removed eslint disable comment
✅ `/app/api/drums/route.ts` - Removed eslint disable comment
✅ `/app/api/tasks/route.ts` - Removed eslint disable comment
✅ `/app/api/invoices/route.ts` - Removed eslint disable comment
✅ `/app/api/search/route.ts` - Multiple where clauses fixed:

- `lineWhere`
- `taskWhere`
- `invoiceWhere`
- `inventoryWhere`

#### Type-Safe Spread Operators

Fixed spread operator issues in search route where TypeScript couldn't infer types:

```typescript
// Before (TypeScript error)
lineWhere.totalCable = {
  ...lineWhere.totalCable, // Error: unknown type
  gte: filters.lengthRange.min,
};

// After (Type-safe)
lineWhere.totalCable = {
  ...(typeof lineWhere.totalCable === "object" && lineWhere.totalCable !== null
    ? lineWhere.totalCable
    : {}),
  gte: filters.lengthRange.min,
};
```

Applied to:

- `lineWhere.totalCable` (min/max)
- `lineWhere.date` (from/to)
- `taskWhere.createdAt` (from/to)
- `invoiceWhere.totalAmount` (min/max)
- `invoiceWhere.createdAt` (from/to)
- `inventoryWhere.createdAt` (from/to)

#### Type-Safe Object Construction

Fixed dynamic object construction in tasks route:

```typescript
// Before (TypeScript error)
where.createdAt = {};
where.createdAt.gte = new Date(start);

// After (Type-safe)
const createdAtFilter: Record<string, Date> = {};
if (start) {
  createdAtFilter.gte = new Date(start);
}
where.createdAt = createdAtFilter;
```

### 4. Fixed Component Types

#### Company Settings

✅ `/app/api/settings/company/route.ts`

- Changed map parameter from `any` to `string | number`
- Changed normalizeTiers parameter from `any` to `unknown`

#### Lines by IDs

✅ `/app/api/lines/by-ids/route.ts`

- Removed incorrect `LineDetails` type (was causing mismatch with select clause)
- Let TypeScript infer correct type from Prisma select

#### Page Props

✅ `/app/dashboard/integrations/google-sheets/page.tsx`

- Added `import type { PageProps } from "@/types/common"`
- Properly awaited async searchParams (Next.js 15 requirement)

```typescript
// Before
export default async function GoogleSheetsPage({ searchParams }: any) {
  const currentPage = parseInt((searchParams?.page as string) || "1", 10);
}

// After
export default async function GoogleSheetsPage({ searchParams }: PageProps) {
  const resolvedSearchParams = await searchParams;
  const currentPage = parseInt(
    (resolvedSearchParams?.page as string) || "1",
    10
  );
}
```

### 5. Removed ESLint Disable Comments

Removed unnecessary `// eslint-disable-next-line @typescript-eslint/no-explicit-any` from:

- `/app/api/inventory/route.ts`
- `/app/api/lines/route.ts`
- `/app/api/drums/route.ts`
- `/app/api/tasks/route.ts`
- `/app/api/tasks/[id]/route.ts`
- `/app/api/invoices/route.ts`

## Remaining 'any' Usage

Some `any` types are still present in:

1. **Prisma Transaction Callbacks** - `(tx: any)` in transaction blocks (acceptable)
2. **Map/ForEach Callbacks** - Some array operations where type inference works correctly
3. **Component Props** - Legacy components that need gradual migration
4. **Export Utilities** - `data: any[]` parameters in report/export functions
5. **Error Catches** - Some `catch (error: any)` blocks (can use `unknown` instead)

These can be addressed in future PRs for gradual type safety improvement.

## Benefits

✅ **Type Safety**: Proper TypeScript types prevent runtime errors
✅ **IntelliSense**: Better code completion and suggestions
✅ **Refactoring**: Easier to refactor with type checking
✅ **Documentation**: Types serve as inline documentation
✅ **Next.js 15**: Compatible with async params/searchParams
✅ **Build Success**: All TypeScript compilation errors resolved

## Testing

- ✅ Build completes successfully with `npm run build`
- ✅ No TypeScript compilation errors
- ✅ All routes maintain backward compatibility
- ✅ API contracts unchanged

## Future Improvements

1. Replace remaining `error: any` with `error: unknown` + type guards
2. Add specific types for Prisma transaction callbacks
3. Create dedicated interfaces for complex component props
4. Add types for export/report data structures
5. Gradually migrate legacy components to typed props

---

**Build Status**: ✅ Successful  
**TypeScript Errors**: 0  
**Files Modified**: 30+  
**New Type Definitions**: 1 file (`types/common.ts`)
