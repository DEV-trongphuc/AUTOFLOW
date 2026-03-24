<?php
require_once '../api/db_connect.php';
$stmt = $pdo->query("SELECT * FROM ai_logs ORDER BY id DESC LIMIT 20");
$logs = $stmt->fetchAll(PDO::FETCH_ASSOC);
echo "<pre>";
print_r($logs);
echo "</pre>";
