<?php
require_once 'db_connect.php';
require_once 'flow_helpers.php';

$email = 'dinhthanh@ideas.edu.vn';

echo "Searching for $email...\n";

// 1. Find Subscriber
$stmt = $pdo->prepare("SELECT * FROM subscribers WHERE email = ?");
$stmt->execute([$email]);
$sub = $stmt->fetch();

if (!$sub) {
    die("Subscriber not found.\n");
}

echo "Subscriber ID: " . $sub['id'] . "\n";
echo "Subscriber Status: " . $sub['status'] . "\n";

// 2. Find Flow States
echo "\nFlow States:\n";
$stmt = $pdo->prepare("
    SELECT sfs.*, f.name as flow_name 
    FROM subscriber_flow_states sfs
    JOIN flows f ON sfs.flow_id = f.id
    WHERE sfs.subscriber_id = ?
");
$stmt->execute([$sub['id']]);
$states = $stmt->fetchAll();

foreach ($states as $state) {
    echo "Flow: " . $state['flow_name'] . " (ID: " . $state['flow_id'] . ")\n";
    echo "Current Step: " . $state['step_id'] . "\n";
    echo "Status: " . $state['status'] . "\n";
    echo "Scheduled At: " . $state['scheduled_at'] . "\n";
    echo "Updated At: " . $state['updated_at'] . "\n";
    echo "Last Error: " . ($state['last_error'] ?? 'None') . "\n";
    echo "-------------------\n";
}

// 3. Find Activity Logs
echo "\nRecent Activity Logs (last 50):\n";
$stmt = $pdo->prepare("
    SELECT * FROM subscriber_activity 
    WHERE subscriber_id = ? 
    ORDER BY created_at DESC 
    LIMIT 50
");
$stmt->execute([$sub['id']]);
$activities = $stmt->fetchAll();

foreach ($activities as $act) {
    echo "[" . $act['created_at'] . "] " . $act['type'] . " | " . $act['reference_name'] . " | " . $act['details'] . "\n";
}

// 4. Find Flows related to "chăm sóc sau chiến dịch"
echo "\nFlows matching 'chăm sóc sau chiến dịch' or similar:\n";
$stmt = $pdo->query("SELECT id, name, steps FROM flows WHERE name LIKE '%chăm sóc%' OR name LIKE '%sau chiến dịch%'");
$flows = $stmt->fetchAll();
foreach ($flows as $f) {
    echo "ID: " . $f['id'] . " | Name: " . $f['name'] . "\n";
}
