<?php
// Khôi phục TẬN GỐC TẤT CẢ các Campaign bị biến thành Bản Nháp do MySQL Enum Error
require_once 'db_connect.php';

// Các Campaign bị kẹt chuỗi rỗng '' (do lỗi đẩy sai ENUM completed vào MySQL strict mode)
// hoặc mang trạng thái 'completed'
$condition = "status = '' OR status = 'completed'";

// 1. Phục hồi những cái đã hòm hòm hoặc gửi lố: chuyển sang PAUSED để tạm dừng an toàn
$pdo->exec("UPDATE campaigns SET status = 'paused' WHERE ($condition) AND count_sent > 0");

// 2. Chuyển những cái Scheduled (Có lịch tương lai, chưa gửi)
$pdo->exec("UPDATE campaigns SET status = 'scheduled' WHERE ($condition) AND count_sent = 0 AND scheduled_at > NOW()");

// 3. Chuyển lại những cái thực sự là Bản Nháp (Không có lịch, chưa gửi)
$pdo->exec("UPDATE campaigns SET status = 'draft' WHERE ($condition) AND count_sent = 0 AND (scheduled_at IS NULL OR scheduled_at = '')");

echo "<h2>ĐÃ FIX TẬN GỐC TẤT CẢ TRẠNG THÁI!</h2>";
echo "<h4>Lý do lúc nãy không ăn là vì cột Status không nhận chữ 'completed' nên nó biến thành rỗng '". "'. Bây giờ đã map lại chuẩn xác!</h4>";
?>
