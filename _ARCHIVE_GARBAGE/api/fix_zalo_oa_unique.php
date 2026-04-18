<?php
/**
 * Fix: Duplicate entry '' for key 'unique_oa_id'
 * 
 * Root cause: zalo_oa_configs.oa_id is NOT NULL, so pending OAuth rows
 * (status='verifying') get oa_id='' (empty string). The UNIQUE constraint
 * then rejects a second "Kết nối mới" attempt with "Duplicate entry ''".
 *
 * Fix: Allow oa_id to be NULL during verification, and drop the blanket
 * UNIQUE constraint — instead enforce uniqueness at application level
 * (or via a partial index if MySQL 8+ supports it).
 */

require_once __DIR__ . '/db_connect.php';

$steps = [];
$errors = [];

// Step 1: Allow NULL on oa_id
try {
    $pdo->exec("ALTER TABLE zalo_oa_configs MODIFY COLUMN oa_id VARCHAR(255) NULL DEFAULT NULL COMMENT 'Zalo Official Account ID'");
    $steps[] = "✅ oa_id column changed to NULL-able";
} catch (Exception $e) {
    $errors[] = "oa_id modify: " . $e->getMessage();
}

// Step 2: Clean up stale empty-string oa_id values → set to NULL
try {
    $affected = $pdo->exec("UPDATE zalo_oa_configs SET oa_id = NULL WHERE oa_id = '' OR oa_id IS NULL");
    $steps[] = "✅ Cleaned $affected rows with empty oa_id → NULL";
} catch (Exception $e) {
    $errors[] = "Cleanup: " . $e->getMessage();
}

// Step 3: Drop old unique index (enforced on empty string too)
try {
    // Check if index exists first
    $stmt = $pdo->query("SHOW INDEX FROM zalo_oa_configs WHERE Key_name = 'unique_oa_id'");
    if ($stmt->fetch()) {
        $pdo->exec("ALTER TABLE zalo_oa_configs DROP INDEX unique_oa_id");
        $steps[] = "✅ Dropped old unique_oa_id index";
    } else {
        $steps[] = "ℹ️ unique_oa_id index not found (already dropped or renamed)";
    }
} catch (Exception $e) {
    $errors[] = "Drop index: " . $e->getMessage();
}

// Step 4: Re-create unique index but only for non-NULL values
// MySQL does NOT enforce uniqueness for NULL values — multiple NULLs are allowed.
try {
    // Check if already exists
    $stmt = $pdo->query("SHOW INDEX FROM zalo_oa_configs WHERE Key_name = 'unique_oa_id'");
    if (!$stmt->fetch()) {
        $pdo->exec("ALTER TABLE zalo_oa_configs ADD UNIQUE KEY unique_oa_id (oa_id)");
        $steps[] = "✅ Re-created unique_oa_id index (NULL values are now allowed — MySQL ignores NULLs in unique constraints)";
    }
} catch (Exception $e) {
    $errors[] = "Re-create index: " . $e->getMessage();
}

// Step 5: Also clean up old verifying rows with no oa_id (older than 24h)
try {
    $affected = $pdo->exec("DELETE FROM zalo_oa_configs WHERE status = 'verifying' AND (oa_id IS NULL OR oa_id = '') AND created_at < DATE_SUB(NOW(), INTERVAL 24 HOUR)");
    $steps[] = "✅ Purged $affected stale verifying rows (>24h old, no oa_id)";
} catch (Exception $e) {
    $errors[] = "Purge stale: " . $e->getMessage();
}

// Output
header('Content-Type: text/plain; charset=utf-8');
echo "=== Fix: zalo_oa_configs unique_oa_id ===\n\n";
foreach ($steps as $s)
    echo $s . "\n";
if ($errors) {
    echo "\n⚠️ Errors:\n";
    foreach ($errors as $e)
        echo "  - $e\n";
} else {
    echo "\n✅ All done! No errors.\n";
}

echo "\nCurrent status of zalo_oa_configs:\n";
$rows = $pdo->query("SELECT id, name, oa_id, status, created_at FROM zalo_oa_configs ORDER BY created_at DESC LIMIT 20")->fetchAll(PDO::FETCH_ASSOC);
foreach ($rows as $r) {
    echo "  [{$r['status']}] {$r['name']} | oa_id=" . ($r['oa_id'] ?? 'NULL') . " | created={$r['created_at']}\n";
}
