<?php
// api/exclude_existing_members.php - Chặn người cũ tham gia Automation
require_once 'db_connect.php';
require_once 'auth_middleware.php';
apiHeaders();

$flow_id = $_GET['flow_id'] ?? '';
$list_id = $_GET['list_id'] ?? '';
$workspace_id = get_current_workspace_id();

if (!$flow_id || !$list_id) {
    jsonResponse(false, null, 'Thiếu flow_id hoặc list_id');
}

try {
    // 1. Lấy danh sách tất cả subscriber đang có trong List này
    $stmt = $pdo->prepare("
        SELECT sl.subscriber_id 
        FROM subscriber_lists sl
        JOIN subscribers s ON sl.subscriber_id = s.id
        WHERE sl.list_id = ? AND s.workspace_id = ?
    ");
    $stmt->execute([$list_id, $workspace_id]);
    $subscriber_ids = $stmt->fetchAll(PDO::FETCH_COLUMN);

    if (empty($subscriber_ids)) {
        jsonResponse(true, ['affected' => 0], 'Không có ai trong danh sách để loại trừ. Hãy đảm bảo bạn đã Sync dữ liệu trước.');
    }

    $pdo->beginTransaction();

    $count = 0;
    $already_in_flow = 0;
    $chunks = array_chunk($subscriber_ids, 500);

    foreach ($chunks as $chunk) {
        $placeholders = implode(',', array_fill(0, count($chunk), '(?, ?, "skipped", "skipped", NOW(), "cancelled", NOW(), NOW(), NOW())'));
        $sql = "INSERT IGNORE INTO subscriber_flow_states 
                (subscriber_id, flow_id, step_id, step_type, scheduled_at, status, created_at, updated_at, last_step_at) 
                VALUES $placeholders";
        
        $params = [];
        foreach ($chunk as $sid) {
            $params[] = $sid;
            $params[] = $flow_id;
        }

        $stmtIns = $pdo->prepare($sql);
        $stmtIns->execute($params);
        $count += $stmtIns->rowCount();
    }

    $pdo->commit();

    jsonResponse(true, [
        'total_in_list' => count($subscriber_ids),
        'newly_excluded' => $count,
        'workspace_id' => $workspace_id
    ], "Thành công: Trong danh sách có " . count($subscriber_ids) . " người. Đã chặn mới $count người. Số còn lại đã có trong Flow từ trước nên được giữ nguyên.");

} catch (Exception $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    jsonResponse(false, null, 'Lỗi: ' . $e->getMessage());
}
