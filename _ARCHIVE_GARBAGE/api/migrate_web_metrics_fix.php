<?php
/**
 * Migration: Fix Web Tracking Metrics
 * 1. Backfills is_entrance for historic data
 * 2. Recalculates is_bounce for all sessions
 */

require_once 'db_connect.php';

try {
    echo "Starting Web Metrics Fix Migration...\n";

    // 1. Ensure Column Exists
    echo "Checking schema...\n";
    $checkCols = $pdo->query("SHOW COLUMNS FROM web_page_views LIKE 'is_entrance'");
    if ($checkCols->rowCount() == 0) {
        $pdo->exec("ALTER TABLE web_page_views ADD COLUMN is_entrance TINYINT(1) DEFAULT 0 AFTER load_time_ms");
        echo "Column 'is_entrance' added.\n";
    }

    // 2. Clear is_entrance for fresh backfill (optional but safer)
    echo "Resetting entrance flags...\n";
    $pdo->exec("UPDATE web_page_views SET is_entrance = 0");

    // 3. Backfill is_entrance
    echo "Backfilling is_entrance (matching MIN(id) per session)...\n";
    $sqlEntrance = "
        UPDATE web_page_views pv
        JOIN (
            SELECT session_id, MIN(id) as entrance_id
            FROM web_page_views
            GROUP BY session_id
        ) e ON pv.id = e.entrance_id
        SET pv.is_entrance = 1
    ";
    $affectedEntrance = $pdo->exec($sqlEntrance);
    echo "Backfilled is_entrance for $affectedEntrance records.\n";

    // 4. Recalculate is_bounce for sessions
    echo "Recalculating is_bounce for all sessions...\n";
    $sqlBounce = "
        UPDATE web_sessions s
        SET is_bounce = CASE
            WHEN s.page_count > 1 THEN 0
            WHEN EXISTS (
                SELECT 1 FROM web_events 
                WHERE session_id = s.id 
                AND event_type IN ('click', 'canvas_click', 'form')
                LIMIT 1
            ) THEN 0
            ELSE 1
        END
        WHERE property_id IS NOT NULL
    ";
    $affectedBounce = $pdo->exec($sqlBounce);
    echo "Recalculated is_bounce for $affectedBounce sessions.\n";

    // 5. [OPTIONAL] Ensure Index exists for performance
    echo "Checking indexes...\n";
    try {
        $pdo->exec("CREATE INDEX idx_entrance ON web_page_views (property_id, is_entrance)");
        echo "Index 'idx_entrance' created.\n";
    } catch (Exception $e) {
        echo "Index check: " . $e->getMessage() . " (likely already exists)\n";
    }

    // 6. Summary
    $stmt = $pdo->query("
        SELECT 
            COUNT(*) as total_sessions,
            SUM(is_bounce) as bounced,
            ROUND((SUM(is_bounce) / NULLIF(COUNT(*), 0)) * 100, 2) as global_rate
        FROM web_sessions
    ");
    $stats = $stmt->fetch(PDO::FETCH_ASSOC);

    echo "\n=== Migration Summary ===\n";
    echo "Total Sessions: " . $stats['total_sessions'] . "\n";
    echo "Bounced Sessions: " . $stats['bounced'] . "\n";
    echo "New Global Bounce Rate: " . ($stats['global_rate'] ?? 0) . "%\n";
    echo "\nMigration completed successfully!\n";

} catch (Exception $e) {
    echo "ERROR: " . $e->getMessage() . "\n";
    exit(1);
}
