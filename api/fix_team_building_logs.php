<?php
/**
 * FIX: Add missing complete_flow logs for Team Building flow
 */
header('Content-Type: text/plain; charset=utf-8');
require 'db_connect.php';

$flowId = '6972fea76fa61'; // Chiến dịch Team Building
$finalStepId = '6bf86c26-83b4-4c41-b822-1ff0c00a61c9'; // Bước cuối cùng

echo "=== THÊM COMPLETE_FLOW LOG CHO 22 NGƯỜI ===\n\n";

// Lấy danh sách 22 người cần fix
$stmt = $pdo->prepare("
    SELECT sfs.subscriber_id, sfs.updated_at, s.email
    FROM subscriber_flow_states sfs
    LEFT JOIN subscribers s ON sfs.subscriber_id = s.id
    LEFT JOIN subscriber_activity sa ON sfs.subscriber_id = sa.subscriber_id 
        AND sfs.flow_id = sa.flow_id 
        AND sa.type = 'complete_flow'
    WHERE sfs.flow_id = ? AND sfs.status = 'completed'
    AND sa.id IS NULL
");
$stmt->execute([$flowId]);
$users = $stmt->fetchAll(PDO::FETCH_ASSOC);

echo "Tìm thấy " . count($users) . " người cần thêm complete_flow log.\n\n";

$fixed = 0;

foreach ($users as $u) {
    echo "Xử lý: {$u['email']} ({$u['subscriber_id']})...\n";

    // Thêm complete_flow log với timestamp = updated_at của state
    // (để đảm bảo timeline chính xác)
    $stmt = $pdo->prepare("
        INSERT INTO subscriber_activity 
        (flow_id, subscriber_id, type, reference_id, created_at)
        VALUES (?, ?, 'complete_flow', ?, ?)
    ");

    try {
        $stmt->execute([
            $flowId,
            $u['subscriber_id'],
            $finalStepId,
            $u['updated_at'] // Dùng thời gian completed từ state table
        ]);
        echo "  ✅ Đã thêm complete_flow log (timestamp: {$u['updated_at']})\n";
        $fixed++;
    } catch (PDOException $e) {
        // Có thể bị duplicate nếu đã chạy script này rồi
        if ($e->getCode() == 23000) {
            echo "  ⚠️ Log đã tồn tại, bỏ qua.\n";
        } else {
            echo "  ❌ LỖI: " . $e->getMessage() . "\n";
        }
    }
}

echo "\n========================================\n";
echo "KẾT QUẢ:\n";
echo "========================================\n";
echo "Đã thêm complete_flow log cho: $fixed người\n";
echo "\n✅ HOÀN THÀNH!\n";
echo "\nBây giờ hãy chạy lại audit_fix_all_flows.php để xác nhận.\n";
