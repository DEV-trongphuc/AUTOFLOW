<?php
// api/force_finish.php
require_once 'db_connect.php';
require_once 'flow_helpers.php';

echo "<pre>--- FORCING SUBSCRIBERS TO FINISH LINE --- \n";

try {
    $fid = 'ad16ed97-06b8-49a6-a8da-222c93191db0';
    $finalStepId = '75d19b7a-9762-45e3-820d-830206a41434'; // ID của bước Hoàn thành Flow

    // Find subscribers who are 'completed' but NOT at the final step ID
    $stmt = $pdo->prepare("SELECT q.id, q.subscriber_id, q.step_id, f.name as flow_name 
                           FROM subscriber_flow_states q 
                           JOIN flows f ON q.flow_id = f.id 
                           WHERE q.flow_id = ? AND q.status = 'completed' AND q.step_id != ?");
    $stmt->execute([$fid, $finalStepId]);
    $stuckOnes = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo "Found " . count($stuckOnes) . " subscribers stuck near the finish line.\n";

    foreach ($stuckOnes as $s) {
        $sid = $s['subscriber_id'];
        $qid = $s['id'];

        // 1. Move them to the final step ID
        $stmtUpd = $pdo->prepare("UPDATE subscriber_flow_states SET step_id = ?, updated_at = NOW() WHERE id = ?");
        $stmtUpd->execute([$finalStepId, $qid]);

        // 2. Ensure activity log exists for completion
        $stmtCheck = $pdo->prepare("SELECT id FROM subscriber_activity WHERE subscriber_id = ? AND flow_id = ? AND type = 'complete_flow' LIMIT 1");
        $stmtCheck->execute([$sid, $fid]);

        if (!$stmtCheck->fetch()) {
            logActivity($pdo, $sid, 'complete_flow', $finalStepId, $s['flow_name'], "Flow finished (Forced Recovery)", $fid);
            echo "  - Pushed Sub ID: $sid to Complete.\n";
        }
    }

    // 3. Sync stats one last time
    $totalCompleted = $pdo->prepare("SELECT COUNT(*) FROM subscriber_flow_states WHERE flow_id = ? AND status = 'completed' AND step_id = ?");
    $totalCompleted->execute([$fid, $finalStepId]);
    $actualCount = $totalCompleted->fetchColumn();

    $pdo->prepare("UPDATE flows SET stat_completed = ? WHERE id = ?")->execute([$actualCount, $fid]);

    echo "\nSUCCESS: Everyone is now across the finish line ($actualCount total).";

} catch (Exception $e) {
    echo "ERROR: " . $e->getMessage() . "\n";
}
echo "</pre>";
