<?php
// api/revive_queue_item.php
require_once 'db_connect.php'; // Using strictly relative path inside api/ folder

$queueId = 171; // The specific dropped item

echo "<h2>Reviving Queue ID: $queueId</h2>";

try {
    // Check current status
    $stmtCheck = $pdo->prepare("SELECT status, step_id FROM subscriber_flow_states WHERE id = ?");
    $stmtCheck->execute([$queueId]);
    $row = $stmtCheck->fetch(PDO::FETCH_ASSOC);

    if (!$row) {
        die("Queue item not found.");
    }

    echo "Current Status: <strong>{$row['status']}</strong><br>";

    // Revive
    $stmtRevive = $pdo->prepare("UPDATE subscriber_flow_states SET status = 'waiting', scheduled_at = NOW(), updated_at = NOW() WHERE id = ?");
    $stmtRevive->execute([$queueId]);

    echo "Actions taken:<br>";
    echo "1. Set status to 'waiting'.<br>";
    echo "2. Set scheduled_at to NOW().<br>";
    echo "<h3 style='color:green'>Revival Complete. The worker should pick it up in < 1 minute.</h3>";

    // Trigger worker immediately for instant gratification
    // Since we are in api/ folder, API_BASE_URL (defined in db_connect) usually points to the public URL of this folder.
    echo "<hr>Triggering worker...<br>";
    $ch = curl_init(API_BASE_URL . '/worker_flow.php?output=text');
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 5);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    echo "<pre>" . htmlspecialchars(curl_exec($ch)) . "</pre>";
    curl_close($ch);

} catch (Exception $e) {
    echo "Error: " . $e->getMessage();
}
