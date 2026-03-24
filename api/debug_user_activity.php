<?php
// api/debug_user_activity.php
// Debug dedicated single user activity vs Flow Wait

require_once 'db_connect.php';

header('Content-Type: text/html; charset=utf-8');
echo "<style>body{font-family:sans-serif; padding:20px;} table{border-collapse:collapse; width:100%;} th,td{border:1px solid #ddd; padding:8px; font-size:12px;} .match{background:#d4edda;} .mismatch{background:#f8d7da;} .new{color:green;font-weight:bold;} .old{color:gray;}</style>";

// CONFIG: TARGET USER EMAIL
$targetEmail = 'turniodev@gmail.com';

echo "<h1>Debug Activity for: $targetEmail</h1>";

// 1. Get Subscriber ID
$stmtSub = $pdo->prepare("SELECT id, email FROM subscribers WHERE email = ?");
$stmtSub->execute([$targetEmail]);
$sub = $stmtSub->fetch(PDO::FETCH_ASSOC);

if (!$sub) {
    die("<p>User not found!</p>");
}
$subId = $sub['id'];
echo "<p><strong>Subscriber ID:</strong> $subId</p>";

// 2. Get Current Waiting State (if any)
$stmtState = $pdo->prepare("SELECT q.*, f.name as flow_name FROM subscriber_flow_states q JOIN flows f ON q.flow_id = f.id WHERE q.subscriber_id = ? AND q.status = 'waiting'");
$stmtState->execute([$subId]);
$states = $stmtState->fetchAll(PDO::FETCH_ASSOC);

$waitingFlows = [];
if (empty($states)) {
    echo "<p>User is NOT currently waiting in any flow.</p>";
} else {
    echo "<h2>Current Waiting States:</h2>";
    foreach ($states as $s) {
        $waitingFlows[$s['flow_id']] = $s['created_at']; // Map FlowID -> EntryTime
        echo "<div style='background:#e2e3e5; padding:10px; margin-bottom:10px;'>";
        echo "<strong>Flow:</strong> {$s['flow_name']} (ID: {$s['flow_id']})<br>";
        echo "<strong>Step ID:</strong> {$s['step_id']}<br>";
        echo "<strong>Waiting Since (Entry Time):</strong> {$s['created_at']}<br>";
        echo "</div>";
    }
}

// 3. Get ALL Click/Open Activity
echo "<h2>Recent Activity Log (Clicks & Opens)</h2>";
$stmtAct = $pdo->prepare("SELECT * FROM subscriber_activity WHERE subscriber_id = ? AND type IN ('click_link', 'open_email') ORDER BY created_at DESC LIMIT 50");
$stmtAct->execute([$subId]);
$activities = $stmtAct->fetchAll(PDO::FETCH_ASSOC);

if (empty($activities)) {
    echo "<p>No recent activity found.</p>";
} else {
    echo "<table>";
    echo "<tr><th>Time</th><th>Type</th><th>Flow ID (Tracked)</th><th>Ref ID (Step)</th><th>Status vs Waiting</th><th>Details</th></tr>";

    foreach ($activities as $act) {
        $flowId = $act['flow_id'];
        $time = $act['created_at'];

        // Check Status
        $statusHtml = "";
        if (isset($waitingFlows[$flowId])) {
            $entryTime = $waitingFlows[$flowId];
            if ($time >= $entryTime) {
                $statusHtml = "<span class='new'>VALID [NEW]</span> (Match Flow)";
            } else {
                $statusHtml = "<span class='old'>INVALID [OLD]</span> (Before Entry)";
            }
        } else {
            if ($flowId) {
                $statusHtml = "<span class='mismatch'>MISMATCH FLOW</span> (ID: $flowId)";
            } else {
                $statusHtml = "<span class='mismatch'>NO FLOW ID</span>";
            }
        }

        $rowClass = (strpos($statusHtml, 'VALID') !== false) ? 'match' : '';

        echo "<tr class='$rowClass'>";
        echo "<td>$time</td>";
        echo "<td>{$act['type']}</td>";
        echo "<td>$flowId</td>";
        echo "<td>{$act['reference_id']}</td>";
        echo "<td>$statusHtml</td>";
        echo "<td>" . htmlspecialchars($act['details']) . "</td>";
        echo "</tr>";
    }
    echo "</table>";
}
?>