# AI Space URL Slug Feature

## 📋 Overview
This document describes how to implement custom URL slugs for AI Space categories, allowing beautiful URLs like `/ai-space/ideas` instead of `/ai-space/category_6967a5c47b0ed`.

---

## 🎯 Feature Requirements

### Current State
- URL: `/ai-space/category_6967a5c47b0ed`
- Not user-friendly
- Hard to remember and share

### Desired State
- URL: `/ai-space/ideas` (or any custom slug)
- User-friendly
- Easy to remember and share
- Customizable via Group Management modal

---

## 🗄️ Database Changes

### Add `slug` column to `ai_chatbots` table

```sql
ALTER TABLE ai_chatbots 
ADD COLUMN slug VARCHAR(100) NULL UNIQUE AFTER name,
ADD INDEX idx_slug (slug);

-- Add constraint to ensure slug is URL-safe
ALTER TABLE ai_chatbots 
ADD CONSTRAINT chk_slug_format 
CHECK (slug REGEXP '^[a-z0-9-]+$');
```

### Migration Script
```sql
-- Update existing categories with auto-generated slugs
UPDATE ai_chatbots 
SET slug = LOWER(REPLACE(REPLACE(name, ' ', '-'), '_', '-'))
WHERE is_category = 1 AND slug IS NULL;

-- For categories without names, use ID-based slug
UPDATE ai_chatbots 
SET slug = CONCAT('category-', SUBSTRING(id, 1, 8))
WHERE is_category = 1 AND slug IS NULL;
```

---

## 🔧 Backend Implementation

### 1. API Endpoint: Get Category by Slug

**File**: `api/ai_chatbot_slug.php`

```php
<?php
require_once 'db_connect.php';

header('Content-Type: application/json');

$slug = $_GET['slug'] ?? '';

if (empty($slug)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Slug is required']);
    exit;
}

try {
    // Try to find by slug first
    $stmt = $pdo->prepare("
        SELECT id, name, slug, brand_color, description 
        FROM ai_chatbots 
        WHERE slug = ? AND is_category = 1
        LIMIT 1
    ");
    $stmt->execute([$slug]);
    $category = $stmt->fetch(PDO::FETCH_ASSOC);

    if ($category) {
        echo json_encode([
            'success' => true,
            'data' => $category
        ]);
    } else {
        // Fallback: check if slug is actually a category ID
        $stmt = $pdo->prepare("
            SELECT id, name, slug, brand_color, description 
            FROM ai_chatbots 
            WHERE id = ? AND is_category = 1
            LIMIT 1
        ");
        $stmt->execute([$slug]);
        $category = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($category) {
            echo json_encode([
                'success' => true,
                'data' => $category,
                'redirect_to_slug' => $category['slug'] // Suggest redirect
            ]);
        } else {
            http_response_code(404);
            echo json_encode([
                'success' => false,
                'message' => 'Category not found'
            ]);
        }
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Server error: ' . $e->getMessage()
    ]);
}
?>
```

### 2. API Endpoint: Update Category Slug

**File**: `api/ai_chatbot_settings.php` (add new action)

```php
// Add this to existing ai_chatbot_settings.php

if ($action === 'update_slug') {
    require_once 'ai_org_middleware.php';
    $currentUser = requireAISpaceAuth();
    requirePermission('manage_categories', $currentUser);

    $input = json_decode(file_get_contents('php://input'), true);
    $categoryId = $input['category_id'] ?? '';
    $newSlug = $input['slug'] ?? '';

    // Validate slug format
    if (!preg_match('/^[a-z0-9-]+$/', $newSlug)) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'Invalid slug format. Use only lowercase letters, numbers, and hyphens.'
        ]);
        exit;
    }

    // Check if slug is already taken
    $stmt = $pdo->prepare("SELECT id FROM ai_chatbots WHERE slug = ? AND id != ?");
    $stmt->execute([$newSlug, $categoryId]);
    if ($stmt->fetch()) {
        http_response_code(409);
        echo json_encode([
            'success' => false,
            'message' => 'This slug is already taken. Please choose another.'
        ]);
        exit;
    }

    // Update slug
    $stmt = $pdo->prepare("UPDATE ai_chatbots SET slug = ? WHERE id = ? AND is_category = 1");
    $stmt->execute([$newSlug, $categoryId]);

    echo json_encode([
        'success' => true,
        'message' => 'Slug updated successfully',
        'data' => ['slug' => $newSlug]
    ]);
    exit;
}
```

---

## 💻 Frontend Implementation

### 1. Slug Resolver Hook

**File**: `hooks/useCategorySlug.ts`

