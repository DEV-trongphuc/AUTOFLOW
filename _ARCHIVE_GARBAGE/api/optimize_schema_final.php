<?php
/**
 * DATABASE SCHEMA OPTIMIZER & STANDARDIZER
 * 
 * 1. Convert all property_id columns to CHAR(36) for UUID consistency
 * 2. Add Composite Indexes for high-performance reporting
 * 3. Verify Vector Binary columns
 */

// Disable output buffering and set error reporting
ini_set('display_errors', 1);
error_reporting(E_ALL);
set_time_limit(300); // 5 minutes execution time

header('Content-Type: text/plain; charset=UTF-8');

// Database configuration
require_once 'db_connect.php';

echo "--- STARTING DATABASE OPTIMIZATION ---\n\n";

try {
    // 1. STANDARDIZE PROPERTY_ID to CHAR(36)
    echo "STEP 1: Standardizing property_id to CHAR(36)...\n";

    $tablesToStandardize = [
        'ai_chatbot_settings',
        'ai_conversations',
        'ai_org_conversations',
        'ai_rag_search_cache',
        'ai_settings',
        'ai_suggested_links',
        'ai_term_stats',
        'ai_training_chunks',
        'ai_training_docs',
        'subscribers'
    ];

    foreach ($tablesToStandardize as $table) {
        try {
            // Check if table exists first
            $checkTable = $pdo->query("SHOW TABLES LIKE '$table'");
            if ($checkTable->rowCount() == 0) {
                echo "Skipping $table (Not found)\n";
                continue;
            }

            // Check column type
            $stmt = $pdo->prepare("SHOW COLUMNS FROM `$table` LIKE 'property_id'");
            $stmt->execute();
            $col = $stmt->fetch();

            if ($col) {
                $currentType = strtolower($col['Type']);
                if ($currentType !== 'char(36)') {
                    echo "  -> Converting $table.property_id from $currentType to char(36)... ";

                    // Run ALTER TABLE
                    // Note: We deliberately do verify data length here but assuming standard UUIDs.
                    // If data > 36 chars exists, strict mode might fail.
                    $pdo->exec("ALTER TABLE `$table` MODIFY `property_id` CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
                    echo "DONE.\n";
                } else {
                    echo "  -> $table.property_id is already CHAR(36). OK.\n";
                }
            } else {
                echo "  -> $table does not have property_id column.\n";
            }
        } catch (Exception $e) {
            echo "FAILED ($table): " . $e->getMessage() . "\n";
        }
    }
    echo "\n";


    // 2. CREATE COMPOSITE INDEXES
    echo "STEP 2: Creating Composite Indexes for Reporting...\n";

    $indexes = [
        [
            'table' => 'web_events',
            'name' => 'idx_prop_created',
            'cols' => ['property_id', 'created_at']
        ],
        [
            'table' => 'web_page_views',
            'name' => 'idx_prop_loaded',
            'cols' => ['property_id', 'loaded_at']
        ],
        [
            'table' => 'web_sessions',
            'name' => 'idx_prop_started',
            'cols' => ['property_id', 'started_at']
        ],
        [
            'table' => 'ai_conversations',
            'name' => 'idx_prop_updated',
            'cols' => ['property_id', 'updated_at']
        ],
        [
            'table' => 'subscribers',
            'name' => 'idx_prop_email', // Helps lookup subscribers by email within a property
            'cols' => ['property_id', 'email']
        ]
    ];

    foreach ($indexes as $idx) {
        $table = $idx['table'];
        $idxName = $idx['name'];
        $cols = implode(',', $idx['cols']);

        try {
            // Check if index exists
            $checkIdx = $pdo->query("SHOW INDEX FROM `$table` WHERE Key_name = '$idxName'");
            if ($checkIdx->rowCount() == 0) {
                echo "  -> Adding index $idxName ON $table($cols)... ";
                $pdo->exec("CREATE INDEX `$idxName` ON `$table` ($cols)");
                echo "DONE.\n";
            } else {
                echo "  -> Index $idxName ON $table already exists. OK.\n";
            }
        } catch (Exception $e) {
            echo "FAILED ($table): " . $e->getMessage() . "\n";
        }
    }
    echo "\n";

    // 3. VERIFY VECTOR STORAGE
    echo "STEP 3: Verifying Vector Storage...\n";
    $vectorTables = ['ai_training_chunks' => 'embedding_binary', 'ai_vector_cache' => 'vector_binary'];

    foreach ($vectorTables as $table => $col) {
        try {
            $stmt = $pdo->prepare("SHOW COLUMNS FROM `$table` LIKE '$col'");
            $stmt->execute();
            if ($stmt->rowCount() > 0) {
                echo "  -> $table.$col exists (Binary Storage). OK.\n";
            } else {
                echo "  -> $table.$col MISSING. Adding LONGBLOB column...\n";
                $pdo->exec("ALTER TABLE `$table` ADD `$col` LONGBLOB DEFAULT NULL");
                echo "     DONE. (Note: Run migrate_binary_vectors.php to populate data if needed)\n";
            }
        } catch (Exception $e) {
            echo "FAILED ($table): " . $e->getMessage() . "\n";
        }
    }

    echo "\n--- OPTIMIZATION COMPLETE ---\n";

} catch (Exception $e) {
    echo "FATAL ERROR: " . $e->getMessage();
}
