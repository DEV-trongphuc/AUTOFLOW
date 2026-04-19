<?php
// api/db_health_check.php
require_once 'db_connect.php';

header('Content-Type: application/json; charset=utf-8');

try {
    // 1. Get Table Sizes
    $stmtSize = $pdo->query("
        SELECT 
            table_name AS `table`, 
            table_rows AS `rows`,
            ROUND(((data_length + index_length) / 1024 / 1024), 2) AS `size_mb`,
            ROUND((data_length / 1024 / 1024), 2) AS `data_mb`,
            ROUND((index_length / 1024 / 1024), 2) AS `index_mb`,
            create_time,
            table_collation AS `collation`
        FROM information_schema.TABLES 
        WHERE table_schema = DATABASE()
        ORDER BY (data_length + index_length) DESC
    ");
    $tables = $stmtSize->fetchAll(PDO::FETCH_ASSOC);

    // 2. Analyze 'subscribers' specifically
    $subscriberAnalysis = [];
    $stmtCols = $pdo->query("SHOW COLUMNS FROM subscribers");
    $cols = $stmtCols->fetchAll(PDO::FETCH_ASSOC);

    $stmtIdx = $pdo->query("SHOW INDEX FROM subscribers");
    $indexes = $stmtIdx->fetchAll(PDO::FETCH_ASSOC);

    // Identify missing critical indexes
    $indexedCols = array_column($indexes, 'Column_name');
    $criticalCols = ['email', 'phone_number', 'property_id', 'zalo_user_id', 'source'];
    $missing = array_diff($criticalCols, $indexedCols);

    echo json_encode([
        'success' => true,
        'database_stats' => [
            'total_tables' => count($tables),
            'tables' => $tables
        ],
        'subscribers_analysis' => [
            'columns' => $cols,
            'existing_indexes' => $indexes,
            'missing_critical_indexes' => array_values($missing),
            'recommendation' => empty($missing) ? 'Schema is optimized.' : 'Need to add indexes for: ' . implode(', ', $missing)
        ],
        'storage_optimization_tips' => [
            '1. Clean up old pageview logs (older than 6 months).',
            '2. Use ROW_FORMAT=COMPRESSED for large TEXT/JSON columns.',
            '3. Ensure all foreign keys are indexed.',
            '4. Avoid using TEXT for short strings (use VARCHAR instead).'
        ]
    ], JSON_PRETTY_PRINT);

} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
