<?php
// api/force_finish_v3.php
require_once 'db_connect.php';
require_once 'flow_helpers.php';

echo "<pre>--- FINAL ATTEMPT: FORCING TO TRUE FINISH LINE --- \n";

try {
    $fid = 'ad16ed97-06b8-49a6-a8da-222c93191db0';

    // 1. Tìm ID của bước có chữ "Hoàn thành" trong tên
    $stmtFlow = $pdo->prepare("SELECT steps FROM flows WHERE id = ?");
    $stmtFlow->execute([$fid]);
    $steps = json_decode($stmtFlow->fetchColumn(), true);

    $finalStepId = null;
    foreach ($steps as $s) {
        $name = mb_strtolower($s['name'] ?? '');
        if (strpos($name, 'hoàn thành') !== false || strpos($name, 'finish') !== false) {
            $finalStepId = $s['id'];
            echo "Found Final Step by Name: <b>" . ($s['name'] ?? 'Completed') . "</b> (ID: $finalStepId)\n";
            // Don't break, find the last one if multiple exist
        }
    }

    if (!$finalStepId) {
        // Fallback: The very last step in the array usually
        $lastStep = end($steps);
        $finalStepId = $lastStep['id'];
        echo "Fallback to last step in array: " . ($lastStep['name'] ?? 'End') . " (ID: $finalStepId)\n";
    }

    // 2. Đẩy tất cả 12 người về đúng mã ID này
    $stmtUpd = $pdo->prepare("UPDATE subscriber_flow_states SET step_id = ?, status = 'completed', updated_at = NOW() WHERE flow_id = ? AND (status = 'completed' OR step_id = 'd327fe62-c975-4bbe-bb3a-a352c409de86')");
    $stmtUpd->execute([$finalStepId, $fid]);
    $affected = $stmtUpd->rowCount();

    echo "Successfully moved $affected subscribers to the real Finish Line.\n";

    // 3. Force update the flow stats table
    $pdo->prepare("UPDATE flows SET stat_completed = ? WHERE id = ?")->execute([$affected, $fid]);

    echo "\nDONE! Please check your dashboard. The 'Hoàn thành Flow' box should now show its true count.";

} catch (Exception $e) {
    echo "ERROR: " . $e->getMessage() . "\n";
}
echo "</pre>";
