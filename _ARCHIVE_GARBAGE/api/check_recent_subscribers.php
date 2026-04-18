<?php
// api/check_recent_subscribers.php
// Check recent subscribers and their flow states

ini_set('display_errors', 1);
error_reporting(E_ALL);
require_once 'db_connect.php';

header('Content-Type: text/plain; charset=utf-8');

echo "=================================================================\n";
echo "RECENT SUBSCRIBERS & FLOW STATES\n";
echo "=================================================================\n";
echo "Time: " . date('Y-m-d H:i:s') . "\n\n";

// Get recent subscribers (last 10)
echo "--- RECENT SUBSCRIBERS (Last 10) ---\n";
$stmtSubs = $pdo->prepare("
    SELECT id, email, joined_at, status
    FROM subscribers
    ORDER BY id DESC
    LIMIT 10
");
$stmtSubs->execute();
$subs = $stmtSubs->fetchAll(PDO::FETCH_ASSOC);

foreach ($subs as $sub) {
    echo sprintf(
        "%-40s | %-15s | %s | %s\n",
        $sub['email'],
        $sub['status'],
        $sub['id'],
        $sub['joined_at'] ?? 'N/A'
    );
}

echo "\n--- RECENT FLOW STATES (Last 20) ---\n";
$stmtStates = $pdo->prepare("
    SELECT 
        sfs.id,
        s.email,
        f.name as flow_name,
        sfs.step_id,
        sfs.status,
        sfs.scheduled_at,
        sfs.created_at,
        sfs.updated_at,
        TIMESTAMPDIFF(MINUTE, sfs.created_at, NOW()) as age_minutes
    FROM subscriber_flow_states sfs
    LEFT JOIN subscribers s ON s.id = sfs.subscriber_id
    LEFT JOIN flows f ON f.id = sfs.flow_id
    ORDER BY sfs.id DESC
    LIMIT 20
");
$stmtStates->execute();
$states = $stmtStates->fetchAll(PDO::FETCH_ASSOC);

echo sprintf(
    "%-5s | %-30s | %-25s | %-10s | %-12s | %s\n",
    "ID",
    "Email",
    "Flow",
    "Status",
    "Age (min)",
    "Scheduled At"
);
echo str_repeat("-", 150) . "\n";

foreach ($states as $state) {
    $scheduledDisplay = $state['scheduled_at'] ?? 'NULL';
    $isPast = $state['scheduled_at'] && strtotime($state['scheduled_at']) <= time();
    $marker = $isPast ? " [READY]" : "";

    echo sprintf(
        "%-5s | %-30s | %-25s | %-10s | %-12s | %s%s\n",
        $state['id'],
        substr($state['email'], 0, 30),
        substr($state['flow_name'], 0, 25),
        $state['status'],
        $state['age_minutes'],
        $scheduledDisplay,
        $marker
    );
}

echo "\n--- ITEMS READY FOR PROCESSING (scheduled_at <= NOW) ---\n";
$stmtReady = $pdo->prepare("
    SELECT 
        sfs.id,
        s.email,
        f.name as flow_name,
        sfs.status,
        sfs.scheduled_at,
        sfs.created_at
    FROM subscriber_flow_states sfs
    LEFT JOIN subscribers s ON s.id = sfs.subscriber_id
    LEFT JOIN flows f ON f.id = sfs.flow_id
    WHERE sfs.status IN ('waiting', 'processing')
    AND sfs.scheduled_at <= NOW()
    AND f.status = 'active'
    ORDER BY sfs.scheduled_at ASC
    LIMIT 20
");
$stmtReady->execute();
$ready = $stmtReady->fetchAll(PDO::FETCH_ASSOC);

if (empty($ready)) {
    echo "❌ NO ITEMS READY FOR PROCESSING!\n";
    echo "\nThis explains why worker says 'No regular items to process'\n";
} else {
    echo "Found " . count($ready) . " items ready:\n\n";
    foreach ($ready as $r) {
        echo sprintf(
            "ID: %s | %s | %s | %s | Scheduled: %s\n",
            $r['id'],
            $r['email'],
            $r['flow_name'],
            $r['status'],
            $r['scheduled_at']
        );
    }
}

echo "\n=================================================================\n";
echo "END OF REPORT\n";
echo "=================================================================\n";
?>