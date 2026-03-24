<?php
/**
 * MIGRATION: Tối ưu dữ liệu Scroll Tracking
 * Mục tiêu: 
 * 1. Xóa bỏ các bản ghi scroll trung gian trong web_events, chỉ giữ lại bản ghi có % cao nhất cho mỗi lần xem trang.
 * 2. Đồng bộ giá trị scroll cao nhất vào cột scroll_depth của bảng web_page_views để tăng tốc báo cáo.
 */

require_once 'db_connect.php';
header('Content-Type: application/json');

try {
    $pdo->beginTransaction();

    // 1. Dọn dẹp bảng web_events: Chỉ giữ lại 1 bản ghi scroll có giá trị lớn nhất cho mỗi page_view_id
    // Chúng ta dùng CAST để đảm bảo so sánh số học trên cột target_text (vốn là varchar)
    $stmtEvents = $pdo->prepare("
        DELETE e1 FROM web_events e1
        INNER JOIN (
            SELECT 
                page_view_id, 
                MAX(CAST(target_text AS UNSIGNED)) as max_percent,
                MAX(id) as max_id
            FROM web_events 
            WHERE event_type = 'scroll' AND page_view_id IS NOT NULL
            GROUP BY page_view_id
        ) e2 ON e1.page_view_id = e2.page_view_id
        WHERE e1.event_type = 'scroll' 
          AND (CAST(e1.target_text AS UNSIGNED) < e2.max_percent OR e1.id < e2.max_id)
    ");
    $stmtEvents->execute();
    $eventsCleaned = $stmtEvents->rowCount();

    // 2. Đồng bộ ngược lại vào bảng web_page_views: Cập nhật scroll_depth nếu nó đang thấp hơn dữ liệu trong events
    $stmtSync = $pdo->prepare("
        UPDATE web_page_views pv
        INNER JOIN (
            SELECT page_view_id, MAX(CAST(target_text AS UNSIGNED)) as max_p
            FROM web_events 
            WHERE event_type = 'scroll'
            GROUP BY page_view_id
        ) e ON pv.id = e.page_view_id
        SET pv.scroll_depth = GREATEST(pv.scroll_depth, e.max_p)
        WHERE pv.scroll_depth < e.max_p
    ");
    $stmtSync->execute();
    $viewsUpdated = $stmtSync->rowCount();

    $pdo->commit();

    echo json_encode([
        'success' => true,
        'message' => 'Đã tối ưu dữ liệu Scroll thành công.',
        'details' => [
            'events_row_removed' => $eventsCleaned,
            'page_views_updated' => $viewsUpdated,
            'status' => 'Dữ liệu đã được thu gọn: Mỗi PageView hiện chỉ còn tối đa 1 sự kiện Scroll đại diện.'
        ]
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

} catch (Exception $e) {
    if ($pdo->inTransaction())
        $pdo->rollBack();
    echo json_encode([
        'success' => false,
        'message' => 'Lỗi khi thực hiện migration: ' . $e->getMessage()
    ]);
}
