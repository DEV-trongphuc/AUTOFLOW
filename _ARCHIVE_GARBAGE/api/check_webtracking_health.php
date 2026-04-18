<?php
// api/check_webtracking_health.php
require_once 'db_connect.php';

header('Content-Type: text/plain; charset=utf-8');
echo "=== WEB TRACKING SYSTEM HEALTH CHECK ===\n";
echo "Timestamp: " . date('Y-m-d H:i:s') . "\n\n";

try {
    // 1. CHECK TABLE STRUCTURES
    echo "--- 1. DATABASE TABLES STRUCTURE ---\n\n";

    $tables = ['web_properties', 'web_visitors', 'web_sessions', 'web_page_views', 'web_events', 'web_daily_stats'];

    foreach ($tables as $table) {
        echo "Table: $table\n";

        // Check if table exists
        $stmt = $pdo->query("SHOW TABLES LIKE '$table'");
        if ($stmt->rowCount() == 0) {
            echo "   [ERROR] Table does not exist!\n\n";
            continue;
        }

        // Show columns
        $stmt = $pdo->query("DESCRIBE $table");
        $columns = $stmt->fetchAll(PDO::FETCH_ASSOC);
        echo "   Columns (" . count($columns) . "):\n";
        foreach ($columns as $col) {
            $key = $col['Key'] ? " [{$col['Key']}]" : "";
            echo "      - {$col['Field']}: {$col['Type']}{$key}\n";
        }

        // Show indexes
        $stmt = $pdo->query("SHOW INDEX FROM $table");
        $indexes = $stmt->fetchAll(PDO::FETCH_ASSOC);
        $indexNames = array_unique(array_column($indexes, 'Key_name'));
        echo "   Indexes (" . count($indexNames) . "): " . implode(', ', $indexNames) . "\n";

        // Row count
        $stmt = $pdo->query("SELECT COUNT(*) FROM $table");
        $count = $stmt->fetchColumn();
        echo "   Total Rows: " . number_format($count) . "\n\n";
    }

    // 2. CHECK DATA INTEGRITY
    echo "--- 2. DATA INTEGRITY CHECKS ---\n\n";

    // Check for orphaned sessions (sessions without visitor)
    $stmt = $pdo->query("
        SELECT COUNT(*) 
        FROM web_sessions s 
        LEFT JOIN web_visitors v ON s.visitor_id = v.id 
        WHERE v.id IS NULL
    ");
    $orphanedSessions = $stmt->fetchColumn();
    echo "Orphaned Sessions (no visitor): " . ($orphanedSessions > 0 ? "[WARNING] $orphanedSessions" : "[OK] 0") . "\n";

    // Check for orphaned page views
    $stmt = $pdo->query("
        SELECT COUNT(*) 
        FROM web_page_views pv 
        LEFT JOIN web_sessions s ON pv.session_id = s.id 
        WHERE s.id IS NULL
    ");
    $orphanedPVs = $stmt->fetchColumn();
    echo "Orphaned Page Views (no session): " . ($orphanedPVs > 0 ? "[WARNING] $orphanedPVs" : "[OK] 0") . "\n";

    // Check for sessions without property_id
    $stmt = $pdo->query("SELECT COUNT(*) FROM web_sessions WHERE property_id IS NULL OR property_id = ''");
    $noPropertySessions = $stmt->fetchColumn();
    echo "Sessions without property_id: " . ($noPropertySessions > 0 ? "[ERROR] $noPropertySessions" : "[OK] 0") . "\n";

    // Check for visitors without property_id
    $stmt = $pdo->query("SELECT COUNT(*) FROM web_visitors WHERE property_id IS NULL OR property_id = ''");
    $noPropertyVisitors = $stmt->fetchColumn();
    echo "Visitors without property_id: " . ($noPropertyVisitors > 0 ? "[ERROR] $noPropertyVisitors" : "[OK] 0") . "\n\n";

    // 3. CHECK RECENT ACTIVITY
    echo "--- 3. RECENT ACTIVITY (Last 24 Hours) ---\n\n";

    $stmt = $pdo->query("
        SELECT COUNT(DISTINCT visitor_id) as visitors,
               COUNT(DISTINCT id) as sessions,
               SUM(page_count) as page_views
        FROM web_sessions 
        WHERE started_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
    ");
    $activity = $stmt->fetch(PDO::FETCH_ASSOC);
    echo "New Visitors: " . number_format($activity['visitors']) . "\n";
    echo "New Sessions: " . number_format($activity['sessions']) . "\n";
    echo "Total Page Views: " . number_format($activity['page_views'] ?? 0) . "\n\n";

    // 4. CHECK LIVE TRAFFIC
    echo "--- 4. LIVE TRAFFIC (Last 30 Minutes) ---\n\n";

    $stmt = $pdo->query("
        SELECT COUNT(DISTINCT v.id) as live_count
        FROM web_visitors v
        JOIN web_sessions s ON v.id = s.visitor_id
        WHERE v.last_visit_at >= DATE_SUB(NOW(), INTERVAL 30 MINUTE)
        AND s.last_active_at >= DATE_SUB(NOW(), INTERVAL 30 MINUTE)
    ");
    $liveCount = $stmt->fetchColumn();
    echo "Active Visitors: " . $liveCount . "\n\n";

    // 5. CHECK PROPERTIES
    echo "--- 5. WEB PROPERTIES ---\n\n";

    $stmt = $pdo->query("
        SELECT p.id, p.name, p.domain,
               COUNT(DISTINCT v.id) as total_visitors,
               COUNT(DISTINCT s.id) as total_sessions
        FROM web_properties p
        LEFT JOIN web_visitors v ON p.id = v.property_id
        LEFT JOIN web_sessions s ON p.id = s.property_id
        GROUP BY p.id
    ");
    $properties = $stmt->fetchAll(PDO::FETCH_ASSOC);

    foreach ($properties as $prop) {
        echo "Property: {$prop['name']} ({$prop['domain']})\n";
        echo "   ID: {$prop['id']}\n";
        echo "   Total Visitors: " . number_format($prop['total_visitors']) . "\n";
        echo "   Total Sessions: " . number_format($prop['total_sessions']) . "\n\n";
    }

    // 6. CHECK DAILY STATS AGGREGATION
    echo "--- 6. DAILY STATS AGGREGATION ---\n\n";

    $stmt = $pdo->query("
        SELECT COUNT(DISTINCT date) as days_aggregated,
               MIN(date) as first_date,
               MAX(date) as last_date
        FROM web_daily_stats
        WHERE url_hash = 'GLOBAL'
    ");
    $stats = $stmt->fetch(PDO::FETCH_ASSOC);
    echo "Days Aggregated: " . ($stats['days_aggregated'] ?? 0) . "\n";
    echo "Date Range: " . ($stats['first_date'] ?? 'N/A') . " to " . ($stats['last_date'] ?? 'N/A') . "\n";

    // Check if today's data is aggregated
    $stmt = $pdo->query("
        SELECT COUNT(*) 
        FROM web_daily_stats 
        WHERE date = CURDATE() AND url_hash = 'GLOBAL'
    ");
    $todayAggregated = $stmt->fetchColumn();
    echo "Today's Data Aggregated: " . ($todayAggregated > 0 ? "[OK] Yes" : "[WARNING] Not yet") . "\n\n";

    // 7. CHECK FOR COMMON ISSUES
    echo "--- 7. POTENTIAL ISSUES ---\n\n";

    // Check for duplicate visitors (same ID)
    $stmt = $pdo->query("
        SELECT visitor_id, COUNT(*) as count 
        FROM web_sessions 
        GROUP BY visitor_id 
        HAVING count > 100
        LIMIT 5
    ");
    $heavyVisitors = $stmt->fetchAll(PDO::FETCH_ASSOC);
    if (count($heavyVisitors) > 0) {
        echo "[WARNING] Visitors with >100 sessions (possible bot/crawler):\n";
        foreach ($heavyVisitors as $v) {
            echo "   - Visitor {$v['visitor_id']}: {$v['count']} sessions\n";
        }
    } else {
        echo "[OK] No suspicious high-session visitors\n";
    }
    echo "\n";

    // Check for very old active sessions (>24 hours)
    $stmt = $pdo->query("
        SELECT COUNT(*) 
        FROM web_sessions 
        WHERE last_active_at < DATE_SUB(NOW(), INTERVAL 24 HOUR)
        AND last_active_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
    ");
    $staleCount = $stmt->fetchColumn();
    echo "Stale Sessions (>24h old, <7d): " . number_format($staleCount) . "\n";

    // 8. PERFORMANCE METRICS
    echo "\n--- 8. PERFORMANCE METRICS ---\n\n";

    // Average session duration
    $stmt = $pdo->query("
        SELECT AVG(duration_seconds) as avg_duration,
               AVG(page_count) as avg_pages
        FROM web_sessions
        WHERE started_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
    ");
    $perf = $stmt->fetch(PDO::FETCH_ASSOC);
    echo "Avg Session Duration (7d): " . round($perf['avg_duration'] ?? 0) . " seconds\n";
    echo "Avg Pages per Session (7d): " . round($perf['avg_pages'] ?? 0, 2) . "\n\n";

    // 9. STORAGE ESTIMATE
    echo "--- 9. STORAGE ESTIMATE ---\n\n";

    $stmt = $pdo->query("
        SELECT 
            table_name,
            ROUND(((data_length + index_length) / 1024 / 1024), 2) AS size_mb
        FROM information_schema.TABLES
        WHERE table_schema = DATABASE()
        AND table_name LIKE 'web_%'
        ORDER BY (data_length + index_length) DESC
    ");
    $sizes = $stmt->fetchAll(PDO::FETCH_ASSOC);
    $totalSize = 0;
    foreach ($sizes as $size) {
        echo "{$size['table_name']}: {$size['size_mb']} MB\n";
        $totalSize += $size['size_mb'];
    }
    echo "\nTotal Web Tracking Storage: " . round($totalSize, 2) . " MB\n";

    echo "\n=== HEALTH CHECK COMPLETE ===\n";

} catch (Exception $e) {
    echo "\n[CRITICAL ERROR] " . $e->getMessage() . "\n";
    echo "Stack trace:\n" . $e->getTraceAsString() . "\n";
}
?>