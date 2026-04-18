<?php
require_once 'db_connect.php';
$stmt = $pdo->query("SELECT id, page_count, is_bounce, started_at FROM web_sessions ORDER BY id DESC LIMIT 20");
echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC), JSON_PRETTY_PRINT);
?>