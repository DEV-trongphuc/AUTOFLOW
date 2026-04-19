<?php
/**
 * DATABASE OPTIMIZATION EXECUTOR
 * Tự động thực hiện các tối ưu được đề xuất
 */

ini_set('display_errors', 1);
error_reporting(E_ALL);
header('Content-Type: text/plain; charset=utf-8');
set_time_limit(600); // 10 minutes

require __DIR__ . '/db_connect.php';

echo "╔════════════════════════════════════════════════════════════════╗\n";
echo "║  DATABASE OPTIMIZATION EXECUTOR                                ║\n";
echo "║  " . date('Y-m-d H:i:s') . "                                          ║\n";
echo "╚════════════════════════════════════════════════════════════════╝\n\n";

$success = 0;
$failed = 0;

// ============================================
// STEP 1: ADD MISSING INDEXES
// ============================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";
echo "STEP 1: ADDING MISSING INDEXES\n";
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n";

$indexes = [
    ['table' => 'subscribers', 'column' => 'created_at', 'name' => 'idx_created_at'],
    ['table' => 'campaigns', 'column' => 'scheduled_at', 'name' => 'idx_scheduled_at'],
    ['table' => 'activity_buffer', 'column' => 'created_at', 'name' => 'idx_created_at'],
    ['table' => 'stats_update_buffer', 'column' => 'created_at', 'name' => 'idx_created_at']
];

foreach ($indexes as $idx) {
    try {
        // Check if index already exists
        $stmt = $pdo->query("SHOW INDEX FROM `{$idx['table']}` WHERE Key_name = '{$idx['name']}'");
        if ($stmt->rowCount() > 0) {
            echo "⏭️  Index {$idx['name']} on {$idx['table']} already exists, skipping...\n";
            continue;
        }

        echo "Adding index {$idx['name']} on {$idx['table']}.{$idx['column']}... ";
        $pdo->exec("ALTER TABLE `{$idx['table']}` ADD INDEX {$idx['name']} (`{$idx['column']}`)");
        echo "✅ Done\n";
        $success++;
    } catch (Exception $e) {
        echo "❌ Failed: " . $e->getMessage() . "\n";
        $failed++;
    }
}

echo "\n";

// ============================================
// STEP 2: CLEAN UP ORPHANED DATA
// ============================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";
echo "STEP 2: CLEANING UP ORPHANED DATA\n";
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n";

