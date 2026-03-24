<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

require_once 'db_connect.php';

if (!file_exists('zalo_helpers.php')) {
    header('Content-Type: application/json');
    die(json_encode(['error' => 'zalo_helpers.php not found']));
}
require_once 'zalo_helpers.php';

header('Content-Type: application/json');

$zaloUserId = $_GET['zalo_user_id'] ?? '';
if (!$zaloUserId) {
    die(json_encode(['error' => 'Missing zalo_user_id parameter']));
}

$results = [];

// RESET AI LOGIC - Thực hiện trước khi query dữ liệu
if (isset($_GET['reset']) && $_GET['reset'] === 'true') {
    $pdo->prepare("UPDATE zalo_subscribers SET ai_paused_until = NULL WHERE zalo_user_id = ?")->execute([$zaloUserId]);
    $vid = "zalo_" . $zaloUserId;
    $pdo->prepare("UPDATE ai_conversations SET status = 'ai' WHERE visitor_id = ?")->execute([$vid]);
    $results['reset_status'] = "SUCCESS: AI has been UNPAUSED and status set to 'ai'.";
}

try {
    // 1. Kiểm tra thông tin Fan (Subscriber)
    $stmt = $pdo->prepare("SELECT * FROM zalo_subscribers WHERE zalo_user_id = ?");
    $stmt->execute([$zaloUserId]);
    $sub = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$sub) {
        $results['subscriber'] = "Không tìm thấy người dùng này trong hệ thống Zalo.";
    } else {
        $results['subscriber'] = [
            'id' => $sub['id'],
            'display_name' => $sub['display_name'],
            'ai_paused_until' => $sub['ai_paused_until'],
            'is_paused' => (strtotime($sub['ai_paused_until'] ?? '') > time()) ? "YES (AI đang bị tạm dừng)" : "NO"
        ];
    }

    // 2. Kiểm tra trạng thái hội thoại (Conversation)
    $vid = "zalo_" . $zaloUserId;
    $stmtC = $pdo->prepare("SELECT * FROM ai_conversations WHERE visitor_id = ? ORDER BY last_message_at DESC LIMIT 1");
    $stmtC->execute([$vid]);
    $conv = $stmtC->fetch(PDO::FETCH_ASSOC);

    if (!$conv) {
        $results['conversation'] = "Chưa có hội thoại AI nào được tạo.";
    } else {
        $results['conversation'] = [
            'id' => $conv['id'],
            'status' => $conv['status'],
            'is_human_mode' => ($conv['status'] === 'human') ? "YES (Đang trong chế độ tư vấn viên, AI sẽ không trả lời)" : "NO"
        ];
    }

} catch (Exception $e) {
    $results['error'] = $e->getMessage();
}

// Thêm link hướng dẫn Reset trực tiếp trong JSON cho dễ click
$results['actions'] = [
    'reset_link' => "https://automation.ideas.edu.vn/mail_api/debug_zalo_ai.php?zalo_user_id=$zaloUserId&reset=true"
];

echo json_encode($results, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
