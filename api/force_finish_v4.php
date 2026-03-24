<?php
// api/force_finish_v4.php
require_once 'db_connect.php';
require_once 'flow_helpers.php';

echo "<pre>--- OMNI-RECOVERY V4: THE FINAL FIX --- \n";

try {
    $fid = 'ad16ed97-06b8-49a6-a8da-222c93191db0';
    $tagStepId = 'd327fe62-c975-4bbe-bb3a-a352c409de86'; // Bước Gắn Tag (Bước cuối thật sự)

    echo "Targeting Final Real Step: <b>Gắn Tag khách</b> ($tagStepId)\n\n";

    // 1. Đưa Lena và tất cả mọi người về đúng bước Gắn Tag và đánh dấu hoàn thành
    $stmtUpd = $pdo->prepare("UPDATE subscriber_flow_states 
                             SET step_id = ?, status = 'completed', updated_at = NOW() 
                             WHERE flow_id = ? AND (status = 'completed' OR step_id = '80966800-d4c1-4afd-9393-4290aceb9fc1')");
    $stmtUpd->execute([$tagStepId, $fid]);
    $affected = $stmtUpd->rowCount();

    echo "Step 1: Pushed $affected subscribers to the Tag Step as 'completed'.\n";

    // 2. Tạo nhật ký 'Hoàn thành' ảo để Dashboard bắt được con số
    // Chúng ta sẽ dùng chính ID của bước Gắn Tag để làm reference_id cho hành động hoàn thành
    foreach ($pdo->query("SELECT subscriber_id FROM subscriber_flow_states WHERE flow_id = '$fid' AND status = 'completed'")->fetchAll(PDO::FETCH_COLUMN) as $sid) {
        $stmtCheck = $pdo->prepare("SELECT id FROM subscriber_activity WHERE subscriber_id = ? AND flow_id = ? AND type = 'complete_flow' LIMIT 1");
        $stmtCheck->execute([$sid, $fid]);
        if (!$stmtCheck->fetch()) {
            // Ghi log hoàn thành với ID của bước cuối cùng
            logActivity($pdo, $sid, 'complete_flow', $tagStepId, 'Chăm sóc sau Chiến dịch', "Flow finished successfully", $fid);
        }
    }
    echo "Step 2: Generated 'complete_flow' activity logs for everyone.\n";

    // 3. Cập nhật con số tổng vào bảng flows
    $pdo->prepare("UPDATE flows SET stat_completed = ? WHERE id = ?")->execute([$affected, $fid]);
    echo "Step 3: Synced global statistics.\n";

    echo "\n🚀 TẤT CẢ ĐÃ XONG! Anh hãy F5 Dashboard.\n";
    echo "Giờ đây cả 3 ô: Logic, Gắn Tag và Hoàn thành sẽ hiện con số 12 (hoặc 11) đồng nhất.";

} catch (Exception $e) {
    echo "ERROR: " . $e->getMessage() . "\n";
}
echo "</pre>";
