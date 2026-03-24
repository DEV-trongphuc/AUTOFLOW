<?php
// api/fix_missing_logs.php
require_once 'db_connect.php';
require_once 'flow_helpers.php';

echo "<pre>--- FIXING MISSING FLOW LOGS --- \n";

try {
    $fid = 'ad16ed97-06b8-49a6-a8da-222c93191db0';
    $tagStepId = 'd327fe62-c975-4bbe-bb3a-a352c409de86';

    // 1. Find everyone who is at this step or completed it
    $stmt = $pdo->prepare("SELECT q.subscriber_id, f.name as flow_name FROM subscriber_flow_states q JOIN flows f ON q.flow_id = f.id WHERE q.flow_id = ? AND q.step_id = ?");
    $stmt->execute([$fid, $tagStepId]);
    $subs = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo "Found " . count($subs) . " subscribers to verify logs.\n";

    $fixed = 0;
    foreach ($subs as $s) {
        $sid = $s['subscriber_id'];

        // Check if log exists
        $stmtCheck = $pdo->prepare("SELECT id FROM subscriber_activity WHERE subscriber_id = ? AND flow_id = ? AND reference_id = ? AND type = 'update_tag' LIMIT 1");
        $stmtCheck->execute([$sid, $fid, $tagStepId]);

        if (!$stmtCheck->fetch()) {
            // Missing! Let's insert it manually
            logActivity($pdo, $sid, 'update_tag', $tagStepId, $s['flow_name'], "Tags add: SOCIAL_HEAT (Recovery Log)", $fid);
            echo "  - Fixed log for Sub: $sid\n";
            $fixed++;
        }
    }

    echo "\nFixed $fixed missing logs.\n";
    echo "Now your Modal should show the subscribers correctly!";

} catch (Exception $e) {
    echo "ERROR: " . $e->getMessage() . "\n";
}
echo "</pre>";
