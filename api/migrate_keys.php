<?php
require 'db_connect.php';

echo "<h1>Migrating Truncated Keys</h1>";

// Tìm các key bị cắt ở đúng 50 ký tự và có prefix analysis_history_
$stmt = $pdo->query("SELECT `key`, value FROM system_settings WHERE LENGTH(`key`) = 50 AND `key` LIKE 'analysis_history_%'");
$rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

if (count($rows) > 0) {
    foreach ($rows as $row) {
        $oldKey = $row['key'];
        $data = json_decode($row['value'], true);

        // Nếu trong dữ liệu có lưu page_id hoặc thông tin khác, ta có thể dùng nó để định danh
        // Nhưng cách nhanh nhất là xóa bản cũ bị lỗi và yêu cầu người dùng chạy mới 
        // Hoặc nếu ta biết Property ID hiện tại, ta map nó qua.

        echo "<p>Found truncated key: $oldKey</p>";
    }
    echo "<p>Vui lòng chạy lại Phân tích mới trong App để hệ thống tự tạo Key chuẩn 255 ký tự.</p>";
} else {
    echo "<p>Không tìm thấy key nào bị lỗi 50 ký tự. Có thể bạn đã chạy phân tích mới rồi.</p>";
}
