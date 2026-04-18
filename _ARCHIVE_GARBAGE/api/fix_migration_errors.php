<?php
require_once 'db_connect.php';

$flowId = '6972fea76fa61';
$targetStepId = '08542221-c4da-4249-9b2b-2feb8f300581'; // Bước Gửi Email 12h
$scheduledAt = '2026-01-26 17:00:00';

// Danh sách các Queue ID cần đưa về chuẩn
$queueIds = [148, 159, 149];

try {
    $stmt = $pdo->prepare("
        UPDATE subscriber_flow_states 
        SET step_id = ?, 
            status = 'waiting', 
            scheduled_at = ?, 
            updated_at = NOW(),
            last_error = NULL
        WHERE id = ?
    ");

    $successCount = 0;
    foreach ($queueIds as $id) {
        if ($stmt->execute([$targetStepId, $scheduledAt, $id])) {
            $successCount++;
        }
    }

    echo json_encode([
        'success' => true,
        'message' => "Đã đưa $successCount/3 người về đúng lộ trình chuẩn ngày 26/01.",
        'details' => "Tài khoản dinhthanh, thaont và phucht đã được đồng bộ."
    ]);

} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
