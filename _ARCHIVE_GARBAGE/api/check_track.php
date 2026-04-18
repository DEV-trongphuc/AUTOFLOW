<?php
require_once 'db_connect.php';

echo "--- Stats Update Buffer ---\n";
try {
    $stmt = $pdo->query("SELECT target_table, column_name, SUM(increment) as total, COUNT(*) as rows FROM stats_update_buffer WHERE processed = 0 GROUP BY target_table, column_name");
    $rows = $stmt->fetchAll();
    if (empty($rows)) {
        echo "Buffer is EMPTY.\n";
    } else {
        foreach ($rows as $r) {
            echo "Table: {$r['target_table']} | Col: {$r['column_name']} | Total: {$r['total']} | Rows: {$r['rows']}\n";
        }
    }
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}

echo "\n--- Raw Event Buffer ---\n";
try {
    $stmt = $pdo->query("SELECT type, COUNT(*) as total FROM raw_event_buffer WHERE processed = 0 GROUP BY type");
    $rows = $stmt->fetchAll();
    if (empty($rows)) {
        echo "Raw Buffer is EMPTY.\n";
    } else {
        foreach ($rows as $r) {
            echo "Type: {$r['type']} | Total: {$r['total']}\n";
        }
    }
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}

echo "\n--- Campaign 6985cffc6c490 Stats ---\n";
try {
    $cid = '6985cffc6c490';
    $stmt = $pdo->prepare("SELECT count_sent, count_opened, count_clicked, stats FROM campaigns WHERE id = ?");
    $stmt->execute([$cid]);
    $c = $stmt->fetch();
    echo "Sent: " . ($c['count_sent'] ?? 0) . " | Opened: " . ($c['count_opened'] ?? 0) . " | Clicked: " . ($c['count_clicked'] ?? 0) . "\n";
    echo "Stats JSON: " . ($c['stats'] ?? '{}') . "\n";
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}

echo "\n--- Last 5 Webhook Error Logs ---\n";
if (file_exists('webhook_error.log')) {
    echo shell_exec('tail -n 5 webhook_error.log');
} else {
    echo "No webhook_error.log\n";
}
