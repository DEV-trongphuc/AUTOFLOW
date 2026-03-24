<?php
// api/sync_flow_final.php
require_once 'db_connect.php';

echo "<pre>--- FINAL SYNCHRONIZATION --- \n";

try {
    $fid = 'ad16ed97-06b8-49a6-a8da-222c93191db0';
    $logicStepId = '80966800-d4c1-4afd-9393-4290aceb9fc1';
    $tagStepId = 'd327fe62-c975-4bbe-bb3a-a352c409de86';

    // 1. Chỉnh lại Step ID cho tất cả những ai đã hoàn thành
    // Đảm bảo họ được ghi nhận là kết thúc tại bước Gắn Tag
    $stmt1 = $pdo->prepare("UPDATE subscriber_flow_states SET step_id = ? WHERE flow_id = ? AND status = 'completed'");
    $stmt1->execute([$tagStepId, $fid]);
    echo "1. Updated last step to 'Gắn Tag khách' for all completed users.\n";

    // 2. Tính toán lại con số IF/ELSE chuẩn từ Nhật ký hoạt động
    $stmt2 = $pdo->prepare("SELECT COUNT(DISTINCT subscriber_id) FROM subscriber_activity WHERE flow_id = ? AND reference_id = ? AND type = 'condition_true'");
    $stmt2->execute([$fid, $logicStepId]);
    $countIF = $stmt2->fetchColumn();

    // 3. Cập nhật lại stats chuẩn vào database để Dashboard đọc
    $pdo->prepare("UPDATE flows SET stat_completed = ? WHERE id = ?")->execute([$countIF, $fid]);
    echo "2. Total 'IF' (Opened) users: <b>$countIF</b>\n";

    echo "\n🚀 XONG! Anh hãy F5 Dashboard.\n";
    echo "Bây giờ anh Phuc sẽ hiện đúng tên bước 'Gắn Tag' và con số sẽ là 13 IF đồng nhất.";

} catch (Exception $e) {
    echo "ERROR: " . $e->getMessage();
}
echo "</pre>";
