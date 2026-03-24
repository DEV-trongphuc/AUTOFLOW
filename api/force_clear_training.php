<?php
// api/force_clear_training.php
// FILE DÙNG ĐỂ RESET NHANH KHI BỊ TREO HUẤN LUYỆN
require_once 'db_connect.php';

header('Content-Type: application/json');

try {
    $pdo->beginTransaction();

    // 1. Xóa các job đang chờ trong hàng đợi
    $stmt1 = $pdo->prepare("DELETE FROM queue_jobs WHERE queue = 'ai_training'");
    $stmt1->execute();
    $jobsDeleted = $stmt1->rowCount();

    // 2. Tìm các tài liệu đang bị kẹt ở trạng thái 'processing'
    $stmt2 = $pdo->query("SELECT id FROM ai_training_docs WHERE status = 'processing'");
    $stuckIds = $stmt2->fetchAll(PDO::FETCH_COLUMN);

    if (!empty($stuckIds)) {
        $placeholders = implode(',', array_fill(0, count($stuckIds), '?'));

        // Xóa chunks của các tài liệu này
        $pdo->prepare("DELETE FROM ai_training_chunks WHERE doc_id IN ($placeholders)")->execute($stuckIds);

        // Xóa chính tài liệu đó (hoặc bạn có thể UPDATE về 'pending' nếu muốn giữ lại file)
        // Ở đây tôi chọn XÓA luôn theo yêu cầu "xóa nhanh đi" của bạn
        $pdo->prepare("DELETE FROM ai_training_docs WHERE id IN ($placeholders)")->execute($stuckIds);
    }

    $docsDeleted = count($stuckIds);

    $pdo->commit();

    echo json_encode([
        'success' => true,
        'message' => 'Đã dọn dẹp sạch sẽ!',
        'details' => [
            'jobs_cleared' => $jobsDeleted,
            'stuck_docs_deleted' => $docsDeleted
        ]
    ]);

} catch (Exception $e) {
    if ($pdo->inTransaction())
        $pdo->rollBack();
    echo json_encode([
        'success' => false,
        'message' => 'Lỗi: ' . $e->getMessage()
    ]);
}
