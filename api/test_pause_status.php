<?php
/**
 * Xem lịch sử và trạng thái Pause AI của người dùng Meta
 * Cách dùng: truy cập http://localhost/api/test_pause_status.php?psid=UID_KHACH_HANG
 */
require_once 'db_connect.php';

$psid = $_GET['psid'] ?? null;
$clear = $_GET['clear'] ?? null;

if ($clear) {
    $pdo->query("UPDATE meta_subscribers SET ai_paused_until = NULL");
    echo "<h3>✅ ĐÃ XÓA TOÀN BỘ LỆNH PAUSE AI BỊ KẸT CHO TẤT CẢ KHÁCH HÀNG META!</h3>";
    echo "Bạn có thể test lại bằng nick Facebook cũ ngay bây giờ.<a href='?'>Bấm vào đây để tải lại</a><hr>";
}


echo "<pre>";
echo "<h2>DEBUG TRẠNG THÁI AI PAUSE CỦA KHÁCH HÀNG</h2>";
echo "Thời gian hiện tại của PHP: " . date('Y-m-d H:i:s') . "\n";

$stmtTime = $pdo->query("SELECT NOW() as db_now_time");
$dbTime = $stmtTime->fetchColumn();
echo "Thời gian hiện tại của DB:  " . $dbTime . "\n";
echo "Khớp múi giờ (Timezone)?     " . (date('Y-m-d H:i:s') === $dbTime ? "=> CHUẨN MÚI GIỜ" : "=> LỆCH MÚI GIỜ (CẢNH BÁO!)") . "\n";
echo "<hr>";

if (!$psid) {
    echo "Không truyền PSID. Đang lấy PSID có UID gửi tin nhắn gần nhất...\n";
    $stmtLatest = $pdo->query("SELECT psid FROM meta_subscribers ORDER BY last_active_at DESC LIMIT 1");
    $psid = $stmtLatest->fetchColumn();
    if (!$psid) {
        die("BẠN CẦN TRUYỀN PSID VÀO LINK hoặc chưa có user nào trong DB.");
    }
}

$stmt = $pdo->prepare("SELECT id, name, page_id, psid, ai_paused_until FROM meta_subscribers WHERE psid = ?");
$stmt->execute([$psid]);
$sub = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$sub) {
    die("Không tìm thấy Khách hàng nào có PSID = $psid trong DB!");
}

echo "<h3>1. TRẠNG THÁI AI (Bảng meta_subscribers)</h3>";
print_r($sub);

if (!empty($sub['ai_paused_until']) && strtotime($sub['ai_paused_until']) > time()) {
    echo "\n=> [KẾT LUẬN]: AI <b>ĐANG BỊ PAUSE</b> đối với khách hàng này. Sẽ mở lại lúc: " . $sub['ai_paused_until'] . "\n";
} else {
    echo "\n=> [KẾT LUẬN]: AI <b>ĐANG HOẠT ĐỘNG (KHÔNG BỊ PAUSE)</b> đối với khách hàng này.\n";
}

echo "<hr>";
echo "<h3>2. LỊCH SỬ TIN NHẮN (Bảng meta_message_logs)</h3>";
echo "Bảng này hiển thị webhook nhận được. Outbound (echo) chính là gửi từ Tư vấn viên hoặc AI.\n\n";

$stmt2 = $pdo->prepare("SELECT direction, content, created_at, status FROM meta_message_logs WHERE psid = ? ORDER BY created_at DESC LIMIT 15");
$stmt2->execute([$psid]);
while ($row = $stmt2->fetch(PDO::FETCH_ASSOC)) {
    print_r($row);
}
echo "</pre>";
