# AI Space Authentication Implementation Summary

## 📋 Overview
This document summarizes the authentication implementation for AI Space (AI Org Chat, Workspace, Training) to ensure proper user verification and authorization.

---

## ✅ What Was Implemented

### 1. **Authentication Middleware** (`api/ai_org_middleware.php`)

Created a comprehensive middleware with the following functions:

#### Core Functions:
- `requireAISpaceAuth()` - Verifies user is logged in via session
- `requireCategoryAccess($categoryId, $user)` - Checks user has access to specific category
- `requirePermission($permission, $user)` - Verifies user has specific permission
- `verifyAccessToken()` - Alternative token-based authentication
- `logUserActivity($userId, $action, $details)` - Audit trail logging

#### Features:
- ✅ Session-based authentication (primary)
- ✅ Token-based authentication (optional, for API integrations)
- ✅ Role-based access control (admin, assistant, viewer)
- ✅ Status checking (active, warning, banned)
- ✅ Category-level access control
- ✅ Permission-level access control
- ✅ Activity logging for audit trail

---

### 2. **Frontend Authentication** (React/TypeScript)

#### Updated Files:
- `pages/CategoryChat/hooks/useChat.ts`
  - ✅ Added `credentials: 'include'` to workspace upload fetch (line 104)
  - ✅ Added `credentials: 'include'` to streaming chat fetch (line 189)

#### Existing (Already Correct):
- `services/storageAdapter.ts`
  - ✅ Already has `credentials: 'include'` (line 79)
  - ✅ Sends session cookies with all API requests

---

### 3. **Backend API Protection**

#### Protected Endpoints:

**`api/ai_org_chatbot.php`** (AI Org Chat)
```php
require_once 'ai_org_middleware.php';
$currentOrgUser = requireAISpaceAuth();
```
- ✅ Verifies user authentication
- ✅ Uses `$currentOrgUser['id']` for all operations

**`api/get_global_assets.php`** (Workspace Assets)
```php
require_once 'ai_org_middleware.php';
$currentOrgUser = requireAISpaceAuth();
$current_admin_id = $currentOrgUser['id'];
```
- ✅ Verifies user authentication
- ✅ Filters assets by authenticated user ID

---

## 🔐 Authentication Flow

### Session-Based (Primary Method)

```
1. User logs in via /chat-category/:categoryId/login
   ↓
2. Frontend calls api/ai_org_auth.php?action=login
   ↓
3. Backend verifies credentials and creates session
   $_SESSION['org_user_id'] = $user['id']
   ↓
4. Frontend makes API calls with credentials: 'include'
   ↓
5. Backend middleware checks $_SESSION['org_user_id']
   ↓
6. If valid: Continue with request
   If invalid: Return 401 Unauthorized
```

### Token-Based (Optional - for API integrations)

```
1. User/App obtains access token
   ↓
2. Include token in Authorization header:
   Authorization: Bearer {token}
   ↓
3. Backend middleware verifies token in database
   ↓
4. If valid: Continue with request
   If invalid: Return 401 Unauthorized
```

---

## 🛡️ Security Features

### 1. **User Status Checking**
- `active` - Normal user, full access
- `warning` - User has warning, access granted with header notification
- `banned` - User is banned, returns 403 Forbidden

### 2. **Role-Based Access Control**
- `admin` - Full access to all features and categories
- `assistant` - Can manage training and chat
- `viewer` - Read-only access

### 3. **Category-Level Access**
- Users can only access categories they're assigned to
- Checked via `ai_org_user_categories` table
- Admins bypass this check (access all categories)

### 4. **Permission-Level Access**
- Fine-grained permissions (e.g., 'manage_training', 'export_data')
- Stored in `ai_org_users.permissions` JSON field
- Checked via `requirePermission()` function

### 5. **Activity Logging**
- All important actions logged to `ai_org_user_activity_logs`
- Includes: user_id, action, details, IP address, user agent, timestamp
- Useful for audit trail and security monitoring

---

## 📝 How to Protect New API Endpoints

When creating a new AI Space API endpoint:

```php
<?php
// 1. Include database and middleware
require_once 'db_connect.php';
require_once 'ai_org_middleware.php';

// 2. Verify authentication
$currentUser = requireAISpaceAuth();

// 3. (Optional) Check category access
$categoryId = $_GET['category_id'] ?? '';
requireCategoryAccess($categoryId, $currentUser);

// 4. (Optional) Check specific permission
requirePermission('manage_training', $currentUser);

// 5. (Optional) Log activity
logUserActivity($currentUser['id'], 'export_data', [
    'category_id' => $categoryId,
    'format' => 'csv'
]);

// 6. Your API logic here
// Use $currentUser['id'] for user-specific operations
?>
```

