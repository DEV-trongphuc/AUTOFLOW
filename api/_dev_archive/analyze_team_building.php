<?php
header('Content-Type: text/plain; charset=utf-8');
require 'db_connect.php';

$flowId = '6972fea76fa61'; // Chiến dịch Team Building

echo "=== PHÂN TÍCH FLOW: Chiến dịch Team Building ===\n\n";

// 1. Lấy thông tin flow
$stmt = $pdo->prepare("SELECT name, status, created_at, steps FROM flows WHERE id = ?");
$stmt->execute([$flowId]);
$flow = $stmt->fetch(PDO::FETCH_ASSOC);

echo "Flow Name: {$flow['name']}\n";
echo "Status: {$flow['status']}\n";
echo "Created: {$flow['created_at']}\n\n";

// 2. Phân tích steps
$steps = json_decode($flow['steps'], true);
echo "Tổng số steps: " . count($steps) . "\n";
$finalStep = end($steps);
echo "Bước cuối cùng: {$finalStep['label']} (ID: {$finalStep['id']})\n";
echo "Type: {$finalStep['type']}\n\n";

// 3. Kiểm tra 22 người "completed" này
echo "=== PHÂN TÍCH 22 NGƯỜI COMPLETED ===\n\n";

$stmt = $pdo->prepare("
    SELECT sfs.subscriber_id, sfs.step_id, sfs.updated_at, s.email
    FROM subscriber_flow_states sfs
    LEFT JOIN subscribers s ON sfs.subscriber_id = s.id
    LEFT JOIN subscriber_activity sa ON sfs.subscriber_id = sa.subscriber_id 
        AND sfs.flow_id = sa.flow_id 
        AND sa.type = 'complete_flow'
    WHERE sfs.flow_id = ? AND sfs.status = 'completed'
    AND sa.id IS NULL
    ORDER BY sfs.updated_at DESC
");
$stmt->execute([$flowId]);
$users = $stmt->fetchAll(PDO::FETCH_ASSOC);

foreach ($users as $i => $u) {
    echo "Người " . ($i + 1) . ":\n";
    echo "  Email: {$u['email']}\n";
    echo "  Subscriber ID: {$u['subscriber_id']}\n";
    echo "  Step ID: {$u['step_id']}\n";
    echo "  Updated: {$u['updated_at']}\n";

    // Kiểm tra xem họ có activity logs nào không
    $stmt = $pdo->prepare("
        SELECT type, reference_id, created_at 
        FROM subscriber_activity 
        WHERE flow_id = ? AND subscriber_id = ?
        ORDER BY created_at DESC
        LIMIT 5
    ");
    $stmt->execute([$flowId, $u['subscriber_id']]);
    $activities = $stmt->fetchAll(PDO::FETCH_ASSOC);

    if (!empty($activities)) {
        echo "  Activity logs (5 gần nhất):\n";
        foreach ($activities as $act) {
            echo "    - {$act['type']} | Step: {$act['reference_id']} | {$act['created_at']}\n";
        }
    } else {
        echo "  ⚠️ KHÔNG CÓ ACTIVITY LOG NÀO!\n";
    }

    echo "\n";
}

// 4. Đề xuất
echo "\n=== ĐỀ XUẤT XỬ LÝ ===\n\n";

$noActivityCount = 0;
foreach ($users as $u) {
    $stmt = $pdo->prepare("SELECT COUNT(*) FROM subscriber_activity WHERE flow_id = ? AND subscriber_id = ?");
    $stmt->execute([$flowId, $u['subscriber_id']]);
    if ($stmt->fetchColumn() == 0) {
        $noActivityCount++;
    }
}

if ($noActivityCount > 0) {
    echo "⚠️ Có $noActivityCount người HOÀN TOÀN KHÔNG CÓ activity log.\n";
    echo "Đây có thể là:\n";
    echo "  1. Dữ liệu test cũ\n";
    echo "  2. Dữ liệu migration bị lỗi\n";
    echo "  3. Dữ liệu được import thủ công\n\n";
    echo "Khuyến nghị: XÓA những record này khỏi subscriber_flow_states\n";
} else {
    echo "✅ Tất cả đều có activity logs, chỉ thiếu complete_flow log.\n";
    echo "Khuyến nghị: THÊM complete_flow log cho họ (nếu họ thực sự đã hoàn thành)\n";
}
