<?php
/**
 * migrate_org_isolation.php
 * 
 * ONE-TIME MIGRATION: Add `admin_id` column to `ai_org_users` to enforce
 * organisation-level data isolation in AI Space.
 * 
 * Run from browser: https://yourdomain.com/api/migrate_org_isolation.php
 * 
 * SAFE: Uses IF NOT EXISTS / IGNORE so it can be run multiple times safely.
 */

require_once 'db_connect.php';
require_once 'ai_org_middleware.php';

// Only allow the Autoflow admin to run this migration
$currentOrgUser = requireAISpaceAuth();
if (($currentOrgUser['role'] ?? '') !== 'admin' && ($GLOBALS['current_admin_id'] ?? '') !== 'admin-001') {
    http_response_code(403);
    die(json_encode(['success' => false, 'message' => 'Access denied']));
}

header('Content-Type: application/json');

$results = [];
$errors = [];

// ── Step 1: Add admin_id column to ai_org_users ──────────────────────────────
try {
    $checkCol = $pdo->query("SHOW COLUMNS FROM ai_org_users LIKE 'admin_id'");
    if ($checkCol->rowCount() === 0) {
        $pdo->exec("ALTER TABLE ai_org_users 
            ADD COLUMN `admin_id` VARCHAR(100) DEFAULT NULL 
            COMMENT 'Autoflow platform owner/admin ID — used for org isolation'
            AFTER `user_id`");
        $results[] = "✅ Added column ai_org_users.admin_id";
    } else {
        $results[] = "⏭️  Column ai_org_users.admin_id already exists — skipped";
    }
} catch (Exception $e) {
    $errors[] = "❌ Failed to add ai_org_users.admin_id: " . $e->getMessage();
}

// ── Step 2: Index the new column for fast scoped queries ─────────────────────
try {
    $checkIdx = $pdo->query("SHOW INDEX FROM ai_org_users WHERE Key_name = 'idx_admin_id'");
    if ($checkIdx->rowCount() === 0) {
        $pdo->exec("ALTER TABLE ai_org_users ADD INDEX idx_admin_id (admin_id)");
        $results[] = "✅ Added index idx_admin_id on ai_org_users.admin_id";
    } else {
        $results[] = "⏭️  Index idx_admin_id already exists — skipped";
    }
} catch (Exception $e) {
    $errors[] = "❌ Failed to add index: " . $e->getMessage();
}

// ── Step 3: Backfill existing users from ai_chatbot_categories ───────────────
// Strategy: For each ai_chatbot_categories record (which already has admin_id),
// find org users who belong to that category via ai_org_user_categories,
// and stamp their admin_id if missing.
try {
    $stmt = $pdo->query("
        SELECT DISTINCT ouc.user_id, cc.admin_id 
        FROM ai_org_user_categories ouc
        JOIN ai_chatbot_categories cc ON ouc.category_id = cc.id
        WHERE cc.admin_id IS NOT NULL
    ");
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
    $updated = 0;
    foreach ($rows as $row) {
        $up = $pdo->prepare("UPDATE ai_org_users SET admin_id = ? WHERE id = ? AND (admin_id IS NULL OR admin_id = '')");
        $up->execute([$row['admin_id'], $row['user_id']]);
        $updated += $up->rowCount();
    }
    $results[] = "✅ Backfilled admin_id for $updated existing users via category links";
} catch (Exception $e) {
    $errors[] = "❌ Backfill via categories failed: " . $e->getMessage();
}

// ── Step 4: Add status_reason / status_expiry columns if missing (backwards compat) ──
try {
    $pdo->exec("ALTER TABLE ai_org_users ADD COLUMN IF NOT EXISTS status_reason TEXT AFTER status");
    $pdo->exec("ALTER TABLE ai_org_users ADD COLUMN IF NOT EXISTS status_expiry DATETIME AFTER status_reason");
    $results[] = "✅ Ensured status_reason / status_expiry columns exist";
} catch (Exception $e) {
    $results[] = "ℹ️  status_reason/status_expiry: " . $e->getMessage();
}

// ── Summary ───────────────────────────────────────────────────────────────────
echo json_encode([
    'success' => empty($errors),
    'results' => $results,
    'errors' => $errors,
    'message' => empty($errors)
        ? 'Migration completed successfully. Org isolation is now active.'
        : 'Migration finished with some errors. Check the errors array.'
], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
