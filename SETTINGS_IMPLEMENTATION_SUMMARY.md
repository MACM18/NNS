# Settings Page Implementation Summary

## Overview
Implemented comprehensive settings functionality with proper role-based authorization, password management, notification/security preferences persistence, and data export capabilities.

## Features Implemented

### 1. Company Settings Authorization ✅
**File:** `/app/api/settings/company/route.ts`

- **Security Fix:** Added admin/moderator-only authorization check to PUT endpoint
- **Before:** Any authenticated user could modify company settings
- **After:** Only admin and moderator roles can update company settings
- **Implementation:**
  ```typescript
  // Check authorization - only admin and moderator can update company settings
  if (!["admin", "moderator"].includes(role)) {
    return NextResponse.json(
      { error: "Forbidden. Only admins and moderators can update company settings." },
      { status: 403 }
    );
  }
  ```

### 2. Password Change Functionality ✅
**File:** `/app/api/auth/change-password/route.ts` (NEW)

- **Features:**
  - Validates current password with bcrypt
  - Blocks OAuth users (Google sign-in) who don't have passwords
  - Hashes new password with bcrypt (12 salt rounds)
  - Returns appropriate error messages
- **Endpoint:** `POST /api/auth/change-password`
- **Request Body:**
  ```json
  {
    "currentPassword": "string",
    "newPassword": "string"
  }
  ```
- **Security:** Uses bcrypt for password hashing and verification

### 3. Notification Preferences API ✅
**File:** `/app/api/settings/notifications/route.ts` (NEW)

- **Features:**
  - GET: Retrieves notification preferences from database
  - PUT: Updates notification preferences in database
  - Stores in `profiles.preferences` JSON column
- **Endpoints:**
  - `GET /api/settings/notifications` - Get user's notification settings
  - `PUT /api/settings/notifications` - Update notification settings
- **Settings:**
  - email_notifications (boolean)
  - push_notifications (boolean)
  - task_notifications (boolean)
  - system_notifications (boolean)
  - marketing_emails (boolean)
  - security_alerts (boolean)

### 4. Security Settings API ✅
**File:** `/app/api/settings/security/route.ts` (NEW)

- **Features:**
  - GET: Retrieves security settings from database
  - PUT: Updates security settings in database
  - Stores in `profiles.preferences` JSON column
- **Endpoints:**
  - `GET /api/settings/security` - Get user's security settings
  - `PUT /api/settings/security` - Update security settings
- **Settings:**
  - two_factor_enabled (boolean)
  - session_timeout (string: "30m", "1h", "4h", "never")
  - login_alerts (boolean)
  - password_expiry (string: "never", "30d", "60d", "90d")

### 5. Data Export API ✅
**File:** `/app/api/settings/export/route.ts` (NEW)

- **Features:**
  - Role-based data export
  - JSON format with timestamped filename
  - Different data scopes per role
- **Endpoint:** `GET /api/settings/export`
- **Authorization Levels:**
  
  **Regular Users:**
  - Profile information
  - Assigned tasks only
  
  **Moderators:**
  - Profile information
  - All tasks
  - All line details
  - All inventory items (with usage data)
  - All inventory invoices
  
  **Admins:**
  - All moderator data
  - All user profiles
  - Company settings
  - Workers
  - Work assignments

### 6. Database Schema Update ✅
**Files:** 
- `/prisma/schema.prisma` - Added preferences field
- `/Database/migration_user_preferences.sql` - Migration SQL

- **Change:** Added `preferences Json?` field to Profile model
- **Migration SQL:**
  ```sql
  ALTER TABLE profiles ADD COLUMN preferences JSONB DEFAULT '{}'::jsonb;
  CREATE INDEX idx_profiles_preferences ON profiles USING GIN (preferences);
  COMMENT ON COLUMN profiles.preferences IS 'User preferences including notifications, security settings, etc.';
  ```
- **Purpose:** Store user preferences (notifications, security) as flexible JSON

### 7. Frontend Integration ✅
**File:** `/app/dashboard/settings/page.tsx`

**Updates Made:**
- **OAuth Detection:** Added `isOAuthUser` state and `checkOAuthUser()` function
  - Detects Google OAuth users
  - Conditionally shows/hides password change section
  - Displays warning for OAuth users
  
- **Password Change:**
  - Added `passwordData` state (currentPassword, newPassword, confirmPassword)
  - Implemented `handlePasswordChange()` with validation
  - Shows/hides password visibility toggle
  - Displays success/error toast messages
  
- **Notification Settings:**
  - Replaced localStorage with API calls
  - `fetchNotificationSettings()` calls GET endpoint
  - `handleNotificationUpdate()` persists to database via PUT
  
- **Security Settings:**
  - Replaced localStorage with API calls
  - `fetchSecuritySettings()` calls GET endpoint
  - `handleSecurityUpdate()` persists to database via PUT
  
- **Data Export:**
  - Added `exportLoading` state
  - Implemented `handleExportData()` to fetch and download JSON
  - Role-based descriptions for export scope
  - Automatic filename with timestamp
  
- **UI Authorization:**
  - Role badge in header showing user's role
  - Company tab disabled for non-admin/moderator users
  - Admin badge on company tab
  - Role-based export descriptions

## API Endpoints Summary

| Endpoint | Method | Authorization | Purpose |
|----------|--------|---------------|---------|
| `/api/settings/company` | GET | Authenticated | Get company settings |
| `/api/settings/company` | PUT | Admin/Moderator | Update company settings |
| `/api/auth/change-password` | POST | Authenticated (non-OAuth) | Change password |
| `/api/settings/notifications` | GET | Authenticated | Get notification preferences |
| `/api/settings/notifications` | PUT | Authenticated | Update notification preferences |
| `/api/settings/security` | GET | Authenticated | Get security settings |
| `/api/settings/security` | PUT | Authenticated | Update security settings |
| `/api/settings/export` | GET | Authenticated (role-based scope) | Export user data |

