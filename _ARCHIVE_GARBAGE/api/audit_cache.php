<?php
header('Content-Type: text/plain; charset=utf-8');
require_once 'db_connect.php';

echo "UNIQUE CACHE AUDIT\n";
echo "==================\n\n";

try {
    $cid = '6985cffc6c490';
    $stmt = $pdo->prepare("SELECT COUNT(*) FROM tracking_unique_cache WHERE target_id = ? AND event_type = 'open'");
    $stmt->execute([$cid]);
    echo "Unique Opens in Cache for CID $cid: " . $stmt->fetchColumn() . "\n";

    $stmt = $pdo->prepare("SELECT COUNT(*) FROM tracking_unique_cache WHERE target_id = ? AND event_type = 'click'");
    $stmt->execute([$cid]);
    echo "Unique Clicks in Cache for CID $cid: " . $stmt->fetchColumn() . "\n";

    echo "\nGlobal Cache Counts (Top 5 targets):\n";
    $stmt = $pdo->query("SELECT target_id, event_type, COUNT(*) as count FROM tracking_unique_cache GROUP BY target_id, event_type ORDER BY count DESC LIMIT 10");
    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        echo " - Target: {$row['target_id']} | Type: {$row['event_type']} | Count: {$row['count']}\n";
    }

} catch (Exception $e) {
    echo "Error: " . $e->getMessage();
}
