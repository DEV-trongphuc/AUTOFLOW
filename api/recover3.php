<?php
// Fix Tận Góc ver 3
require_once 'db_connect.php';

$condition = "status = '' OR status = 'completed'";

// Bất cứ Campaign nào ĐÃ CÓ NGÀY GỬI THỰC TẾ (sent_at IS NOT NULL) thì chắc chắn là ĐÃ GỬI XONG (sent)
$pdo->exec("UPDATE campaigns SET status = 'sent' WHERE ($condition) AND sent_at IS NOT NULL");

// Những cái chưa có sent_at bám theo logicũ 
$pdo->exec("UPDATE campaigns SET status = 'scheduled' WHERE ($condition) AND sent_at IS NULL AND scheduled_at > NOW()");
$pdo->exec("UPDATE campaigns SET status = 'draft' WHERE ($condition) AND sent_at IS NULL AND (scheduled_at <= NOW() OR scheduled_at IS NULL OR scheduled_at = '')");

echo "<h2>ĐÃ FIX XONG MỌI THỨ! NHẤN F5 DASHBOARD</h2>";
?>
