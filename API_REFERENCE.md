# Settings API Reference

## Authentication

All endpoints require authentication via NextAuth session. Include session in requests.

---

## Password Management

### Change Password

**Endpoint:** `POST /api/auth/change-password`

**Authorization:** Authenticated users (non-OAuth only)

**Request Body:**

```json
{
  "currentPassword": "string (required)",
  "newPassword": "string (required, min 8 chars)"
}
```

**Response (Success):**

```json
{
  "message": "Password changed successfully"
}
```

**Response (Error):**

```json
{
  "error": "Current password is incorrect"
}
// OR
{
  "error": "Cannot change password for OAuth accounts"
}
```

**Status Codes:**

- `200` - Password changed successfully
- `400` - Missing fields or validation error
- `401` - Unauthorized or incorrect current password
- `403` - OAuth user attempting password change
- `500` - Server error

---

## Company Settings

### Get Company Settings

**Endpoint:** `GET /api/settings/company`

**Authorization:** Authenticated users

**Response:**

```json
{
  "invoiceLogo": "string (URL)",
  "invoiceFooter": "string",
  "companyName": "string",
  "companyAddress": "string",
  "companyPhone": "string",
  "companyEmail": "string"
}
```

### Update Company Settings

**Endpoint:** `PUT /api/settings/company`

**Authorization:** Admin or Moderator only

**Request Body:**

```json
{
  "invoiceLogo": "string (optional)",
  "invoiceFooter": "string (optional)",
  "companyName": "string (optional)",
  "companyAddress": "string (optional)",
  "companyPhone": "string (optional)",
  "companyEmail": "string (optional)"
}
```

**Response (Success):**

```json
{
  "message": "Company settings updated successfully"
}
```

**Response (Error):**

```json
{
  "error": "Forbidden. Only admins and moderators can update company settings."
}
```

**Status Codes:**

- `200` - Settings updated successfully
- `403` - Forbidden (non-admin/moderator)
- `500` - Server error

---

## Notification Preferences

### Get Notification Settings

**Endpoint:** `GET /api/settings/notifications`

**Authorization:** Authenticated users

**Response:**

```json
{
  "email_notifications": true,
  "push_notifications": false,
  "task_notifications": true,
  "system_notifications": true,
  "marketing_emails": false,
  "security_alerts": true
}
```

### Update Notification Settings

**Endpoint:** `PUT /api/settings/notifications`

**Authorization:** Authenticated users

**Request Body:**

```json
{
  "email_notifications": true,
  "push_notifications": false,
  "task_notifications": true,
  "system_notifications": true,
  "marketing_emails": false,
  "security_alerts": true
}
```

**Response (Success):**

```json
{
  "message": "Notification settings updated successfully",
  "settings": {
    "email_notifications": true,
    "push_notifications": false
    // ... all settings
  }
}
```

**Response (Error):**

```json
{
  "error": "Invalid setting key: unknown_key"
}
```

**Status Codes:**

- `200` - Settings updated successfully
- `400` - Invalid setting key or value type
- `401` - Unauthorized
- `500` - Server error

---

## Security Settings

### Get Security Settings

**Endpoint:** `GET /api/settings/security`

**Authorization:** Authenticated users

**Response:**

```json
{
  "two_factor_enabled": false,
  "session_timeout": "1h",
  "login_alerts": true,
  "password_expiry": "90d"
}
```

### Update Security Settings

**Endpoint:** `PUT /api/settings/security`

**Authorization:** Authenticated users

**Request Body:**

```json
{
  "two_factor_enabled": false,
  "session_timeout": "1h",
  "login_alerts": true,
  "password_expiry": "90d"
}
```

**Valid Values:**

- `two_factor_enabled`: boolean
- `session_timeout`: "30m", "1h", "4h", "never"
- `login_alerts`: boolean
- `password_expiry`: "never", "30d", "60d", "90d"

**Response (Success):**

```json
{
  "message": "Security settings updated successfully",
  "settings": {
    "two_factor_enabled": false
    // ... all settings
  }
}
```

**Response (Error):**

```json
{
  "error": "Invalid setting key: unknown_key"
}
```

**Status Codes:**

- `200` - Settings updated successfully
- `400` - Invalid setting key or value
- `401` - Unauthorized
- `500` - Server error

---

## Data Export

### Export User Data

**Endpoint:** `GET /api/settings/export`

**Authorization:** Authenticated users (role-based scope)

**Response:**

```json
{
  "exportDate": "2025-01-15T10:30:00Z",
  "userId": "user-uuid",
  "userEmail": "user@example.com",
  "userRole": "moderator",
  "profile": {
    /* user profile data */
  },

  // For regular users:
  "tasks": [
    /* only assigned tasks */
  ],

  // For moderators (+ all above):
  "lines": [
    /* all line details */
  ],
  "inventory": [
    /* all inventory items */
  ],
  "invoices": [
    /* all inventory invoices */
  ],

  // For admins (+ all above):
  "users": [
    /* all user profiles */
  ],
  "company": {
    /* company settings */
  },
  "workers": [
    /* all workers */
  ],
  "workAssignments": [
    /* all work assignments */
  ]
}
```

