<?php
// debug_stalled_flows.php
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Fix path: if file is IN mail_api, just require db_connect.php directly
if (file_exists('db_connect.php')) {
    require 'db_connect.php';
} elseif (file_exists('api/db_connect.php')) {
    require 'api/db_connect.php';
} else {
    die("Error: Could not find db_connect.php. Please check file location.");
}

// Override db_connect's JSON header
header("Content-Type: text/html; charset=UTF-8");
if (ob_get_length())
    ob_clean();

echo "<h2>MailFlow Pro - Stuck Flows Diagnostics</h2>";
$now = date('Y-m-d H:i:s');
echo "Current Server Time: $now <br><hr>";

try {
    // 1. Check for items stuck in 'processing' mode for too long
    echo "<h3>1. Stalled 'processing' items (> 5 mins)</h3>";
    $stmtStalled = $pdo->prepare("
        SELECT q.id, q.subscriber_id, s.email, q.flow_id, f.name as flow_name, q.step_id, q.updated_at, q.scheduled_at, f.status as flow_status
        FROM subscriber_flow_states q
        JOIN subscribers s ON q.subscriber_id = s.id
        JOIN flows f ON q.flow_id = f.id
        WHERE q.status = 'processing' 
        AND q.updated_at < DATE_SUB(NOW(), INTERVAL 5 MINUTE)
    ");
    $stmtStalled->execute();
    $stalled = $stmtStalled->fetchAll();

    if (empty($stalled)) {
        echo "<p style='color:green;'>No stalled processing items found. (This is good)</p>";
    } else {
        echo "<table border='1' cellpadding='5' style='border-collapse:collapse;'>
                <tr style='background:#fee2e2;'>
                    <th>Queue ID</th><th>Email</th><th>Flow Name</th><th>Step ID</th><th>Status</th><th>Updated At</th><th>Action</th>
                </tr>";
        foreach ($stalled as $s) {
            echo "<tr>
                    <td>{$s['id']}</td>
                    <td>{$s['email']}</td>
                    <td>{$s['flow_name']} ({$s['flow_status']})</td>
                    <td>{$s['step_id']}</td>
                    <td style='color:red;'>STUCK</td>
                    <td>{$s['updated_at']}</td>
                    <td><small>Will be auto-recovered by next worker run</small></td>
                  </tr>";
        }
        echo "</table>";
    }

    // 2. Check for items that SHOULD be running now but aren't
    echo "<h3>2. Items due to run (status='waiting' AND scheduled_at <= now)</h3>";
    $stmtDue = $pdo->prepare("
        SELECT q.id, q.subscriber_id, s.email, q.flow_id, f.name as flow_name, q.step_id, q.scheduled_at, f.status as flow_status, s.status as sub_status
        FROM subscriber_flow_states q
        JOIN subscribers s ON q.subscriber_id = s.id
        JOIN flows f ON q.flow_id = f.id
        WHERE q.status = 'waiting' 
        AND q.scheduled_at <= ?
        LIMIT 100
    ");
    $stmtDue->execute([$now]);
    $due = $stmtDue->fetchAll();

    if (empty($due)) {
        echo "<p style='color:green;'>No waiting items are currently overdue.</p>";
    } else {
        echo "<p>Found " . count($due) . " items overdue (showing first 100). Checking potential reasons...</p>";
        echo "<table border='1' cellpadding='5' style='border-collapse:collapse;'>
                <tr style='background:#fef3c7;'>
                    <th>Queue ID</th><th>Email (Status)</th><th>Flow Name (Status)</th><th>Scheduled At</th><th>Reason Check</th>
                </tr>";
        foreach ($due as $d) {
            $reason = "Worker is not running OR items are blocked by another long-running process.";
            if ($d['flow_status'] !== 'active')
                $reason = "<b>Flow is NOT active.</b> (Change to active to process)";
            if (!in_array($d['sub_status'], ['active', 'lead', 'customer']))
                $reason = "<b>Subscriber is {$d['sub_status']}.</b> (Will exit flow on next run)";

            echo "<tr>
                    <td>{$d['id']}</td>
                    <td>{$d['email']} ({$d['sub_status']})</td>
                    <td>{$d['flow_name']} ({$d['flow_status']})</td>
                    <td>{$d['scheduled_at']}</td>
                    <td>$reason</td>
                  </tr>";
        }
        echo "</table>";
    }

    // 3. Check Worker Health
    echo "<h3>3. Worker Activity Check</h3>";
    $logFile = 'worker_flow.log'; // Relative path if in the same folder
    if (file_exists($logFile)) {
        $lastModified = date('Y-m-d H:i:s', filemtime($logFile));
        echo "Last Worker activity logged: <b>$lastModified</b> (" . (time() - filemtime($logFile)) . " seconds ago)<br>";

        $lines = file($logFile);
        $lastLines = array_slice($lines, -15);
        echo "<pre style='background:#f8fafc; padding:10px; font-size:11px; border:1px solid #ddd;'>" . htmlspecialchars(implode("", $lastLines)) . "</pre>";
    } else {
        echo "<p style='color:red;'>Worker log file (worker_flow.log) not found in current directory.</p>";
    }

    // 4. Recommendation
    echo "<h3>Recommendations</h3>";
    echo "<ul>
            <li>If worker is not logged recently: Check Cron Job or visit <a href='worker_flow.php' target='_blank'>worker_flow.php</a> manually.</li>
            <li>If items are stuck in 'processing': Wait 5 minutes for self-healing or manually set status to 'waiting' in DB.</li>
            <li>Check if your server time matches your expectations (Current: <b>$now</b>).</li>
          </ul>";

} catch (Exception $e) {
    echo "<p style='color:red;'>Error: " . $e->getMessage() . "</p>";
}
