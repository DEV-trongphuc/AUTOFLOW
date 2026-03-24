<?php
require_once 'db_connect.php';

echo "--- Stats Update Buffer (PENDING STATS) ---\n";
try {
    // Use backticks for `rows` to avoid SQL error
    $stmt = $pdo->query("SELECT target_table, column_name, SUM(increment) as total, COUNT(*) as `row_count` FROM stats_update_buffer WHERE processed = 0 GROUP BY target_table, column_name");
    $rows = $stmt->fetchAll();
    if (empty($rows)) {
        echo "Stats Buffer is EMPTY (All processed).\n";
    } else {
        foreach ($rows as $r) {
            echo "Table: {$r['target_table']} | Col: {$r['column_name']} | Total: {$r['total']} | Logs: {$r['row_count']}\n";
        }
    }
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}

echo "\n--- Raw Event Buffer (INCOMING EVENTS) ---\n";
try {
    $stmt = $pdo->query("SELECT type, COUNT(*) as total FROM raw_event_buffer WHERE processed = 0 GROUP BY type");
    $rows = $stmt->fetchAll();
    if (empty($rows)) {
        echo "Raw Event Buffer is EMPTY.\n";
    } else {
        foreach ($rows as $r) {
            echo "Type: {$r['type']} | Total: {$r['total']}\n";
        }
    }
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}

echo "\n--- Campaign 6985cffc6c490 REAL-TIME STATS ---\n";
try {
    $cid = '6985cffc6c490';
    $stmt = $pdo->prepare("SELECT count_sent, count_opened, count_clicked, stats FROM campaigns WHERE id = ?");
    $stmt->execute([$cid]);
    $c = $stmt->fetch();
    echo "Sent: " . ($c['count_sent'] ?? 0) . " | Opened (Cleaned): " . ($c['count_opened'] ?? 0) . " | Clicked (Cleaned): " . ($c['count_clicked'] ?? 0) . "\n";
    echo "Stats JSON: " . ($c['stats'] ?? '{}') . "\n";
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}

echo "\n--- Last 5 Webhook Error Logs ---\n";
if (file_exists('webhook_error.log')) {
    echo "Content of webhook_error.log:\n";
    $content = file_get_contents('webhook_error.log');
    $lines = explode("\n", trim($content));
    echo implode("\n", array_slice($lines, -5)) . "\n";
} else {
    echo "No webhook_error.log found.\n";
}
