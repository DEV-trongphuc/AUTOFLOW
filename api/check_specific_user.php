<?php
// api/check_specific_user.php
// Check specific user's flow state

ini_set('display_errors', 1);
error_reporting(E_ALL);
require_once 'db_connect.php';

header('Content-Type: text/plain; charset=utf-8');

$email = $_GET['email'] ?? 'hah@gmail.com';

echo "=================================================================\n";
echo "USER FLOW STATE CHECK\n";
echo "=================================================================\n";
echo "Email: $email\n";
echo "Time: " . date('Y-m-d H:i:s') . "\n\n";

// Get subscriber
$stmtSub = $pdo->prepare("SELECT * FROM subscribers WHERE email = ?");
$stmtSub->execute([$email]);
$sub = $stmtSub->fetch(PDO::FETCH_ASSOC);

if (!$sub) {
    die("❌ Subscriber not found!\n");
}

echo "--- SUBSCRIBER INFO ---\n";
echo "ID: {$sub['id']}\n";
echo "Email: {$sub['email']}\n";
echo "Status: {$sub['status']}\n";
echo "Joined: " . ($sub['joined_at'] ?? 'N/A') . "\n\n";

// Get all flow states
echo "--- FLOW STATES ---\n";
$stmtStates = $pdo->prepare("
    SELECT 
        sfs.id,
        sfs.flow_id,
        f.name as flow_name,
        sfs.step_id,
        sfs.status,
        sfs.scheduled_at,
        sfs.created_at,
        sfs.updated_at,
        sfs.last_error,
        TIMESTAMPDIFF(MINUTE, sfs.created_at, NOW()) as age_minutes,
        TIMESTAMPDIFF(MINUTE, sfs.updated_at, NOW()) as minutes_since_update
    FROM subscriber_flow_states sfs
    LEFT JOIN flows f ON f.id = sfs.flow_id
    WHERE sfs.subscriber_id = ?
    ORDER BY sfs.id DESC
");
$stmtStates->execute([$sub['id']]);
$states = $stmtStates->fetchAll(PDO::FETCH_ASSOC);

if (empty($states)) {
    echo "❌ No flow states found!\n";
} else {
    foreach ($states as $state) {
        echo "\n";
        echo "Queue ID: {$state['id']}\n";
        echo "Flow: {$state['flow_name']} ({$state['flow_id']})\n";
        echo "Step ID: {$state['step_id']}\n";
        echo "Status: {$state['status']}\n";
        echo "Age: {$state['age_minutes']} minutes\n";
        echo "Last Update: {$state['minutes_since_update']} minutes ago\n";
        echo "Scheduled At: " . ($state['scheduled_at'] ?? 'NULL') . "\n";
        echo "Created At: {$state['created_at']}\n";
        echo "Updated At: {$state['updated_at']}\n";
        if ($state['last_error']) {
            echo "Error: {$state['last_error']}\n";
        }

        // Get step info from flow
        $stmtFlow = $pdo->prepare("SELECT steps FROM flows WHERE id = ?");
        $stmtFlow->execute([$state['flow_id']]);
        $flowData = $stmtFlow->fetch(PDO::FETCH_ASSOC);

        if ($flowData) {
            $steps = json_decode($flowData['steps'], true) ?: [];
            foreach ($steps as $step) {
                if ($step['id'] === $state['step_id']) {
                    echo "Step Name: {$step['label']}\n";
                    echo "Step Type: {$step['type']}\n";
                    if ($step['type'] === 'condition') {
                        $config = $step['config'] ?? [];
                        echo "Condition Type: " . ($config['conditionType'] ?? 'N/A') . "\n";
                        echo "Wait Duration: " . ($config['waitDuration'] ?? 'N/A') . " " . ($config['waitUnit'] ?? 'N/A') . "\n";
                    }
                    break;
                }
            }
        }
        echo str_repeat("-", 60) . "\n";
    }
}

// Get recent activity
echo "\n--- RECENT ACTIVITY (Last 20) ---\n";
$stmtActivity = $pdo->prepare("
    SELECT 
        type,
        reference_id,
        reference_name,
        details,
        created_at
    FROM subscriber_activity
    WHERE subscriber_id = ?
    ORDER BY created_at DESC
    LIMIT 20
");
$stmtActivity->execute([$sub['id']]);
$activities = $stmtActivity->fetchAll(PDO::FETCH_ASSOC);

if (empty($activities)) {
    echo "No activity found\n";
} else {
    foreach ($activities as $act) {
        echo sprintf(
            "[%s] %s - %s - %s\n",
            $act['created_at'],
            $act['type'],
            $act['reference_name'],
            $act['details']
        );
    }
}

echo "\n=================================================================\n";
echo "END OF REPORT\n";
echo "=================================================================\n";
?>