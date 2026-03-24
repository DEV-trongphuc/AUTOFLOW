<?php
// api/reset_daily_cap.php
require_once 'db_connect.php';

// Logic Reset Cap cho ngày hôm nay
// Thực chất là xóa các status 'failed' hoặc 'waiting' mà có lý do là CAP,
// hoặc đơn giản hơn: update lại scheduled_at = NOW() cho những đứa đang bị hoãn vì Cap.

echo "<h2>Reset Frequency Cap For Today</h2>";

$todayStart = date('Y-m-d 00:00:00');

// 1. Tìm những item đang bị Waiting với lý do Cap
// Chúng ta dựa vào field 'last_error' có chứa chữ "Frequency Cap"
$searchTerm = "%Frequency Cap%";
$stmt = $pdo->prepare("SELECT COUNT(*) FROM subscriber_flow_states WHERE status = 'waiting' AND last_error LIKE ?");
$stmt->execute([$searchTerm]);
$count = $stmt->fetchColumn();

echo "Found <strong>$count</strong> items waiting due to Frequency Cap.<br>";

if ($count > 0) {
    // 2. Reset chúng
    // - status: waiting (giữ nguyên để worker pick)
    // - scheduled_at: NOW() (để chạy ngay)
    // - last_error: NULL (xóa lỗi cũ)
    $stmtUpdate = $pdo->prepare("UPDATE subscriber_flow_states SET scheduled_at = NOW(), last_error = NULL, updated_at = NOW() WHERE status = 'waiting' AND last_error LIKE ?");
    $stmtUpdate->execute([$searchTerm]);

    echo "<h3 style='color:green'>Successfully reset $count items! They will run immediately.</h3>";

    // Trigger worker
    $ch = curl_init(API_BASE_URL . '/worker_flow.php');
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    curl_setopt($ch, CURLOPT_TIMEOUT, 1); // Fire and forget
    curl_exec($ch);
    curl_close($ch);
    echo "Worker triggered in background.";
} else {
    echo "No items need resetting.";
}

echo "<hr>";
echo "<h3>Logic Audit</h3>";
echo "When checking caps, we compare: <code>sent_count >= cap_limit</code><br>";
echo "- If TRUE: Update status to 'waiting', set <code>last_error</code> to 'Frequency Cap Reached...'<br>";
echo "- The Frontend (StepParticipantsModal) displays this error in an orange badge.<br>";
