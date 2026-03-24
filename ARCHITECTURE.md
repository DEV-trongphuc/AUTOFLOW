# Application Architecture: AutoFlow vs AI Space

## 📋 Overview

This document clearly defines the separation between two distinct applications in the codebase:

1. **AutoFlow** - Marketing Automation Platform
2. **AI Space** - AI-Powered Chat & Workspace Platform

---

## 🏢 AutoFlow (Marketing Automation)

### Purpose
Marketing automation platform for managing campaigns, flows, audience, and analytics.

### Key Features
- Email/SMS Campaigns
- Marketing Flows & Automation
- Audience Management
- Templates
- Analytics & Reports
- Tags & Segmentation
- API Triggers
- Social Media Integration (Zalo, Meta)

### Routes
- `/campaigns`
- `/flows`
- `/audience`
- `/templates`
- `/reports`
- `/tags`
- `/api-triggers`
- `/settings`
- `/social-settings`
- `/web-tracking`

### Authentication
- Traditional login system
- User table: `users`
- Session-based authentication
- No special middleware required

### API Endpoints
- `api/campaigns.php`
- `api/flows.php`
- `api/audience.php`
- `api/templates.php`
- `api/reports.php`
- `api/tags.php`
- `api/track.php` (web tracking)
- `api/meta_*.php` (Meta integration)
- `api/zalo_*.php` (Zalo integration)

---

## 🤖 AI Space (AI Chat & Workspace)

### Purpose
AI-powered chat platform with organization management, training, and collaborative workspace.

### Key Features
- **Category Chat** - Multi-bot chat interface
- **AI Training** - Knowledge base management
- **Global Workspace** - Shared document workspace
- **Organization Management** - User roles & permissions
- **AI Consultants** - Org chat with AI assistants

### Routes
- `/chat-category/:categoryId/*`
  - `/chat-category/:categoryId` - Main chat interface
  - `/chat-category/:categoryId/:chatbotId` - Specific bot chat
  - `/chat-category/:categoryId/:chatbotId/:sessionId` - Session view
  - `/chat-category/:categoryId/organization` - AI Training page
  - `/chat-category/:categoryId/login` - Login page

### Authentication
**REQUIRED for all AI Space features**

#### User Table
- `ai_org_users` - Organization users with roles and permissions

#### Roles
- `admin` - Full access to all features
- `assistant` - Can manage training and chat
- `viewer` - Read-only access

#### Status
- `active` - Normal user
- `warning` - User has received a warning
- `banned` - User is banned from the system

#### Authentication Methods
1. **Session-based** (Primary)
   - Login via `api/ai_org_auth.php?action=login`
   - Session stored in `$_SESSION['org_user_id']`
   - Check session via `api/ai_org_auth.php?action=check`

2. **Token-based** (Optional - for API integrations)
   - Bearer token in `Authorization` header
   - Tokens stored in `ai_org_access_tokens` table
   - Verify via `verifyAccessToken()` middleware function

### API Endpoints (Protected)

All these endpoints **MUST** include authentication middleware:

```php
<?php
require_once 'db_connect.php';
require_once 'ai_org_middleware.php';

// Verify authentication
$currentUser = requireAISpaceAuth();

// Optional: Check category access
requireCategoryAccess($categoryId, $currentUser);

// Optional: Check specific permission
requirePermission('manage_training', $currentUser);

// Your API logic here...
?>
```

#### Core API Files
- `api/ai_chatbot.php` - Chat API (needs auth for org conversations)
- `api/ai_org_*.php` - Organization management APIs
- `api/get_global_assets.php` - Workspace assets
- `api/ai_training_*.php` - Training data management

---

## 🔐 Authentication Implementation Guide

### For AI Space API Endpoints

#### Step 1: Include Middleware
```php
<?php
require_once 'db_connect.php';
require_once 'ai_org_middleware.php';
```

#### Step 2: Verify Authentication
```php
// This will automatically return 401 if not authenticated
$currentUser = requireAISpaceAuth();

// Now you have access to:
// $currentUser['id']
// $currentUser['email']
// $currentUser['full_name']
// $currentUser['role']
// $currentUser['permissions']
// $currentUser['status']
```

#### Step 3: Check Category Access (Optional)
```php
$categoryId = $_GET['category_id'] ?? '';
requireCategoryAccess($categoryId, $currentUser);
```

