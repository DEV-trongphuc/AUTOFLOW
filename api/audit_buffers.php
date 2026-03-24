<?php
header('Content-Type: text/plain; charset=utf-8');
require_once 'db_connect.php';

echo "BUFFER AUDIT\n";
echo "============\n\n";

try {
    $stmt = $pdo->query("SELECT COUNT(*) FROM stats_update_buffer WHERE processed = 0");
    echo "Unprocessed stats updates: " . $stmt->fetchColumn() . "\n";

    $stmt = $pdo->query("SELECT target_table, column_name, COUNT(*) as count FROM stats_update_buffer WHERE processed = 0 GROUP BY target_table, column_name");
    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        echo " - {$row['target_table']} . {$row['column_name']} | Count: {$row['count']}\n";
    }

    $stmt = $pdo->query("SELECT COUNT(*) FROM activity_buffer WHERE processed = 0");
    echo "\nUnprocessed activities: " . $stmt->fetchColumn() . "\n";

} catch (Exception $e) {
    echo "Error: " . $e->getMessage();
}
