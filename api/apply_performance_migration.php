<?php
// api/apply_performance_migration.php
// Performance Audit Migration Script
// Creates buffer tables and applies strategic indexes

require_once 'db_connect.php';

echo "Starting Performance Migration...\n";

try {
    // 1. raw_event_buffer
    $pdo->exec("CREATE TABLE IF NOT EXISTS raw_event_buffer (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        type VARCHAR(50) NOT NULL,
        payload JSON NOT NULL,
        processed TINYINT(1) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_processed (processed)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;");
    echo "[OK] raw_event_buffer checked/created.\n";

    // 2. activity_buffer
    $pdo->exec("CREATE TABLE IF NOT EXISTS activity_buffer (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        subscriber_id char(36) NOT NULL,
        type VARCHAR(50) NOT NULL,
        details TEXT,
        reference_id VARCHAR(100),
        flow_id VARCHAR(50),
        campaign_id VARCHAR(50),
        extra_data JSON,
        processed TINYINT(1) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_processed (processed)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;");
    echo "[OK] activity_buffer checked/created.\n";

    // 3. stats_update_buffer
    $pdo->exec("CREATE TABLE IF NOT EXISTS stats_update_buffer (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        target_table VARCHAR(50) NOT NULL,
        target_id VARCHAR(100) NOT NULL,
        column_name VARCHAR(50) NOT NULL,
        increment INT DEFAULT 1,
        batch_id VARCHAR(50) DEFAULT NULL,
        processed TINYINT(1) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_batch (batch_id),
        INDEX idx_processed (processed)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;");
    echo "[OK] stats_update_buffer checked/created.\n";

    // 4. Strategic Indexes
    // Check if index exists before adding to avoid errors (MySQL doesn't support IF NOT EXISTS for indexes easily in simple SQL)
    // We use a helper function.

    function addIndexIfNotExists($pdo, $table, $indexName, $columns)
    {
        $stmt = $pdo->prepare("SELECT COUNT(1) FROM INFORMATION_SCHEMA.STATISTICS WHERE table_schema = DATABASE() AND table_name = ? AND index_name = ?");
        $stmt->execute([$table, $indexName]);
        if ($stmt->fetchColumn() == 0) {
            $pdo->exec("ALTER TABLE $table ADD INDEX $indexName ($columns)");
            echo "[OK] Index $indexName added to $table.\n";
        } else {
            echo "[SKIP] Index $indexName already exists on $table.\n";
        }
    }

    addIndexIfNotExists($pdo, 'subscriber_activity', 'idx_sub_type_date', 'subscriber_id, type, created_at');
    addIndexIfNotExists($pdo, 'subscriber_flow_states', 'idx_status_created', 'status, created_at');
    addIndexIfNotExists($pdo, 'subscriber_flow_states', 'idx_sub_flow_step', 'subscriber_id, flow_id, step_id');

    // [WEBHOOK FIX] Composite index for zalo_message_queue:
    // FOR UPDATE without this index = Table Lock (all users blocked).
    // With this index = Row Lock per user only. Critical for concurrent Zalo webhooks.
    addIndexIfNotExists($pdo, 'zalo_message_queue', 'idx_queue_user_proc', 'zalo_user_id, processed');

    // [WEBHOOK FIX] Index for fast duplicate-event detection in zalo_subscriber_activity:
    // Deduplication check (SELECT id WHERE zalo_msg_id = ?) runs on every Zalo webhook.
    addIndexIfNotExists($pdo, 'zalo_subscriber_activity', 'idx_zalo_msg_id', 'zalo_msg_id');

    // [CONFLICT-2 FIX] stats_update_buffer.target_table was ENUM — extend to VARCHAR(50)
    // so 'zalo_subscribers' inserts don't fail silently in strict mode.
    try {
        $colCheck = $pdo->query("SHOW COLUMNS FROM stats_update_buffer LIKE 'target_table'");
        $colInfo = $colCheck ? $colCheck->fetch(PDO::FETCH_ASSOC) : null;
        if ($colInfo && strpos($colInfo['Type'], 'enum') !== false) {
            $pdo->exec("ALTER TABLE stats_update_buffer MODIFY COLUMN target_table VARCHAR(50) NOT NULL");
            echo "[OK] stats_update_buffer.target_table converted from ENUM to VARCHAR(50).\n";
        } else {
            echo "[SKIP] stats_update_buffer.target_table already VARCHAR or not found.\n";
        }
    } catch (Exception $e) {
        echo "[WARN] Could not migrate target_table column: " . $e->getMessage() . "\n";
    }

    echo "Migration Completed Successfully.\n";

} catch (Exception $e) {
    echo "[ERROR] Migration Failed: " . $e->getMessage() . "\n";
}
