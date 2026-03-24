<?php
/**
 * DATABASE OPTIMIZATION ANALYZER
 * Phân tích toàn bộ database để tìm các vấn đề cần tối ưu
 */

ini_set('display_errors', 1);
ini_set('log_errors', 1);
error_reporting(E_ALL);
header('Content-Type: text/plain; charset=utf-8');
set_time_limit(300); // 5 minutes

require __DIR__ . '/db_connect.php';

echo "╔════════════════════════════════════════════════════════════════╗\n";
echo "║  DATABASE OPTIMIZATION ANALYZER                                ║\n";
echo "║  " . date('Y-m-d H:i:s') . "                                          ║\n";
echo "╚════════════════════════════════════════════════════════════════╝\n\n";

$warnings = [];
$recommendations = [];

// ============================================
// 1. DATABASE SIZE & TABLE STATISTICS
// ============================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";
echo "1. DATABASE SIZE & TABLE STATISTICS\n";
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n";

// Get database name
$stmt = $pdo->query("SELECT DATABASE()");
$dbName = $stmt->fetchColumn();
echo "Database: $dbName\n\n";

// Get all tables with size info
$stmt = $pdo->query("
    SELECT 
        TABLE_NAME,
        TABLE_ROWS,
        ROUND(((DATA_LENGTH + INDEX_LENGTH) / 1024 / 1024), 2) AS size_mb,
        ROUND((DATA_LENGTH / 1024 / 1024), 2) AS data_mb,
        ROUND((INDEX_LENGTH / 1024 / 1024), 2) AS index_mb,
        ROUND((DATA_FREE / 1024 / 1024), 2) AS free_mb,
        ENGINE,
        TABLE_COLLATION
    FROM information_schema.TABLES
    WHERE TABLE_SCHEMA = '$dbName'
    ORDER BY (DATA_LENGTH + INDEX_LENGTH) DESC
");

$tables = $stmt->fetchAll(PDO::FETCH_ASSOC);
$totalSize = 0;
$totalRows = 0;
$totalFree = 0;

printf("%-35s %12s %10s %10s %10s %10s\n", "TABLE", "ROWS", "SIZE(MB)", "DATA(MB)", "INDEX(MB)", "FREE(MB)");
echo str_repeat("─", 100) . "\n";

foreach ($tables as $table) {
    printf(
        "%-35s %12s %10s %10s %10s %10s\n",
        $table['TABLE_NAME'],
        number_format($table['TABLE_ROWS']),
        $table['size_mb'],
        $table['data_mb'],
        $table['index_mb'],
        $table['free_mb']
    );

    $totalSize += $table['size_mb'];
    $totalRows += $table['TABLE_ROWS'];
    $totalFree += $table['free_mb'];

    // Warnings
    if ($table['free_mb'] > 100) {
        $warnings[] = "Table '{$table['TABLE_NAME']}' has {$table['free_mb']}MB fragmented space";
        $recommendations[] = "Run: OPTIMIZE TABLE `{$table['TABLE_NAME']}`";
    }

    if ($table['size_mb'] > 1000) {
        $warnings[] = "Table '{$table['TABLE_NAME']}' is very large ({$table['size_mb']}MB)";
    }
}

echo str_repeat("─", 100) . "\n";
printf("%-35s %12s %10s\n", "TOTAL", number_format($totalRows), number_format($totalSize, 2));

echo "\n📊 Summary:\n";
echo "  Total Size: " . number_format($totalSize, 2) . " MB\n";
echo "  Total Rows: " . number_format($totalRows) . "\n";
echo "  Fragmented Space: " . number_format($totalFree, 2) . " MB\n";

if ($totalFree > 50) {
    echo "  ⚠️  High fragmentation detected!\n";
}

echo "\n";

// ============================================
// 2. INDEX ANALYSIS
// ============================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";
echo "2. INDEX ANALYSIS\n";
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n";

// Check for missing indexes on important columns
$criticalTables = [
    'subscriber_activity' => ['flow_id', 'subscriber_id', 'type', 'created_at', 'reference_id'],
    'subscriber_flow_states' => ['flow_id', 'subscriber_id', 'status', 'updated_at'],
    'subscribers' => ['email', 'created_at', 'status'],
    'campaigns' => ['status', 'scheduled_at'],
    'flows' => ['status'],
    'activity_buffer' => ['processed', 'created_at'],
    'stats_update_buffer' => ['processed', 'created_at']
];

foreach ($criticalTables as $tableName => $columns) {
    // Check if table exists
    $stmt = $pdo->query("SHOW TABLES LIKE '$tableName'");
    if ($stmt->rowCount() == 0)
        continue;

    // Get existing indexes
    $stmt = $pdo->query("SHOW INDEX FROM `$tableName`");
    $indexes = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $indexedColumns = [];
    foreach ($indexes as $idx) {
        $indexedColumns[] = $idx['Column_name'];
    }

    echo "Table: $tableName\n";
    foreach ($columns as $col) {
        if (in_array($col, $indexedColumns)) {
            echo "  ✅ $col (indexed)\n";
        } else {
            echo "  ❌ $col (NOT indexed)\n";
            $recommendations[] = "Add index on `$tableName`.`$col`: ALTER TABLE `$tableName` ADD INDEX idx_$col (`$col`)";
        }
    }
    echo "\n";
}

// ============================================
// 3. DATA QUALITY ISSUES
// ============================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";
echo "3. DATA QUALITY ISSUES\n";
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n";

// Check for orphaned records
echo "Checking for orphaned records...\n\n";

// Orphaned subscriber_activity (flow doesn't exist)
$stmt = $pdo->query("
    SELECT COUNT(*) 
    FROM subscriber_activity sa
    LEFT JOIN flows f ON sa.flow_id = f.id
    WHERE f.id IS NULL
");
$orphanedActivity = $stmt->fetchColumn();
if ($orphanedActivity > 0) {
    echo "⚠️  Orphaned subscriber_activity: " . number_format($orphanedActivity) . " records\n";
    $warnings[] = "$orphanedActivity subscriber_activity records reference non-existent flows";
    $recommendations[] = "Clean up: DELETE FROM subscriber_activity WHERE flow_id NOT IN (SELECT id FROM flows)";
}

// Orphaned subscriber_flow_states
$stmt = $pdo->query("
    SELECT COUNT(*) 
    FROM subscriber_flow_states sfs
    LEFT JOIN flows f ON sfs.flow_id = f.id
    WHERE f.id IS NULL
");
$orphanedStates = $stmt->fetchColumn();
if ($orphanedStates > 0) {
    echo "⚠️  Orphaned subscriber_flow_states: " . number_format($orphanedStates) . " records\n";
    $warnings[] = "$orphanedStates subscriber_flow_states records reference non-existent flows";
    $recommendations[] = "Clean up: DELETE FROM subscriber_flow_states WHERE flow_id NOT IN (SELECT id FROM flows)";
}

// Old processed buffer data
$stmt = $pdo->query("
    SELECT COUNT(*) 
    FROM activity_buffer 
    WHERE processed = 1 AND created_at < DATE_SUB(NOW(), INTERVAL 30 DAY)
");
$oldBufferActivity = $stmt->fetchColumn();
if ($oldBufferActivity > 0) {
    echo "⚠️  Old processed activity_buffer: " . number_format($oldBufferActivity) . " records (>30 days)\n";
    $recommendations[] = "Archive old buffer: DELETE FROM activity_buffer WHERE processed = 1 AND created_at < DATE_SUB(NOW(), INTERVAL 30 DAY)";
}

$stmt = $pdo->query("
    SELECT COUNT(*) 
    FROM stats_update_buffer 
    WHERE processed = 1 AND created_at < DATE_SUB(NOW(), INTERVAL 30 DAY)
");
$oldBufferStats = $stmt->fetchColumn();
if ($oldBufferStats > 0) {
    echo "⚠️  Old processed stats_update_buffer: " . number_format($oldBufferStats) . " records (>30 days)\n";
    $recommendations[] = "Archive old buffer: DELETE FROM stats_update_buffer WHERE processed = 1 AND created_at < DATE_SUB(NOW(), INTERVAL 30 DAY)";
}

if ($orphanedActivity == 0 && $orphanedStates == 0 && $oldBufferActivity == 0 && $oldBufferStats == 0) {
    echo "✅ No data quality issues found\n";
}

echo "\n";

// ============================================
// 4. PERFORMANCE BOTTLENECKS
// ============================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";
echo "4. PERFORMANCE BOTTLENECKS\n";
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n";

// Check for tables without primary key
foreach ($tables as $table) {
    $stmt = $pdo->query("SHOW KEYS FROM `{$table['TABLE_NAME']}` WHERE Key_name = 'PRIMARY'");
    if ($stmt->rowCount() == 0) {
        echo "❌ Table '{$table['TABLE_NAME']}' has NO PRIMARY KEY\n";
        $warnings[] = "Table '{$table['TABLE_NAME']}' missing primary key";
    }
}

// Check for slow query potential
$stmt = $pdo->query("
    SELECT TABLE_NAME, TABLE_ROWS 
    FROM information_schema.TABLES 
    WHERE TABLE_SCHEMA = '$dbName' 
    AND TABLE_ROWS > 100000
    ORDER BY TABLE_ROWS DESC
");
$largeTables = $stmt->fetchAll(PDO::FETCH_ASSOC);

if (!empty($largeTables)) {
    echo "\n⚠️  Large tables (potential slow queries):\n";
    foreach ($largeTables as $lt) {
        echo "  - {$lt['TABLE_NAME']}: " . number_format($lt['TABLE_ROWS']) . " rows\n";
    }
    $recommendations[] = "Consider partitioning large tables or archiving old data";
}

echo "\n";

// ============================================
// 5. STORAGE ENGINE CHECK
// ============================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";
echo "5. STORAGE ENGINE CHECK\n";
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n";

$engines = [];
foreach ($tables as $table) {
    $engine = $table['ENGINE'];
    if (!isset($engines[$engine])) {
        $engines[$engine] = 0;
    }
    $engines[$engine]++;

    if ($engine != 'InnoDB') {
        echo "⚠️  Table '{$table['TABLE_NAME']}' uses $engine (recommend InnoDB)\n";
        $recommendations[] = "Convert to InnoDB: ALTER TABLE `{$table['TABLE_NAME']}` ENGINE=InnoDB";
    }
}

echo "\nEngine distribution:\n";
foreach ($engines as $engine => $count) {
    echo "  $engine: $count tables\n";
}

echo "\n";

// ============================================
// 6. COLLATION CHECK
// ============================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";
echo "6. COLLATION CHECK\n";
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n";

$collations = [];
foreach ($tables as $table) {
    $collation = $table['TABLE_COLLATION'];
    if (!isset($collations[$collation])) {
        $collations[$collation] = 0;
    }
    $collations[$collation]++;
}

echo "Collation distribution:\n";
foreach ($collations as $collation => $count) {
    echo "  $collation: $count tables\n";
}

if (count($collations) > 1) {
    echo "\n⚠️  Multiple collations detected - may cause performance issues in JOINs\n";
    $recommendations[] = "Standardize collation across all tables (recommend utf8mb4_unicode_ci)";
}

echo "\n";

// ============================================
// SUMMARY & RECOMMENDATIONS
// ============================================
echo "╔════════════════════════════════════════════════════════════════╗\n";
echo "║  SUMMARY & RECOMMENDATIONS                                     ║\n";
echo "╚════════════════════════════════════════════════════════════════╝\n\n";

echo "🔴 Warnings: " . count($warnings) . "\n";
if (!empty($warnings)) {
    foreach ($warnings as $i => $warn) {
        echo "   " . ($i + 1) . ". $warn\n";
    }
}

echo "\n💡 Recommendations: " . count($recommendations) . "\n";
if (!empty($recommendations)) {
    foreach ($recommendations as $i => $rec) {
        echo "   " . ($i + 1) . ". $rec\n";
    }
}

echo "\n";

// ============================================
// OPTIMIZATION SCRIPT GENERATOR
// ============================================
if (!empty($recommendations)) {
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";
    echo "AUTO-GENERATED OPTIMIZATION SCRIPT\n";
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n";
    echo "-- Copy and run these SQL commands to optimize your database:\n";
    echo "-- WARNING: Always backup before running optimization commands!\n\n";

    foreach ($recommendations as $rec) {
        if (strpos($rec, 'ALTER TABLE') !== false || strpos($rec, 'DELETE FROM') !== false || strpos($rec, 'OPTIMIZE TABLE') !== false) {
            echo $rec . ";\n";
        }
    }

    echo "\n-- Optimize all tables with fragmentation:\n";
    foreach ($tables as $table) {
        if ($table['free_mb'] > 10) {
            echo "OPTIMIZE TABLE `{$table['TABLE_NAME']}`;\n";
        }
    }
}

echo "\n";
echo "Report completed at: " . date('Y-m-d H:i:s') . "\n";
