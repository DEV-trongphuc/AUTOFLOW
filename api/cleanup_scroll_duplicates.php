<?php
require_once 'db_connect.php';
header('Content-Type: application/json');

try {
    // Tìm các dòng scroll trùng lặp cho cùng một page_view_id
    // Chúng ta sẽ chỉ giữ lại dòng có ID lớn nhất (mốc cuộn mới nhất/sâu nhất)

    $sql = "DELETE e1 FROM web_events e1
            INNER JOIN web_events e2 
            WHERE e1.event_type = 'scroll' 
            AND e2.event_type = 'scroll'
            AND e1.page_view_id = e2.page_view_id
            AND e1.id < e2.id";

    $affectedRows = $pdo->exec($sql);

    echo json_encode([
        'success' => true,
        'message' => "Đã dọn dẹp các bản ghi Scroll trùng lặp thành công.",
        'cleaned_count' => $affectedRows
    ]);
} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
