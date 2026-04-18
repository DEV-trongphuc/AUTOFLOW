<?php
require_once 'db_connect.php';

try {
    // 1. Reset các case đang chạy (Waiting) lâu hoặc đã lỡ Click
    $stmt1 = $pdo->query("
        UPDATE subscriber_flow_states 
        SET scheduled_at = NOW(), status = 'waiting' 
        WHERE status IN ('waiting', 'processing') 
        AND scheduled_at > NOW()
    ");
    $count = $stmt1->rowCount();

    echo "Đã giải cứu và ép kiểm tra lại cho $count trường hợp. \n";

} catch (Exception $e) {
    echo "Lỗi: " . $e->getMessage();
}
?>