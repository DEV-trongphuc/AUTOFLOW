<?php
header('Content-Type: text/plain; charset=utf-8');
require_once 'db_connect.php';

echo "RECEIVE_EMAIL DISTRIBUTION\n";
echo "==========================\n\n";

try {
    $stmt = $pdo->query("SELECT campaign_id, COUNT(*) as count FROM subscriber_activity WHERE type = 'receive_email' GROUP BY campaign_id");
    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        echo " - CID: " . ($row['campaign_id'] ?: 'NULL') . " | Count: " . $row['count'] . "\n";
    }
} catch (Exception $e) {
    echo "Error: " . $e->getMessage();
}
