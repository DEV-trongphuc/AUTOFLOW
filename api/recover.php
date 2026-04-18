<?php
// Tự động khôi phục cấu trúc dữ liệu status
require_once 'db_connect.php';

// Các Campaign chưa từng gửi và không có ngày lên lịch -> draft
$pdo->exec("UPDATE campaigns SET status = 'draft' WHERE status = 'completed' AND count_sent = 0 AND (scheduled_at IS NULL OR scheduled_at = '')");

// Các Campaign chưa từng gửi và có lịch tương lai -> scheduled
$pdo->exec("UPDATE campaigns SET status = 'scheduled' WHERE status = 'completed' AND count_sent = 0 AND scheduled_at > NOW()");

// Các Campaign đã gửi và đạt đủ số lượng -> sent
$pdo->exec("UPDATE campaigns SET status = 'sent' WHERE status = 'completed' AND sent_at IS NOT NULL AND count_sent >= total_target_audience AND total_target_audience > 0");

// Các Campaign đang gửi dở (hoặc gửi lố) -> paused để dừng an toàn, user có thể resume.
$pdo->exec("UPDATE campaigns SET status = 'paused' WHERE status = 'completed' AND sent_at IS NOT NULL AND (count_sent < total_target_audience OR count_sent >= total_target_audience)");

echo "<h2>ĐÃ KHÔI PHỤC TRẠNG THÁI GÓC CỦA CÁC CHIẾN DỊCH!</h2>";
?>
