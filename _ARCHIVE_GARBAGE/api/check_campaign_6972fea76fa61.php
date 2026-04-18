<?php
// check_campaign_6972fea76fa61.php
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Path Detection (Same as debug_stalled_flows.php)
if (file_exists('db_connect.php')) {
    require 'db_connect.php';
} elseif (file_exists('api/db_connect.php')) {
    require 'api/db_connect.php';
} else {
    echo "<h2>Error: Could not find db_connect.php</h2>";
    echo "Current Dir: " . getcwd() . "<br>";
    echo "Looking for: db_connect.php or api/db_connect.php";
    exit;
}

// Clear any buffers or JSON headers from db_connect.php
if (ob_get_length()) ob_clean();
header('Content-Type: text/html; charset=UTF-8');

$flowId = '6972fea76fa61'; // Chiến dịch Team Building

echo "<h2>Diagnosis for Campaign $flowId</h2>";

try {
    // 1. Campaign Status
    $stmt = $pdo->prepare("SELECT name, status, steps FROM flows WHERE id = ?");
    $stmt->execute([$flowId]);
    $flow = $stmt->fetch();

    if (!$flow) {
        die("Flow $flowId not found in the database.");
    }

    echo "<strong>Campaign Name:</strong> " . htmlspecialchars($flow['name']) . "<br>";
    echo "<strong>Current Status:</strong> <span style='color:" . ($flow['status'] === 'active' ? 'green' : 'red') . "'>{$flow['status']}</span>";
    if ($flow['status'] !== 'active') {
        echo " <b style='color:red;'>(!!!) WORKER WILL NOT PROCESS PAUSED CAMPAIGNS</b>";
    }
    echo "<br><strong>Current Server Time:</strong> " . date('Y-m-d H:i:s') . "<br><hr>";

    // 2. Subscriber States
    echo "<h3>Subscriber States in this flow:</h3>";
    $stmt = $pdo->prepare("SELECT step_id, status, scheduled_at, COUNT(*) as count 
                           FROM subscriber_flow_states 
                           WHERE flow_id = ? 
                           GROUP BY step_id, status, scheduled_at
                           ORDER BY scheduled_at ASC");
    $stmt->execute([$flowId]);
    $results = $stmt->fetchAll(PDO::FETCH_ASSOC);

    if (empty($results)) {
        echo "<p style='color:red;'>No subscribers found in subscriber_flow_states for this flow ID.</p>";
    } else {
        echo "<table border='1' cellpadding='10' style='border-collapse:collapse; width:100%'>";
        echo "<tr style='background:#f1f5f9;'><th>Step ID</th><th>Step Name (Label)</th><th>Status</th><th>Scheduled At</th><th>Count</th><th>Context</th></tr>";
        
        $steps = json_decode($flow['steps'], true) ?: [];
        $stepNames = [];
        foreach ($steps as $s) {
            $stepNames[$s['id']] = $s['label'] ?? ($s['type'] ?? 'Unknown');
        }

        $nowTs = time();
        foreach ($results as $r) {
            $name = $stepNames[$r['step_id']] ?? "Unknown Step ({$r['step_id']})";
            $color = ($r['status'] === 'waiting') ? 'blue' : (($r['status'] === 'processing') ? 'orange' : 'black');
            $schedTs = strtotime($r['scheduled_at']);
            $isOverdue = ($r['status'] === 'waiting' && $schedTs <= $nowTs);
            
            echo "<tr>";
            echo "<td><small>{$r['step_id']}</small></td>";
            echo "<td><strong>$name</strong></td>";
            echo "<td style='color:$color;'>{$r['status']}</td>";
            echo "<td" . ($isOverdue ? " style='background:#fee2e2; color:red;'" : "") . ">{$r['scheduled_at']}</td>";
            echo "<td><strong>{$r['count']}</strong></td>";
            echo "<td>" . ($isOverdue ? "<b>OVERDUE</b> (Worker should take this)" : "Waiting for time") . "</td>";
            echo "</tr>";
        }
        echo "</table>";
    }

    echo "<br><hr>";

    // 3. Worker Health
    echo "<h3>Worker Activity Check:</h3>";
    $logFiles = ['worker_flow.log', 'api/worker_flow.log', 'api/worker_flow_test.log'];
    $foundLog = false;
    foreach($logFiles as $lf) {
        if (file_exists($lf)) {
            $mtime = filemtime($lf);
            echo "Found log: <b>$lf</b><br>";
            echo "Last Activity: " . date('Y-m-d H:i:s', $mtime) . " (" . (time() - $mtime) . " seconds ago)<br>";
            $foundLog = true;
            break;
        }
    }
    if (!$foundLog) {
        echo "<p style='color:red;'>No worker log files found. Worker may have never run.</p>";
    }

    // 4. Recommendation
    echo "<h3>Recommendations:</h3>";
    echo "<ul>";
    echo "<li><b>If Campaign is Paused:</b> Change Status to <b>Active</b> in the UI.</li>";
    echo "<li><b>If Items are OVERDUE:</b> The Worker is not running. Check your Cron Job or trigger it manually: <a href='api/worker_flow.php' target='_blank'>Run Worker Manual</a>.</li>";
    echo "<li><b>If status is 'processing' for too long:</b> Use <a href='rescue_stuck_flows.php'>rescue_stuck_flows.php</a> to reset them to 'waiting'.</li>";
    echo "</ul>";

} catch (Exception $e) {
    echo "<h3 style='color:red;'>Database Error:</h3>";
    echo "<pre>" . $e->getMessage() . "</pre>";
}
