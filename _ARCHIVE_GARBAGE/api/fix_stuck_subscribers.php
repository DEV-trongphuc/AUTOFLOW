<?php
// api/fix_stuck_subscribers.php
// Script to fix subscribers stuck between Step 1 and Step 2 due to the missing break bug

ini_set('display_errors', 1);
error_reporting(E_ALL);
require_once 'db_connect.php';

$flowId = $_GET['flow_id'] ?? null;
$dryRun = isset($_GET['dry_run']) && $_GET['dry_run'] === '1';

if (!$flowId) {
    die("Usage: fix_stuck_subscribers.php?flow_id=YOUR_FLOW_ID&dry_run=1\n\nRemove dry_run=1 to actually fix the data.");
}

echo "<h2>Fix Stuck Subscribers - Flow ID: $flowId</h2>";
echo "<p>Mode: " . ($dryRun ? "<strong style='color: orange;'>DRY RUN (No changes will be made)</strong>" : "<strong style='color: red;'>LIVE MODE (Will update database)</strong>") . "</p>";

// Get flow info
$stmtFlow = $pdo->prepare("SELECT id, name, steps FROM flows WHERE id = ?");
$stmtFlow->execute([$flowId]);
$flow = $stmtFlow->fetch(PDO::FETCH_ASSOC);

if (!$flow) {
    die("Flow not found!");
}

echo "<h3>Flow: {$flow['name']}</h3>";

// Parse steps to find Step 1 (email) and Step 2 (condition)
$steps = json_decode($flow['steps'], true) ?: [];
$step1Id = null;
$step2Id = null;

foreach ($steps as $step) {
    if ($step['type'] === 'email') {
        $step1Id = $step['id'];
        $step2Id = $step['nextStepId'] ?? null;
        echo "<p>Found Step 1 (Email): {$step['label']} (ID: $step1Id)</p>";
        if ($step2Id) {
            // Find step 2 details
            foreach ($steps as $s2) {
                if ($s2['id'] === $step2Id) {
                    echo "<p>Found Step 2 ({$s2['type']}): {$s2['label']} (ID: $step2Id)</p>";
                    break;
                }
            }
        }
        break;
    }
}

if (!$step1Id || !$step2Id) {
    die("Could not identify Step 1 and Step 2 in this flow.");
}

// Find stuck subscribers
// These are subscribers who:
// 1. Have completed Step 1 (status = 'completed' or moved to next step)
// 2. But are NOT in Step 2 yet
// 3. OR are in a weird state

echo "<h4>Searching for stuck subscribers...</h4>";

// Strategy: Find all subscribers who last interacted with Step 1 but are not in Step 2
$stmtStuck = $pdo->prepare("
    SELECT 
        sfs.id as queue_id,
        sfs.subscriber_id,
        s.email,
        sfs.step_id,
        sfs.status,
        sfs.created_at,
        sfs.updated_at,
        TIMESTAMPDIFF(SECOND, sfs.updated_at, NOW()) as seconds_since_update
    FROM subscriber_flow_states sfs
    LEFT JOIN subscribers s ON s.id = sfs.subscriber_id
    WHERE sfs.flow_id = ?
    AND sfs.step_id = ?
    AND sfs.status IN ('processing', 'completed')
    ORDER BY sfs.updated_at DESC
");
$stmtStuck->execute([$flowId, $step1Id]);
$stuckSubscribers = $stmtStuck->fetchAll(PDO::FETCH_ASSOC);

if (empty($stuckSubscribers)) {
    echo "<p style='color: green;'>✅ No stuck subscribers found at Step 1!</p>";

    // Also check if there are subscribers in 'waiting' status at Step 2
    $stmtWaiting = $pdo->prepare("
        SELECT COUNT(*) as count
        FROM subscriber_flow_states
        WHERE flow_id = ?
        AND step_id = ?
        AND status = 'waiting'
    ");
    $stmtWaiting->execute([$flowId, $step2Id]);
    $waitingCount = $stmtWaiting->fetchColumn();

    echo "<p>ℹ️ Subscribers waiting at Step 2: <strong>$waitingCount</strong></p>";
    echo "<p>These subscribers are correctly waiting for the condition to be met or timeout.</p>";

} else {
    echo "<p style='color: orange;'>⚠️ Found " . count($stuckSubscribers) . " subscribers stuck at Step 1</p>";

    echo "<table border='1' cellpadding='5' style='border-collapse: collapse;'>";
    echo "<tr>
        <th>Queue ID</th>
        <th>Email</th>
        <th>Current Step</th>
        <th>Status</th>
        <th>Last Updated</th>
        <th>Time Stuck</th>
        <th>Action</th>
    </tr>";

    $fixedCount = 0;

    foreach ($stuckSubscribers as $sub) {
        $timeStuck = gmdate("H:i:s", $sub['seconds_since_update']);
        $daysStuck = floor($sub['seconds_since_update'] / 86400);
        $timeDisplay = $daysStuck > 0 ? "$daysStuck days, $timeStuck" : $timeStuck;

        echo "<tr>";
        echo "<td>{$sub['queue_id']}</td>";
        echo "<td>{$sub['email']}</td>";
        echo "<td>$step1Id</td>";
        echo "<td>{$sub['status']}</td>";
        echo "<td>{$sub['updated_at']}</td>";
        echo "<td>$timeDisplay</td>";

        if (!$dryRun) {
            // Fix: Move to Step 2 with 'waiting' status
            try {
                $pdo->prepare("
                    UPDATE subscriber_flow_states 
                    SET step_id = ?, 
                        status = 'waiting', 
                        scheduled_at = NOW(),
                        created_at = NOW(),
                        updated_at = NOW() 
                    WHERE id = ?
                ")->execute([$step2Id, $sub['queue_id']]);

                echo "<td style='color: green;'>✅ Moved to Step 2</td>";
                $fixedCount++;
            } catch (Exception $e) {
                echo "<td style='color: red;'>❌ Error: " . $e->getMessage() . "</td>";
            }
        } else {
            echo "<td style='color: blue;'>Would move to Step 2</td>";
            $fixedCount++;
        }

        echo "</tr>";
    }

    echo "</table>";

    if ($dryRun) {
        echo "<p style='color: orange;'>⚠️ DRY RUN: No changes were made. Remove <code>dry_run=1</code> to actually fix these subscribers.</p>";
        echo "<p><a href='?flow_id=$flowId' style='background: #e74c3c; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;'>🔧 RUN FIX NOW</a></p>";
    } else {
        echo "<p style='color: green;'>✅ Fixed $fixedCount subscribers!</p>";
        echo "<p>These subscribers have been moved to Step 2 and will be processed by the next worker run.</p>";
    }
}

echo "<hr>";
echo "<p><a href='debug_flow_states.php?flow_id=$flowId'>📊 View Full Flow State Debug</a></p>";
?>