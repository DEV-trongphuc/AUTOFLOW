<?php
/**
 * Migration: Add 'type' column to lists table
 * Purpose: Distinguish between static lists (Manual, Import, Split) and sync lists (Google Sheets, MISA, etc.)
 */

require_once 'db_connect.php';

try {
    echo "Starting migration: Add list type column...\n";

    // 1. Add 'type' column
    $pdo->exec("
        ALTER TABLE `lists` 
        ADD COLUMN `type` ENUM('static', 'sync') DEFAULT 'static' 
        AFTER `source`
    ");
    echo "✓ Added 'type' column\n";

    // 2. Update existing records based on source
    // Sync sources: Google Sheets, MISA CRM, etc.
    $pdo->exec("
        UPDATE `lists` 
        SET `type` = 'sync' 
        WHERE `source` IN ('Google Sheets', 'MISA CRM')
    ");
    echo "✓ Updated existing sync lists\n";

    // 3. Ensure all other lists are marked as static
    $pdo->exec("
        UPDATE `lists` 
        SET `type` = 'static' 
        WHERE `type` IS NULL OR `source` IN ('Manual', 'Import CSV', 'Bulk Import')
           OR `source` LIKE 'Split%'
    ");
    echo "✓ Updated existing static lists\n";

    echo "\n✅ Migration completed successfully!\n";
    echo "Lists now have a 'type' field to distinguish static vs sync lists.\n";

} catch (Exception $e) {
    echo "\n❌ Migration failed: " . $e->getMessage() . "\n";
    exit(1);
}