---

## 🔄 Session Management

### Session Cookie Settings
- **Lifetime**: 30 days (if "Remember Me" is checked)
- **Path**: `/`
- **Secure**: `true` (HTTPS only)
- **HttpOnly**: `true` (prevents XSS)
- **SameSite**: `None` (allows cross-site with credentials)

### Session Variables
```php
$_SESSION['org_user_id']          // User ID
$_SESSION['org_user_email']       // User email
$_SESSION['org_user_role']        // User role
$_SESSION['org_user_name']        // User full name
$_SESSION['org_user_permissions'] // JSON permissions
```

---

## 🚨 Error Responses

### 401 Unauthorized
```json
{
  "success": false,
  "error": "UNAUTHORIZED",
  "message": "Authentication required. Please log in to AI Space.",
  "app": "ai_space"
}
```

### 403 Forbidden (Banned User)
```json
{
  "success": false,
  "error": "ACCOUNT_BANNED",
  "message": "Your account has been banned due to policy violations.",
  "app": "ai_space"
}
```

### 403 Forbidden (No Category Access)
```json
{
  "success": false,
  "error": "ACCESS_DENIED",
  "message": "You do not have permission to access this category.",
  "app": "ai_space",
  "category_id": "cat_123"
}
```

### 403 Forbidden (No Permission)
```json
{
  "success": false,
  "error": "PERMISSION_DENIED",
  "message": "You do not have permission to perform this action.",
  "app": "ai_space",
  "required_permission": "manage_training"
}
```

---

## 📊 Database Tables

### Core Tables
- `ai_org_users` - Organization users
- `ai_org_user_categories` - User-category access mapping
- `ai_org_access_tokens` - API access tokens (optional)
- `ai_org_user_activity_logs` - Audit trail

### Schema: `ai_org_users`
```sql
id VARCHAR(36) PRIMARY KEY
email VARCHAR(255) UNIQUE
password_hash VARCHAR(255)
full_name VARCHAR(255)
role ENUM('admin', 'assistant', 'viewer')
status ENUM('active', 'warning', 'banned')
permissions JSON
created_at TIMESTAMP
last_login TIMESTAMP
```

### Schema: `ai_org_user_categories`
```sql
user_id VARCHAR(36)
category_id VARCHAR(36)
created_at TIMESTAMP
PRIMARY KEY (user_id, category_id)
```

### Schema: `ai_org_access_tokens`
```sql
id INT AUTO_INCREMENT PRIMARY KEY
user_id VARCHAR(36)
token VARCHAR(255) UNIQUE
expires_at TIMESTAMP
is_active BOOLEAN
last_used_at TIMESTAMP
created_at TIMESTAMP
```

### Schema: `ai_org_user_activity_logs`
```sql
id INT AUTO_INCREMENT PRIMARY KEY
user_id VARCHAR(36)
action VARCHAR(100)
details JSON
ip_address VARCHAR(45)
user_agent TEXT
created_at TIMESTAMP
```

---

## ✅ Testing Checklist

- [ ] Login with valid credentials works
- [ ] Login with invalid credentials fails with 401
- [ ] Banned user cannot access any endpoint (403)
- [ ] User can only access assigned categories
- [ ] Admin can access all categories
- [ ] Permission checks work correctly
- [ ] Session persists across page reloads
- [ ] Session expires after logout
- [ ] Activity logs are created for important actions
- [ ] CORS headers allow credentials
- [ ] Cookies are sent with `credentials: 'include'`

---

## 🔗 Related Files

### Frontend
- `pages/CategoryChat/hooks/useChat.ts` - Chat API calls
- `services/storageAdapter.ts` - API helper with credentials
- `contexts/ChatPageContext.tsx` - User state management

### Backend
- `api/ai_org_middleware.php` - Authentication middleware
- `api/ai_org_auth.php` - Login/logout endpoints
- `api/ai_org_chatbot.php` - Org chat API (protected)
- `api/get_global_assets.php` - Workspace assets API (protected)
- `api/db_connect.php` - Database connection + CORS
- `api/.htaccess` - Apache CORS configuration

### Documentation
- `ARCHITECTURE.md` - App separation (AutoFlow vs AI Space)

---

**Last Updated:** 2026-02-16 14:30
**Status:** ✅ Implemented and Ready for Testing
