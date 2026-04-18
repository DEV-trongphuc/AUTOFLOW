<?php
// Tệp Dọn Dẹp và Đồng bộ lại Thống kê cho Campaign
require_once 'db_connect.php';

$cid = $_GET['id'] ?? '69e1b5ca64e94';

echo "<h2>ĐANG DỌN DẸP SỐ LIỆU CHO CHIẾN DỊCH: $cid</h2>";
echo "<hr>";

try {
    // 1. Lấy số liệu Unique gửi đi thực tế
    $stmt1 = $pdo->prepare("SELECT COUNT(DISTINCT subscriber_id) FROM subscriber_activity WHERE campaign_id = ? AND type IN ('receive_email', 'zalo_sent', 'zns_sent')");
    $stmt1->execute([$cid]);
    $realSent = $stmt1->fetchColumn();

    $stmt2 = $pdo->prepare("SELECT COUNT(DISTINCT subscriber_id) FROM subscriber_activity WHERE campaign_id = ? AND type = 'open_email'");
    $stmt2->execute([$cid]);
    $realOpen = $stmt2->fetchColumn();

    $stmt3 = $pdo->prepare("SELECT COUNT(DISTINCT subscriber_id) FROM subscriber_activity WHERE campaign_id = ? AND type = 'click_email'");
    $stmt3->execute([$cid]);
    $realClick = $stmt3->fetchColumn();

    // 2. Ép lại số liệu chuẩn xác 100% vào Database
    $statsJson = json_encode([
        'sent' => (int)$realSent,
        'opened' => (int)$realOpen,
        'clicked' => (int)$realClick
    ]);

    $updateStmt = $pdo->prepare("
        UPDATE campaigns 
        SET count_sent = ?, 
            stats = ?
        WHERE id = ?
    ");
    
    $updateStmt->execute([$realSent, $statsJson, $cid]);

    echo "<h3 style='color: green;'>✅ ĐÃ ĐỒNG BỘ THÀNH CÔNG!</h3>";
    echo "<ul>";
    echo "<li>Số lượng gửi (Sent): <b>$realSent</b></li>";
    echo "<li>Số lượt mở (Opened): <b>$realOpen</b></li>";
    echo "<li>Số lượt click (Clicked): <b>$realClick</b></li>";
    echo "</ul>";
    echo "<p>Bây giờ số liệu báo cáo Dashboard của chiến dịch này sẽ chính xác tuyệt đối và loại bỏ hoàn toàn các con số gửi đúp (ảo). Bạn có thể quay lại giao diện F5 để xem sự lột xác!</p>";

} catch (Exception $e) {
    echo "Lỗi: " . $e->getMessage();
}
?>