**Export Scopes by Role:**

| Data Type        | Regular User  | Moderator | Admin    |
| ---------------- | ------------- | --------- | -------- |
| Profile          | Own only      | Own only  | Own only |
| Tasks            | Assigned only | All       | All      |
| Lines            | ❌            | All       | All      |
| Inventory        | ❌            | All       | All      |
| Invoices         | ❌            | All       | All      |
| Users            | ❌            | ❌        | All      |
| Company          | ❌            | ❌        | All      |
| Workers          | ❌            | ❌        | All      |
| Work Assignments | ❌            | ❌        | All      |

**Status Codes:**

- `200` - Export successful
- `401` - Unauthorized
- `500` - Server error

**Usage Example:**

```javascript
// Fetch and download export
const handleExport = async () => {
  const response = await fetch("/api/settings/export");
  const data = await response.json();

  // Create download
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `data-export-${new Date().toISOString()}.json`;
  a.click();
  URL.revokeObjectURL(url);
};
```

---

## Error Handling

### Common Error Responses

**Unauthorized (401):**

```json
{
  "error": "Unauthorized"
}
```

**Forbidden (403):**

```json
{
  "error": "Forbidden. Only admins and moderators can update company settings."
}
```

**Bad Request (400):**

```json
{
  "error": "Missing required fields"
}
// OR
{
  "error": "Invalid setting key: unknown_key"
}
```

**Server Error (500):**

```json
{
  "error": "Internal server error"
}
```

---

## Rate Limiting

Currently no rate limiting is implemented. Consider adding rate limiting for:

- Password change (5 attempts per hour)
- Data export (10 exports per hour)
- Settings updates (100 updates per hour)

---

## Security Best Practices

1. **Always use HTTPS** in production
2. **Validate session** on every request
3. **Check authorization** based on user role
4. **Sanitize inputs** before database queries
5. **Use bcrypt** for password hashing (12+ rounds)
6. **Log security events** (password changes, role changes)
7. **Implement rate limiting** to prevent abuse

---

## Frontend Integration Examples

### Password Change

```typescript
const changePassword = async (currentPassword: string, newPassword: string) => {
  const response = await fetch("/api/auth/change-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ currentPassword, newPassword }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error);
  }

  return response.json();
};
```

### Update Notification Settings

```typescript
const updateNotifications = async (settings: NotificationSettings) => {
  const response = await fetch("/api/settings/notifications", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(settings),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error);
  }

  return response.json();
};
```

### Check OAuth User

```typescript
const checkOAuthUser = async () => {
  const response = await fetch("/api/auth/check-oauth");
  const data = await response.json();
  return data.isOAuthUser;
};
```

---

## Database Schema

### Profile Model (Preferences Field)

```prisma
model Profile {
  // ... other fields
  preferences Json?    @map("preferences")
}
```

### Preferences Structure

```typescript
type UserPreferences = {
  notifications?: {
    email_notifications: boolean;
    push_notifications: boolean;
    task_notifications: boolean;
    system_notifications: boolean;
    marketing_emails: boolean;
    security_alerts: boolean;
  };
  security?: {
    two_factor_enabled: boolean;
    session_timeout: string;
    login_alerts: boolean;
    password_expiry: string;
  };
  // Future: appearance, etc.
};
```

---

## Testing

### cURL Examples

**Change Password:**

```bash
curl -X POST http://localhost:3000/api/auth/change-password \
  -H "Content-Type: application/json" \
  -b "next-auth.session-token=YOUR_SESSION_TOKEN" \
  -d '{
    "currentPassword": "oldpass123",
    "newPassword": "newpass123"
  }'
```

**Update Company Settings (Admin):**

```bash
curl -X PUT http://localhost:3000/api/settings/company \
  -H "Content-Type: application/json" \
  -b "next-auth.session-token=YOUR_SESSION_TOKEN" \
  -d '{
    "companyName": "NNS Telecom",
    "companyEmail": "info@nns.com"
  }'
```

**Export Data:**

```bash
curl -X GET http://localhost:3000/api/settings/export \
  -b "next-auth.session-token=YOUR_SESSION_TOKEN" \
  -o data-export.json
```

---

## Changelog

### Version 1.0.0 (January 2025)

- Initial implementation of settings APIs
- Password change functionality
- Notification preferences API
- Security settings API
- Data export with role-based scoping
- Company settings authorization fix

---

For additional support, refer to the [Settings Implementation Summary](./SETTINGS_IMPLEMENTATION_SUMMARY.md).
