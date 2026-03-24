<?php
require_once 'db_connect.php';
$stmt = $pdo->query("SELECT * FROM web_daily_stats WHERE date = CURDATE() AND url_hash != 'GLOBAL' LIMIT 10");
$rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
echo json_encode($rows, JSON_PRETTY_PRINT);
?>