#### Step 4: Check Permissions (Optional)
```php
requirePermission('manage_training', $currentUser);
```

#### Step 5: Log Activity (Optional)
```php
logUserActivity($currentUser['id'], 'view_training_data', [
    'category_id' => $categoryId,
    'action' => 'export'
]);
```

### Example: Protected API Endpoint

```php
<?php
// api/ai_training_export.php
require_once 'db_connect.php';
require_once 'ai_org_middleware.php';

// Verify authentication
$currentUser = requireAISpaceAuth();

// Get category ID from request
$categoryId = $_GET['category_id'] ?? '';
if (empty($categoryId)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Category ID required']);
    exit;
}

// Verify category access
requireCategoryAccess($categoryId, $currentUser);

// Verify permission
requirePermission('export_data', $currentUser);

// Log activity
logUserActivity($currentUser['id'], 'export_training_data', [
    'category_id' => $categoryId
]);

// Your export logic here...
$data = exportTrainingData($categoryId);

echo json_encode([
    'success' => true,
    'data' => $data,
    'exported_by' => $currentUser['full_name']
]);
?>
```

---

## 🚫 Common Mistakes to Avoid

### ❌ DON'T: Mix AutoFlow and AI Space Authentication
```php
// WRONG - Using AutoFlow user for AI Space
$userId = $_SESSION['user_id']; // This is AutoFlow user!
```

### ✅ DO: Use Correct Authentication for Each App
```php
// CORRECT - AI Space
$currentUser = requireAISpaceAuth();
$userId = $currentUser['id']; // This is AI Space user
```

### ❌ DON'T: Skip Authentication Checks
```php
// WRONG - No authentication
$categoryId = $_GET['category_id'];
$data = getTrainingData($categoryId); // Anyone can access!
```

### ✅ DO: Always Verify Authentication
```php
// CORRECT
$currentUser = requireAISpaceAuth();
requireCategoryAccess($categoryId, $currentUser);
$data = getTrainingData($categoryId);
```

---

## 📊 Database Tables

### AutoFlow Tables
- `users` - AutoFlow users
- `campaigns`
- `flows`
- `subscribers`
- `templates`
- `tags`
- `web_properties`
- `web_visitors`
- `meta_*` tables
- `zalo_*` tables

### AI Space Tables
- `ai_org_users` - Organization users
- `ai_org_user_categories` - User-category access mapping
- `ai_org_access_tokens` - API access tokens
- `ai_org_user_activity_logs` - Audit trail
- `ai_org_conversations` - Org chat conversations
- `ai_org_messages` - Org chat messages
- `ai_chatbots` - AI chatbots
- `ai_chatbot_settings` - Bot configurations
- `ai_conversations` - Customer conversations
- `ai_messages` - Customer messages
- `ai_training_docs` - Training documents

---

## 🔄 Migration Notes

If you need to migrate data or users between systems:

1. **DO NOT** directly copy user IDs
2. **DO** create proper mappings in a junction table
3. **DO** maintain separate authentication systems
4. **DO** log all cross-system operations

---

## 📝 Summary

| Feature | AutoFlow | AI Space |
|---------|----------|----------|
| **Purpose** | Marketing Automation | AI Chat & Workspace |
| **User Table** | `users` | `ai_org_users` |
| **Auth Method** | Session (`$_SESSION['user_id']`) | Session (`$_SESSION['org_user_id']`) or Token |
| **Middleware** | None | `ai_org_middleware.php` |
| **Routes** | `/campaigns`, `/flows`, etc. | `/chat-category/*` |
| **API Prefix** | `api/*.php` (general) | `api/ai_org_*.php`, `api/ai_*.php` |

---

## 🛡️ Security Checklist

- [ ] All AI Space API endpoints include `require_once 'ai_org_middleware.php'`
- [ ] All AI Space API endpoints call `requireAISpaceAuth()`
- [ ] Category-specific endpoints verify access with `requireCategoryAccess()`
- [ ] Sensitive operations check permissions with `requirePermission()`
- [ ] Important actions are logged with `logUserActivity()`
- [ ] No mixing of AutoFlow and AI Space user sessions
- [ ] CORS headers properly configured in `.htaccess`
- [ ] SQL injection prevention (prepared statements)
- [ ] XSS prevention (output escaping)

---

**Last Updated:** 2026-02-16
**Maintained By:** Development Team
