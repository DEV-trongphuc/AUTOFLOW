<?php
// api/check_optimization.php
require_once 'db_connect.php';

header('Content-Type: text/plain');
echo "--- SYSTEM OPTIMIZATION CHECK ---\n\n";

// 1. Check Indexes
$tables = ['web_page_views', 'web_sessions', 'web_events', 'web_visitors'];
$missingIndexes = [];

foreach ($tables as $table) {
    echo "Checking Table: $table...\n";
    $stmt = $pdo->query("SHOW INDEX FROM $table");
    $indexes = $stmt->fetchAll(PDO::FETCH_ASSOC);
    $indexNames = array_column($indexes, 'Key_name');
    $columns = array_column($indexes, 'Column_name');

    // Define critical columns for high performance
    $critical = [];
    if ($table === 'web_page_views')
        $critical = ['visitor_id', 'session_id', 'property_id', 'url_hash', 'loaded_at'];
    if ($table === 'web_sessions')
        $critical = ['visitor_id', 'property_id', 'last_active_at'];
    if ($table === 'web_events')
        $critical = ['created_at', 'visitor_id', 'page_view_id'];
    if ($table === 'web_visitors')
        $critical = ['property_id', 'last_visit_at'];

    foreach ($critical as $col) {
        $found = false;
        foreach ($indexes as $idx) {
            if ($idx['Column_name'] === $col) {
                $found = true;
                break;
            }
        }
        if (!$found) {
            echo "   [WARNING] Missing Index for column: $col\n";
            $missingIndexes[] = "ALTER TABLE $table ADD INDEX idx_{$col} ($col);";
        } else {
            echo "   [OK] Index exists for: $col\n";
        }
    }
    echo "\n";
}

if (!empty($missingIndexes)) {
    echo "--- SUGGESTED OPTIMIZATIONS ---\n";
    echo "To optimize for millions of users, execute the following SQL:\n\n";
    foreach ($missingIndexes as $sql) {
        echo "$sql\n";
    }

    // Auto-fix option
    echo "\nApplying optimizations automatically...\n";
    foreach ($missingIndexes as $sql) {
        try {
            $pdo->exec($sql);
            echo "   [SUCCESS] Executed: $sql\n";
        } catch (Exception $e) {
            echo "   [ERROR] Failed to execute $sql: " . $e->getMessage() . "\n";
        }
    }
} else {
    echo "--- SYSTEM STATUS: OPTIMIZED ---\n";
    echo "All critical indexes are present. System is ready for high load.\n";
}
?>