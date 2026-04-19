<?php
require_once 'db_connect.php';

$cid = $_GET['id'] ?? '69dc974be65bc';

echo "<h1>Kiểm tra Unsubscribe của Campaign ID: $cid</h1>";

// 1. Kiểm tra bảng hoạt động (Bao nhiêu người đã dứt khoát bấm nút Hủy ở Mail này)
$stmt = $pdo->prepare("SELECT subscriber_id, created_at FROM subscriber_activity WHERE campaign_id = ? AND type = 'unsubscribe'");
$stmt->execute([$cid]);
$activities = $stmt->fetchAll(PDO::FETCH_ASSOC);

echo "<h3>1. Bảng Activity (Ghi nhận Lịch sử bấm link):</h3>";
echo "Tổng cộng ghi nhận <b>" . count($activities) . "</b> lượt bấm Hủy (Có thể 1 người bấm 2 lần).<br>";
$subIds = array_unique(array_column($activities, 'subscriber_id'));
echo "Thực tế có <b>" . count($subIds) . "</b> ID Liên hệ khác nhau đã bấm.<br>";
echo "<pre>";
print_r($activities);
echo "</pre>";

if(empty($subIds)) exit;

// 2. Tình trạng hiện tại của 4 ID này trong database
echo "<h3>2. Tình trạng HIỆN TẠI của các ID này trong Database liên hệ:</h3>";
$placeholders = implode(',', array_fill(0, count($subIds), '?'));
$stmt2 = $pdo->prepare("SELECT id, email, status FROM subscribers WHERE id IN ($placeholders)");
$stmt2->execute($subIds);
$subs = $stmt2->fetchAll(PDO::FETCH_ASSOC);

// Mảng ID còn tồn tại
$existingIds = array_column($subs, 'id');
$deletedIds = array_diff($subIds, $existingIds);

echo "<table border='1' cellpadding='10'>";
echo "<tr><th>Subscriber ID</th><th>Email</th><th>Trạng thái HIỆN TẠI</th><th>Tại sao trước đây lọc không ra?</th></tr>";

foreach($subs as $sub) {
    $reason = "";
    if($sub['status'] !== 'unsubscribed') {
        $reason = "❌ Bị lọc trượt do Trạng thái hiện tại đã bị đổi thành '" . $sub['status'] . "' (Có ai đó import đè / sửa tay).";
    } else {
        $reason = "✅ Hợp lệ, trước đây vẫn lấy ra được.";
    }
    echo "<tr><td>{$sub['id']}</td><td>{$sub['email']}</td><td><b>{$sub['status']}</b></td><td style='color:#c00'>$reason</td></tr>";
}

foreach($deletedIds as $del) {
    echo "<tr><td>$del</td><td>Không xác định</td><td><b>ĐÃ BỊ XÓA</b></td><td style='color:#c00'>❌ Đã bị xóa hoàn toàn khỏi DB nên bảng Subscribers không còn ID này.</td></tr>";
}
echo "</table>";

echo "<h3>Kết luận:</h3>";
echo "Danh sách Lọc cũ chỉ tìm những ai CÓ TRẠNG THÁI HIỆN TẠI là <code>unsubscribed</code>. Nghĩa là những ng bị Xóa (Không còn ID) hoặc bị thay đổi trạng thái (Ví dụ từ Unsub sang Active) sẽ BỊ THIẾU.<br><br>";
echo "Trong file <code>api/campaigns.php</code> mới, mình đã đổi logic Lọc sang: <i>Tìm tất cả những ai đã từng bấm Hủy ở chiến dịch này ở Bảng Activity</i>, do đó kết quả Lọc sẽ KHỚP 100% với Báo Cáo Sức Khỏe (Lấy bảng Activity). Bạn hãy Upload API mới lên là chuẩn ngay!";
?>