try {
    // Count orphaned records first
    $stmt = $pdo->query("
        SELECT COUNT(*) 
        FROM subscriber_activity sa
        LEFT JOIN flows f ON sa.flow_id = f.id
        WHERE f.id IS NULL
    ");
    $orphanedCount = $stmt->fetchColumn();

    if ($orphanedCount > 0) {
        echo "Found $orphanedCount orphaned subscriber_activity records...\n";
        echo "Deleting... ";

        $stmt = $pdo->exec("
            DELETE sa FROM subscriber_activity sa
            LEFT JOIN flows f ON sa.flow_id = f.id
            WHERE f.id IS NULL
        ");

        echo "✅ Deleted $stmt records\n";
        $success++;
    } else {
        echo "✅ No orphaned records found\n";
    }
} catch (Exception $e) {
    echo "❌ Failed: " . $e->getMessage() . "\n";
    $failed++;
}

echo "\n";

// ============================================
// STEP 3: OPTIMIZE FRAGMENTED TABLES
// ============================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";
echo "STEP 3: OPTIMIZING FRAGMENTED TABLES\n";
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n";

// Get tables with significant fragmentation (>2MB free space)
$stmt = $pdo->query("
    SELECT 
        TABLE_NAME,
        ROUND((DATA_FREE / 1024 / 1024), 2) AS free_mb
    FROM information_schema.TABLES
    WHERE TABLE_SCHEMA = DATABASE()
    AND DATA_FREE > 2097152
    ORDER BY DATA_FREE DESC
");

$fragmentedTables = $stmt->fetchAll(PDO::FETCH_ASSOC); // FIX: Use fetchAll()

if (empty($fragmentedTables)) {
    echo "✅ No fragmented tables found\n";
} else {
    echo "Found " . count($fragmentedTables) . " fragmented tables:\n\n";

    foreach ($fragmentedTables as $table) {
        echo "Optimizing {$table['TABLE_NAME']} ({$table['free_mb']}MB fragmented)... ";
        try {
            // Create new connection for OPTIMIZE TABLE to avoid buffering issues
            $optimizePdo = new PDO(
                "mysql:host=$host;dbname=$db;charset=$charset",
                $user,
                $pass,
                [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
            );
            $optimizePdo->exec("OPTIMIZE TABLE `{$table['TABLE_NAME']}`");
            $optimizePdo = null; // Close connection
            echo "✅ Done\n";
            $success++;
        } catch (Exception $e) {
            echo "❌ Failed: " . $e->getMessage() . "\n";
            $failed++;
        }
    }
}

echo "\n";

// ============================================
// STEP 4: ARCHIVE OLD QUEUE JOBS
// ============================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";
echo "STEP 4: ARCHIVING OLD QUEUE JOBS\n";
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n";

try {
    // Count old completed jobs (>7 days)
    $stmt = $pdo->query("
        SELECT COUNT(*) 
        FROM queue_jobs 
        WHERE status IN ('completed', 'failed') 
        AND created_at < DATE_SUB(NOW(), INTERVAL 7 DAY)
    ");
    $oldJobsCount = $stmt->fetchColumn();

    if ($oldJobsCount > 0) {
        echo "Found $oldJobsCount old queue jobs (>7 days)...\n";
        echo "Deleting... ";

        $deleted = $pdo->exec("
            DELETE FROM queue_jobs 
            WHERE status IN ('completed', 'failed') 
            AND created_at < DATE_SUB(NOW(), INTERVAL 7 DAY)
        ");

        echo "✅ Deleted $deleted records\n";
        $success++;
    } else {
        echo "✅ No old queue jobs to clean\n";
    }
} catch (Exception $e) {
    echo "❌ Failed: " . $e->getMessage() . "\n";
    $failed++;
}

echo "\n";

// ============================================
// STEP 5: CLEAN OLD WEB TRACKING DATA
// ============================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";
echo "STEP 5: CLEANING OLD WEB TRACKING DATA (>90 days)\n";
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n";

$trackingTables = ['web_events', 'web_page_views', 'raw_event_buffer'];

foreach ($trackingTables as $table) {
    try {
        $stmt = $pdo->query("
            SELECT COUNT(*) 
            FROM `$table` 
            WHERE created_at < DATE_SUB(NOW(), INTERVAL 90 DAY)
        ");
        $oldCount = $stmt->fetchColumn();

        if ($oldCount > 0) {
            echo "Cleaning $table ($oldCount old records)... ";
            $deleted = $pdo->exec("
                DELETE FROM `$table` 
                WHERE created_at < DATE_SUB(NOW(), INTERVAL 90 DAY)
                LIMIT 10000
            ");
            echo "✅ Deleted $deleted records\n";
            $success++;
        } else {
            echo "✅ $table: No old data to clean\n";
        }
    } catch (Exception $e) {
        echo "❌ $table failed: " . $e->getMessage() . "\n";
        $failed++;
    }
}

echo "\n";

// ============================================
// STEP 6: UPDATE TABLE STATISTICS
// ============================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";
echo "STEP 6: UPDATING TABLE STATISTICS\n";
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n";

$criticalTables = [
    'subscriber_activity',
    'subscriber_flow_states',
    'subscribers',
    'queue_jobs',
    'campaigns',
    'flows'
];

foreach ($criticalTables as $table) {
    try {
        echo "Analyzing $table... ";
        $pdo->exec("ANALYZE TABLE `$table`");
        echo "✅ Done\n";
        $success++;
    } catch (Exception $e) {
        echo "❌ Failed: " . $e->getMessage() . "\n";
        $failed++;
    }
}

echo "\n";

// ============================================
// SUMMARY
// ============================================
echo "╔════════════════════════════════════════════════════════════════╗\n";
echo "║  OPTIMIZATION SUMMARY                                          ║\n";
echo "╚════════════════════════════════════════════════════════════════╝\n\n";

echo "✅ Successful operations: $success\n";
echo "❌ Failed operations: $failed\n";

if ($failed == 0) {
    echo "\n🎉 All optimizations completed successfully!\n";
} else {
    echo "\n⚠️  Some optimizations failed. Please review the errors above.\n";
}

echo "\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";
echo "NEXT STEPS:\n";
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n";

echo "1. Run health check again to verify:\n";
echo "   https://automation.ideas.edu.vn/mail_api/system_health_check.php\n\n";

echo "2. Run DB optimization check to see improvements:\n";
echo "   https://automation.ideas.edu.vn/mail_api/db_optimization_check.php\n\n";

echo "3. Consider setting up a monthly cron job for maintenance:\n";
echo "   0 2 1 * * /usr/local/bin/php /home/vhvxoigh/automation.ideas.edu.vn/mail_api/db_optimize_executor.php > /dev/null 2>&1\n\n";

echo "Completed at: " . date('Y-m-d H:i:s') . "\n";