```typescript
import { useState, useEffect } from 'react';
import { api } from '../services/storageAdapter';

export function useCategorySlug(slugOrId: string) {
    const [categoryId, setCategoryId] = useState<string | null>(null);
    const [categoryData, setCategoryData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function resolveSlug() {
            try {
                setLoading(true);
                const response = await fetch(
                    `${api.baseUrl}/ai_chatbot_slug.php?slug=${slugOrId}`
                );
                const data = await response.json();

                if (data.success) {
                    setCategoryId(data.data.id);
                    setCategoryData(data.data);
                    
                    // If redirect is suggested, update URL
                    if (data.redirect_to_slug && data.data.slug !== slugOrId) {
                        window.history.replaceState(
                            null,
                            '',
                            `/ai-space/${data.data.slug}`
                        );
                    }
                } else {
                    setError(data.message || 'Category not found');
                }
            } catch (err) {
                setError('Failed to load category');
            } finally {
                setLoading(false);
            }
        }

        resolveSlug();
    }, [slugOrId]);

    return { categoryId, categoryData, loading, error };
}
```

### 2. Update CategoryChatPage

**File**: `pages/CategoryChatPage.tsx`

```typescript
import { useCategorySlug } from '../hooks/useCategorySlug';

// In CategoryChatPage component:
const { categoryId: categoryIdParam } = useParams<{ categoryId: string }>();
const { categoryId, categoryData, loading, error } = useCategorySlug(categoryIdParam!);

if (loading) {
    return <PremiumLoader message="Loading AI Space..." />;
}

if (error) {
    return (
        <div className="flex items-center justify-center h-screen">
            <div className="text-center">
                <h2 className="text-2xl font-bold text-red-600 mb-2">Category Not Found</h2>
                <p className="text-slate-600">{error}</p>
            </div>
        </div>
    );
}

// Use resolved categoryId for all operations
// ...rest of component
```

### 3. Add Slug Editor to Group Management Modal

**File**: `components/ai/org/OrgUserManager.tsx` (or create new modal)

```typescript
const [editingSlug, setEditingSlug] = useState(false);
const [newSlug, setNewSlug] = useState(categoryData?.slug || '');

const handleUpdateSlug = async () => {
    try {
        const response = await api.post('ai_chatbot_settings', {
            action: 'update_slug',
            category_id: categoryId,
            slug: newSlug
        });

        if (response.success) {
            toast.success('URL slug updated successfully!');
            setEditingSlug(false);
            // Redirect to new slug
            navigate(`/ai-space/${newSlug}`);
        } else {
            toast.error(response.message || 'Failed to update slug');
        }
    } catch (error) {
        toast.error('Error updating slug');
    }
};

// In JSX:
<div className="mb-6">
    <label className="block text-sm font-bold text-slate-700 mb-2">
        Custom URL Slug
    </label>
    <div className="flex items-center gap-2">
        <span className="text-slate-500">/ai-space/</span>
        {editingSlug ? (
            <input
                type="text"
                value={newSlug}
                onChange={(e) => setNewSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                className="flex-1 px-3 py-2 border border-slate-300 rounded-lg"
                placeholder="ideas"
                pattern="[a-z0-9-]+"
            />
        ) : (
            <span className="flex-1 px-3 py-2 bg-slate-50 rounded-lg font-mono">
                {categoryData?.slug || categoryId}
            </span>
        )}
        <button
            onClick={() => editingSlug ? handleUpdateSlug() : setEditingSlug(true)}
            className="px-4 py-2 bg-brand text-white rounded-lg hover:brightness-110"
        >
            {editingSlug ? 'Save' : 'Edit'}
        </button>
        {editingSlug && (
            <button
                onClick={() => {
                    setEditingSlug(false);
                    setNewSlug(categoryData?.slug || '');
                }}
                className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300"
            >
                Cancel
            </button>
        )}
    </div>
    <p className="text-xs text-slate-500 mt-1">
        Use only lowercase letters, numbers, and hyphens. This will be your public URL.
    </p>
</div>
```

---

## 🔄 URL Migration Strategy

### For Existing URLs
- Old URLs (`/ai-space/category_xxx`) will still work
- Backend will detect ID-based access and suggest redirect to slug
- Frontend will automatically update URL to slug version

### For New Categories
- Auto-generate slug from category name on creation
- Allow immediate customization in settings

---

## ✅ Testing Checklist

- [ ] Database migration runs successfully
- [ ] Existing categories get auto-generated slugs
- [ ] New categories can set custom slugs
- [ ] Slug validation works (lowercase, alphanumeric, hyphens only)
- [ ] Duplicate slug detection works
- [ ] Old ID-based URLs still work and redirect to slug
- [ ] Slug can be edited via Group Management modal
- [ ] URL updates in browser after slug change
- [ ] Sharing URLs use slug instead of ID

---

## 📝 Example Usage

### Before
```
https://automation.ideas.edu.vn/#/ai-space/category_6967a5c47b0ed
```

### After
```
https://automation.ideas.edu.vn/#/ai-space/ideas
```

---

**Status:** ✅ Route changed to `/ai-space/*`
**Next Step:** Implement slug feature following this guide

**Last Updated:** 2026-02-16
