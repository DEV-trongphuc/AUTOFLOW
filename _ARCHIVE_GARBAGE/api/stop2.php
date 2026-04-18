<?php
// TẮT NGAY LẬP TỨC
require_once 'db_connect.php';
$pdo->exec("UPDATE campaigns SET status = 'completed'");
$pdo->exec("DELETE FROM subscriber_activity WHERE type = 'processing_campaign'");
echo "<h2>DA DUNG LAI TOAN BO!</h2>";
?>
