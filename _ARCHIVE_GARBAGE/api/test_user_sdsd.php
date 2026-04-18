<?php
// api/test_user_sdsd.php
ini_set('display_errors', 1);
error_reporting(E_ALL);
require_once 'db_connect.php';

header('Content-Type: text/plain; charset=utf-8');

$email = 'sdsd@gmail.com';

echo "=================================================================\n";
echo "USER: $email\n";
echo "=================================================================\n\n";

// Get subscriber
$stmt = $pdo->prepare("SELECT * FROM subscribers WHERE email = ?");
$stmt->execute([$email]);
$sub = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$sub) {
    die("User not found!\n");
}

echo "Subscriber ID: {$sub['id']}\n";
echo "Status: {$sub['status']}\n\n";

// Get flow states
echo "--- FLOW STATES ---\n";
$stmt = $pdo->prepare("
    SELECT sfs.*, f.name as flow_name
    FROM subscriber_flow_states sfs
    LEFT JOIN flows f ON f.id = sfs.flow_id
    WHERE sfs.subscriber_id = ?
    ORDER BY sfs.id DESC
");
$stmt->execute([$sub['id']]);
$states = $stmt->fetchAll(PDO::FETCH_ASSOC);

foreach ($states as $s) {
    echo "\nQueue ID: {$s['id']}\n";
    echo "Flow: {$s['flow_name']}\n";
    echo "Step ID: {$s['step_id']}\n";
    echo "Status: {$s['status']}\n";
    echo "Created: {$s['created_at']}\n";
    echo "Updated: {$s['updated_at']}\n";
    echo "Scheduled: " . ($s['scheduled_at'] ?? 'NULL') . "\n";
}

echo "\n=================================================================\n";
?>