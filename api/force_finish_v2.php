<?php
// api/force_finish_v2.php
require_once 'db_connect.php';
require_once 'flow_helpers.php';

echo "<pre>--- SMART FORCING TO FINISH LINE --- \n";

try {
    $fid = 'ad16ed97-06b8-49a6-a8da-222c93191db0';

    // 1. Dò tìm ID của bước kết thúc chuẩn trong Flow
    $stmtFlow = $pdo->prepare("SELECT steps FROM flows WHERE id = ?");
    $stmtFlow->execute([$fid]);
    $steps = json_decode($stmtFlow->fetchColumn(), true);

    $finalStepId = null;
    // Tìm bước 'exit' hoặc bước cuối cùng không có nextStepId
    foreach ($steps as $s) {
        if ($s['type'] === 'exit' || $s['type'] === 'complete' || empty($s['nextStepId'])) {
            // Ưu tiên bước sau bước Gắn Tag
            if ($s['id'] !== 'd327fe62-c975-4bbe-bb3a-a352c409de86') {
                $finalStepId = $s['id'];
                if ($s['type'] === 'exit')
                    break;
            }
        }
    }

    if (!$finalStepId) {
        echo "Could not auto-detect final step. Using fallback logic.\n";
        $finalStepId = '75d19b7a-9762-45e3-820d-830206a41434';
    }

    echo "Detected Final Step ID: <b>$finalStepId</b>\n\n";

    // 2. Đẩy tất cả những người đã 'completed' về bước này
    $stmtUpd = $pdo->prepare("UPDATE subscriber_flow_states SET step_id = ?, updated_at = NOW() WHERE flow_id = ? AND status = 'completed'");
    $stmtUpd->execute([$finalStepId, $fid]);
    $affected = $stmtUpd->rowCount();

    echo "Moved $affected subscribers to the correct Finish Step.\n";

    // 3. Cập nhật lại bộ đếm của Flow
    $pdo->prepare("UPDATE flows SET stat_completed = ? WHERE id = ?")->execute([$affected, $fid]);

    echo "\nDONE! Please refresh your dashboard.";

} catch (Exception $e) {
    echo "ERROR: " . $e->getMessage() . "\n";
}
echo "</pre>";
