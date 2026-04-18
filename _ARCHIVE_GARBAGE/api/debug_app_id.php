<?php
require_once 'db_connect.php';
header('Content-Type: text/plain');
$stmt = $pdo->query("SELECT * FROM meta_app_configs LIMIT 1");
$config = $stmt->fetch(PDO::FETCH_ASSOC);
print_r($config);