## Security Enhancements

1. **Role-Based Authorization:**
   - Company settings restricted to admin/moderator
   - Data export scope limited by role
   - Archive operations admin-only

2. **Password Security:**
   - bcrypt hashing (12 rounds)
   - Current password verification
   - OAuth user protection

3. **Session Management:**
   - Uses NextAuth session
   - Server-side authorization checks
   - No client-side role bypass

4. **Data Protection:**
   - User-scoped exports
   - No unauthorized data access
   - Sanitized error messages

## Database Changes

### Migration Required
Run this SQL migration before deployment:
```bash
psql -d your_database -f Database/migration_user_preferences.sql
```

### Prisma Client
After pulling latest code, regenerate Prisma client:
```bash
npx prisma generate
```

## Testing Checklist

### Authentication
- [ ] Regular users can log in and access settings
- [ ] OAuth users (Google) cannot see password change section
- [ ] Non-OAuth users can change password successfully
- [ ] Invalid current password is rejected
- [ ] Password requirements are enforced (min 8 characters)

### Authorization
- [ ] Regular users cannot access Company tab
- [ ] Moderators can access Company tab
- [ ] Admins can access Company tab
- [ ] Regular users only see company settings in Company tab
- [ ] Only admins/moderators can modify company settings

### Notification Settings
- [ ] Settings load from database on page load
- [ ] Toggle switches update immediately in UI
- [ ] Changes persist to database
- [ ] Settings persist across sessions/devices

### Security Settings
- [ ] Settings load from database on page load
- [ ] Dropdown selections update immediately in UI
- [ ] Changes persist to database
- [ ] Settings persist across sessions/devices

### Data Export
- [ ] Regular users export only their profile and tasks
- [ ] Moderators export operational data (lines, tasks, inventory)
- [ ] Admins export full system data
- [ ] Downloaded file is valid JSON
- [ ] Filename includes timestamp
- [ ] Export button shows loading state

## Deployment Notes

1. **Database Migration:**
   ```bash
   # Production deployment
   psql -d production_db -f Database/migration_user_preferences.sql
   ```

2. **Environment Variables:**
   - No new environment variables required
   - Ensure `NEXTAUTH_SECRET` is set
   - Verify database connection string

3. **Build Verification:**
   ```bash
   npm run build
   ```
   - Build should succeed without TypeScript errors
   - All Prisma models correctly referenced
   - No missing environment variables

4. **Post-Deployment:**
   - Verify company settings authorization
   - Test password change for non-OAuth users
   - Confirm notification/security settings persist
   - Test data export for each role level

## Future Enhancements

1. **Two-Factor Authentication:**
   - Currently a setting but not implemented
   - Plan: Add TOTP-based 2FA

2. **Session Timeout:**
   - Currently a setting but not enforced
   - Plan: Implement NextAuth session expiry

3. **Password Expiry:**
   - Currently a setting but not enforced
   - Plan: Track password change dates, enforce expiry

4. **Data Import:**
   - Currently "Coming Soon" button
   - Plan: Allow users to import previously exported data

5. **Cache Management:**
   - Currently "Coming Soon" button
   - Plan: Clear application cache and temp files

6. **Data Archiving:**
   - Currently disabled for non-admins
   - Plan: Implement data archiving for old records

## Technical Details

### Technology Stack
- **Framework:** Next.js 15.2.4 with App Router
- **Auth:** NextAuth v4
- **Database:** PostgreSQL via Prisma 7.1.0
- **Password Hashing:** bcryptjs
- **Validation:** Server-side validation + client-side UX

### File Structure
```
app/
  api/
    auth/
      change-password/route.ts       # NEW - Password change
    settings/
      company/route.ts               # MODIFIED - Added authorization
      notifications/route.ts         # NEW - Notification preferences
      security/route.ts              # NEW - Security settings
      export/route.ts                # NEW - Data export
  dashboard/
    settings/page.tsx                # MODIFIED - Frontend integration

prisma/
  schema.prisma                      # MODIFIED - Added preferences field

Database/
  migration_user_preferences.sql    # NEW - Migration SQL
```

### Prisma Models Used
- `Profile` - User profiles with preferences JSON
- `Task` - Tasks with relations
- `LineDetails` - Fiber line installations
- `InventoryItem` - Inventory items
- `InventoryInvoice` - Inventory invoices
- `Worker` - Worker information
- `WorkAssignment` - Work assignments
- `GeneratedInvoice` - Generated invoices (admin export)

## Support & Troubleshooting

### Common Issues

1. **"Failed to change password" error:**
   - Check if user is OAuth user (should be blocked)
   - Verify current password is correct
   - Ensure bcryptjs is installed

2. **Settings not persisting:**
   - Verify database migration ran successfully
   - Check if preferences column exists
   - Confirm Prisma client regenerated

3. **Authorization errors:**
   - Verify NextAuth session is valid
   - Check user role in database
   - Confirm role is in session object

4. **Export fails:**
   - Check user role permissions
   - Verify Prisma queries match schema
   - Confirm all relations exist

### Debug Commands
```bash
# Check if migration ran
psql -d your_db -c "SELECT column_name FROM information_schema.columns WHERE table_name='profiles' AND column_name='preferences';"

# Verify Prisma client
npx prisma generate

# Test build
npm run build

# Check user role
psql -d your_db -c "SELECT email, role FROM profiles WHERE email='user@example.com';"
```

## Contributors
- Implementation: GitHub Copilot
- Date: January 2025
- Version: 1.0.0

---

For questions or issues, please refer to the main project documentation or create an issue in the repository.
